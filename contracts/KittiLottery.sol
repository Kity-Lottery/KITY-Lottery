// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

/**
 * @title  KittiLottery v3 — KITY
 * @notice Positional Pick-4 lottery on Base, powered by Pyth Entropy randomness.
 *
 *  Game model
 *  ──────────
 *  • 4 balls, each a digit 0–9 (repeats allowed: 7-7-1-4 is valid).
 *  • 1 KITY letter: 0 = K, 1 = I, 2 = T, 3 = Y.
 *  • Win by POSITION — picked[i] must equal winning[i].
 *  • Jackpot  = 4 digits + KITY match  →  1 in 40,000
 *  • 2nd prize = 4 digits match         →  1 in 10,000
 *  • 3rd prize = exactly 3 digits match →  1 in 278
 *
 *  Draw mechanics
 *  ──────────────
 *  • A round draws at whichever comes first: its 24-hour timer, or 15 min
 *    after it fills to MAX_TICKETS_PER_ROUND (filling shortens endTime).
 *  • Anyone (typically a cron/keeper polling drawDue()) calls triggerDraw()
 *    once block.timestamp ≥ endTime. It requests randomness from Pyth Entropy
 *    (paying a small native-ETH fee from the contract's ETH float) and opens
 *    the next round immediately.
 *  • Runs with ≥ 1 ticket; extends by 24 h if zero tickets.
 *
 *  Randomness + settlement (decoupled — Pyth callbacks are gas-limited)
 *  ───────────────────────────────────────────────────────────────────
 *  • entropyCallback() does O(1) work only: stores the random word, derives
 *    the winning numbers + lucky ticket, and marks the round Drawn.
 *  • settle(maxTickets) is permissionless and BATCHED: it scans the round's
 *    tickets (in chunks) to count winners per tier, then finalises the round
 *    (computes prize pots, accrues the fee, credits the lucky wallet, rolls
 *    un-won buckets forward). This keeps the unbounded O(n) work out of the
 *    gas-limited randomness callback.
 *  • Tier winners pull their prize with claimPrize(roundId, ticketIdx); the
 *    credited USDC is then withdrawn with withdraw(). The lucky-wallet prize
 *    is credited automatically at finalisation (no claim needed).
 *
 *  Prize model
 *  ───────────
 *  • 50 % Jackpot · 15 % 2nd · 10 % 3rd · 10 % Lucky Wallet ·
 *    5 % Platform fee · 10 % rolls to the next round.
 *  • Un-won tier buckets also roll to the next round (compounding jackpot).
 *  • Unclaimed credits may be swept by the owner after UNCLAIMED_EXPIRY
 *    (30 days) — withdraw before then.
 */
contract KittiLottery is IEntropyConsumer, Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Types ─────────────────────────────────────────────────────────────────

    // Open       → accepting tickets (the current open round)
    // Drawing    → randomness requested from Pyth, awaiting entropyCallback
    // Drawn      → randomness received & winning numbers stored; awaiting settle()
    // Settled    → counting done, pots finalised, claims open
    enum RoundStatus { Open, Drawing, Drawn, Settled }

    struct Ticket {
        address  buyer;
        uint8[4] mainNumbers;  // digits 0–9, repeats allowed
        uint8    kittiNumber;  // 0 = K, 1 = I, 2 = T, 3 = Y
    }

    struct Round {
        uint256     startTicket;     // first global ticket index in this round
        uint256     ticketCount;
        uint256     endTime;         // draw may be triggered once block.timestamp >= endTime
        uint256     drawRequestedAt; // timestamp triggerDraw() fired (for randomness timeout)
        uint8[4]    winningMain;
        uint8       winningKitti;
        uint256     luckyTicket;     // global index of the lucky-wallet ticket
        RoundStatus status;
        uint256     settledAt;
        uint256     pool;            // total pool (ticket revenue + rolled-in amount)
        uint256     rolledToNext;    // amount forwarded to the next round
        uint64      entropySeq;      // Pyth Entropy sequence number for this round's request
        uint256     randomWord;      // randomness delivered by Pyth
        uint256     scanCursor;      // settle() progress within [0, ticketCount)
        uint256     jWin;            // jackpot winners counted so far
        uint256     p2Win;           // 2nd-prize winners counted so far
        uint256     p3Win;           // 3rd-prize winners counted so far
        uint256     jpp;             // finalised jackpot per-winner amount
        uint256     p2pp;            // finalised 2nd-prize per-winner amount
        uint256     p3pp;            // finalised 3rd-prize per-winner amount
    }

    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant TICKET_PRICE     = 2e6;      // $2 USDC (6 decimals)
    uint256 public constant ROUND_DURATION   = 24 hours;
    uint256 public constant DRAW_TIMEOUT      = 48 hours; // randomness no-show → emergencyExpire
    uint256 public constant UNCLAIMED_EXPIRY  = 30 days;
    uint256 public constant BPS               = 10_000;

    uint256 public constant FEE_BPS     = 500;   // 5 %
    uint256 public constant JACKPOT_BPS = 5_000; // 50 %
    uint256 public constant PRIZE2_BPS  = 1_500; // 15 %
    uint256 public constant PRIZE3_BPS  = 1_000; // 10 %
    uint256 public constant LUCKY_BPS   = 1_000; // 10 %
    // Remaining 10 % always rolls to the next round.

    uint8 public constant MAIN_RANGE  = 10; // digits 0–9
    uint8 public constant KITTI_RANGE = 4;  // 0 = K, 1 = I, 2 = T, 3 = Y

    // Caps tickets per round. Settlement is now batched (settle() is paginated and
    // off the gas-limited randomness callback), so this is a round-scope choice
    // rather than a hard gas constraint — raise it once benchmarked if desired.
    uint256 public constant MAX_TICKETS_PER_ROUND = 1000;

    // A round draws at whichever comes first: its 24h timer, or this delay after
    // it fills to MAX_TICKETS_PER_ROUND. Filling shortens endTime to now + this.
    uint256 public constant FULL_DRAW_DELAY = 15 minutes;

    // Gas forwarded to entropyCallback. The callback is O(1) (store randomness +
    // derive winning numbers), so this is generous headroom; the heavy winner
    // counting lives in settle(), not here. Pyth rounds up to the nearest 10k and
    // the request fee scales with this value.
    uint32 public constant CALLBACK_GAS_LIMIT = 300_000;

    // ── State ─────────────────────────────────────────────────────────────────

    IERC20     public immutable usdc;
    IEntropyV2 public immutable entropy; // Pyth Entropy (Base mainnet: 0x6E7D74FA7d5c90FEF9F0512987605a6d546181Bb)
    address    public feeRecipient;

    uint256 public currentRound;       // the open round accepting tickets
    uint256 public nextRoundToSettle;  // oldest un-settled round (enforces rollover order)
    uint256 public totalTickets;
    uint256 public nextRoundPool;      // rolled prize money waiting for the next round

    mapping(uint256 => Round)   public rounds;
    mapping(uint256 => Ticket)  public tickets;        // global index → ticket
    mapping(address => uint256) public credits;        // prize credits (pull model)
    mapping(address => uint256) public lastCreditedAt; // timestamp of most recent credit
    mapping(uint64  => uint256) public seqToRound;     // Pyth sequence number → roundId
    mapping(uint256 => mapping(uint256 => bool)) public prizeClaimed; // roundId → ticketIdx → claimed

    uint256 public protocolFees; // accumulated platform fees, swept by owner

    // ── Events ────────────────────────────────────────────────────────────────

    event TicketBought(uint256 indexed roundId, uint256 indexed ticketIdx, address indexed buyer);
    event DrawTriggered(uint256 indexed roundId, uint64 entropySeq, uint256 endTime);
    event DrawReady(uint256 indexed roundId, uint8[4] winMain, uint8 winKitti, uint256 luckyTicket);
    event RoundSettleProgress(uint256 indexed roundId, uint256 cursor, uint256 ticketCount);
    event DrawSettled(uint256 indexed roundId, uint8[4] winMain, uint8 winKitti, uint256 luckyTicket, uint256 rolledToNext);
    event PrizeAwarded(uint256 indexed roundId, address indexed winner, uint8 tier, uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);
    event UnclaimedSwept(address indexed wallet, uint256 amount);
    event RoundExtended(uint256 indexed roundId, uint256 newEndTime);
    event RoundExpired(uint256 indexed roundId, uint256 poolRolled);
    event RoundFilled(uint256 indexed roundId, uint256 drawAt);
    event EthFunded(address indexed from, uint256 amount);
    event EthWithdrawn(address indexed to, uint256 amount);

    // ── Errors ────────────────────────────────────────────────────────────────

    error BadNumbers();
    error RoundNotOpen();
    error RoundFull();
    error DrawNotDue();
    error NothingToWithdraw();
    error DrawNotTimedOut();
    error RoundNotDrawing();
    error RoundNotDrawn();
    error RoundNotSettled();
    error WrongRound();
    error NoPrize();
    error AlreadyClaimed();
    error SettleOutOfOrder();
    error InsufficientEntropyFee();
    error ZeroAddress();
    error ZeroAmount();
    error EthTransferFailed();

    // ── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param _usdc          USDC token address (6 decimals).
     * @param _feeRecipient  Address that receives the 5 % platform fee.
     * @param _entropy       Pyth Entropy contract for this chain.
     *                       Base mainnet: 0x6E7D74FA7d5c90FEF9F0512987605a6d546181Bb
     *                       (verify at docs.pyth.network/entropy/contract-addresses).
     *                       For local tests: pass a MockEntropy address.
     * @param _owner         Initial contract owner. Pass your Safe multisig here so
     *                       ownership is the Safe from the very first transaction —
     *                       the deploying EOA never holds ownership, so no
     *                       transferOwnership step is needed.
     */
    constructor(
        address _usdc,
        address _feeRecipient,
        address _entropy,
        address _owner
    )
        Ownable(_owner)
    {
        if (_usdc == address(0) || _feeRecipient == address(0) || _entropy == address(0)) {
            revert ZeroAddress();
        }
        usdc         = IERC20(_usdc);
        entropy      = IEntropyV2(_entropy);
        feeRecipient = _feeRecipient;
        _openRound(block.timestamp + ROUND_DURATION);
    }

    // ── ETH float (pays Pyth Entropy request fees) ─────────────────────────────

    /// @notice Fund the contract's ETH float used to pay Pyth Entropy request fees.
    receive() external payable {
        emit EthFunded(msg.sender, msg.value);
    }

    /// @notice Withdraw surplus ETH float. Only touches native ETH, never USDC/credits.
    function withdrawEth(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
        emit EthWithdrawn(to, amount);
    }

    /// @notice Current Pyth Entropy fee for a draw (native ETH). Read before topping up the float.
    function entropyFee() public view returns (uint256) {
        return entropy.getFeeV2(entropy.getDefaultProvider(), CALLBACK_GAS_LIMIT);
    }

    // ── Ticket purchase ───────────────────────────────────────────────────────

    /**
     * @notice Buy one or more tickets for the current open round.
     * @param mainNums  Array of [4-digit arrays], each digit 0–9 (repeats ok).
     * @param kittiNums Array of Kitti indices (0–3), one per ticket.
     */
    function buyTickets(
        uint8[4][] calldata mainNums,
        uint8[]    calldata kittiNums
    ) external whenNotPaused nonReentrant {
        uint256 qty = mainNums.length;
        require(qty > 0 && qty == kittiNums.length, "Bad input");

        Round storage r = rounds[currentRound];
        if (r.status != RoundStatus.Open) revert RoundNotOpen();
        if (r.ticketCount + qty > MAX_TICKETS_PER_ROUND) revert RoundFull();

        for (uint256 i = 0; i < qty; i++) {
            _validateNumbers(mainNums[i], kittiNums[i]);
        }

        _pullExact(msg.sender, TICKET_PRICE * qty);

        uint256 base = totalTickets;
        for (uint256 i = 0; i < qty; i++) {
            uint256 idx = base + i;
            tickets[idx] = Ticket({
                buyer:       msg.sender,
                mainNumbers: mainNums[i],
                kittiNumber: kittiNums[i]
            });
            emit TicketBought(currentRound, idx, msg.sender);
        }

        r.ticketCount += qty;
        totalTickets  += qty;

        // Round full → draw 15 min from now, unless the 24h timer is already
        // sooner. Implements "24h OR MAX_TICKETS_PER_ROUND, whichever is earlier".
        if (r.ticketCount >= MAX_TICKETS_PER_ROUND) {
            uint256 fastDraw = block.timestamp + FULL_DRAW_DELAY;
            if (fastDraw < r.endTime) {
                r.endTime = fastDraw;
                emit RoundFilled(currentRound, fastDraw);
            }
        }
    }

    // ── Draw trigger ───────────────────────────────────────────────────────────

    /**
     * @notice Trigger the draw for the current round. Callable by anyone once
     *         block.timestamp >= round endTime. Requests randomness from Pyth
     *         Entropy and opens the next round immediately. If no tickets were
     *         sold, extends the round by ROUND_DURATION instead.
     * @dev    Payable so a keeper may top up the ETH float in the same call; the
     *         Entropy fee is paid from the contract's ETH balance.
     */
    function triggerDraw() external payable whenNotPaused {
        Round storage r = rounds[currentRound];
        if (r.status != RoundStatus.Open) revert RoundNotOpen();
        if (block.timestamp < r.endTime)  revert DrawNotDue();

        if (r.ticketCount == 0) {
            r.endTime += ROUND_DURATION;
            emit RoundExtended(currentRound, r.endTime);
            return;
        }

        uint256 rid         = currentRound;
        uint256 nextEndTime = r.endTime + ROUND_DURATION;

        // Request randomness from Pyth Entropy (trust-minimised variant with an
        // on-chain userRandomNumber, paying the fee from the ETH float).
        address provider = entropy.getDefaultProvider();
        uint256 fee      = entropy.getFeeV2(provider, CALLBACK_GAS_LIMIT);
        if (address(this).balance < fee) revert InsufficientEntropyFee();

        bytes32 userRandom = keccak256(
            abi.encodePacked(blockhash(block.number - 1), block.prevrandao, address(this), rid, totalTickets)
        );
        uint64 seq = entropy.requestV2{value: fee}(provider, userRandom, CALLBACK_GAS_LIMIT);

        seqToRound[seq]    = rid;
        r.entropySeq       = seq;
        r.drawRequestedAt  = block.timestamp;
        r.status           = RoundStatus.Drawing;

        emit DrawTriggered(rid, seq, r.endTime);

        currentRound++;
        _openRound(nextEndTime);
    }

    // ── Pyth Entropy callback (O(1) — heavy work is in settle()) ────────────────

    /// @dev Only reachable via IEntropyConsumer._entropyCallback, which enforces
    ///      msg.sender == getEntropy() (the Pyth Entropy contract).
    function entropyCallback(
        uint64  sequenceNumber,
        address /* provider */,
        bytes32 randomNumber
    ) internal override {
        uint256 rid = seqToRound[sequenceNumber];
        Round storage r = rounds[rid];

        // Idempotency / stale-response guard: only a Drawing round transitions.
        // Blocks double-fulfilment and any late response after emergencyExpire.
        if (r.status != RoundStatus.Drawing) return;

        uint256 randomness = uint256(randomNumber);
        r.randomWord = randomness;

        (uint8[4] memory winMain, uint8 winKitti) = _deriveNumbers(randomness);
        r.winningMain  = winMain;
        r.winningKitti = winKitti;

        // Lucky wallet: one random ticket buyer always wins 10 %.
        uint256 luckyOffset = uint256(keccak256(abi.encode(randomness, "lucky"))) % r.ticketCount;
        r.luckyTicket = r.startTicket + luckyOffset;

        r.status = RoundStatus.Drawn;
        emit DrawReady(rid, winMain, winKitti, r.luckyTicket);
    }

    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    // ── Settlement (permissionless, batched) ────────────────────────────────────

    /**
     * @notice Count winners for the oldest Drawn round, in batches of up to
     *         `maxTickets` tickets. When the final ticket is scanned the round is
     *         finalised (pots computed, fee accrued, lucky wallet credited,
     *         un-won buckets rolled forward) and claims open. Permissionless.
     * @param  maxTickets Max tickets to scan this call (use a value >= the round
     *         size, e.g. MAX_TICKETS_PER_ROUND, to settle in a single call).
     */
    function settle(uint256 maxTickets) external whenNotPaused {
        if (maxTickets == 0) revert ZeroAmount();

        uint256 rid = nextRoundToSettle;
        Round storage r = rounds[rid];
        if (r.status != RoundStatus.Drawn) revert RoundNotDrawn();

        uint256 start  = r.startTicket;
        uint256 total  = r.ticketCount;
        uint256 cursor = r.scanCursor;

        uint256 endIdx = cursor + maxTickets;
        if (endIdx > total) endIdx = total;

        uint8[4] memory winMain  = r.winningMain;
        uint8    winKitti        = r.winningKitti;

        uint256 jW; uint256 p2W; uint256 p3W;
        for (uint256 i = cursor; i < endIdx; i++) {
            Ticket storage t = tickets[start + i];
            uint8 tier = _checkMatch(t.mainNumbers, t.kittiNumber, winMain, winKitti);
            if      (tier == 1) jW++;
            else if (tier == 2) p2W++;
            else if (tier == 3) p3W++;
        }

        r.jWin += jW;
        r.p2Win += p2W;
        r.p3Win += p3W;
        r.scanCursor = endIdx;

        if (endIdx == total) {
            _finalize(rid, r);
        } else {
            emit RoundSettleProgress(rid, endIdx, total);
        }
    }

    function _finalize(uint256 rid, Round storage r) internal {
        uint256 pool   = TICKET_PRICE * r.ticketCount + nextRoundPool;
        nextRoundPool  = 0;
        r.pool         = pool;

        uint256 fee     = (pool * FEE_BPS)     / BPS;
        uint256 jackpot = (pool * JACKPOT_BPS) / BPS;
        uint256 prize2  = (pool * PRIZE2_BPS)  / BPS;
        uint256 prize3  = (pool * PRIZE3_BPS)  / BPS;
        uint256 lucky   = (pool * LUCKY_BPS)   / BPS;
        uint256 roll    = pool - fee - jackpot - prize2 - prize3 - lucky; // ~10 %

        protocolFees += fee;

        // No-winner tiers also roll to next round (compounding jackpot).
        if (r.jWin  == 0) { roll += jackpot; jackpot = 0; }
        if (r.p2Win == 0) { roll += prize2;  prize2  = 0; }
        if (r.p3Win == 0) { roll += prize3;  prize3  = 0; }

        nextRoundPool  += roll;
        r.rolledToNext  = roll;

        // Per-winner amounts — winners pull these via claimPrize().
        r.jpp  = r.jWin  > 0 ? jackpot / r.jWin  : 0;
        r.p2pp = r.p2Win > 0 ? prize2  / r.p2Win : 0;
        r.p3pp = r.p3Win > 0 ? prize3  / r.p3Win : 0;

        // Lucky wallet is credited immediately (O(1), no claim needed).
        address luckyBuyer = tickets[r.luckyTicket].buyer;
        credits[luckyBuyer] += lucky;
        lastCreditedAt[luckyBuyer] = block.timestamp;
        emit PrizeAwarded(rid, luckyBuyer, 0, lucky);

        r.settledAt = block.timestamp;
        r.status    = RoundStatus.Settled;
        nextRoundToSettle = rid + 1;

        emit DrawSettled(rid, r.winningMain, r.winningKitti, r.luckyTicket, roll);
    }

    /**
     * @notice Claim a tier prize for a winning ticket in a settled round. Credits
     *         the ticket's buyer; they then withdraw() the USDC. Anyone may call
     *         it (funds always go to the ticket buyer). Lucky-wallet prizes are
     *         credited automatically at settlement and need no claim.
     */
    function claimPrize(uint256 roundId, uint256 ticketIdx) external nonReentrant {
        Round storage r = rounds[roundId];
        if (r.status != RoundStatus.Settled) revert RoundNotSettled();
        if (ticketIdx < r.startTicket || ticketIdx >= r.startTicket + r.ticketCount) revert WrongRound();
        if (prizeClaimed[roundId][ticketIdx]) revert AlreadyClaimed();

        Ticket storage t = tickets[ticketIdx];
        uint8 tier = _checkMatch(t.mainNumbers, t.kittiNumber, r.winningMain, r.winningKitti);
        if (tier == 0) revert NoPrize();

        uint256 amount = tier == 1 ? r.jpp : tier == 2 ? r.p2pp : r.p3pp;
        if (amount == 0) revert NoPrize();

        prizeClaimed[roundId][ticketIdx] = true;
        address buyer = t.buyer;
        credits[buyer] += amount;
        lastCreditedAt[buyer] = block.timestamp;

        emit PrizeAwarded(roundId, buyer, tier, amount);
    }

    // ── Emergency expire ────────────────────────────────────────────────────────

    /**
     * @notice If Pyth Entropy has not delivered randomness within DRAW_TIMEOUT
     *         (48 h) of the draw being triggered, the owner may expire the round.
     *         All ticket revenue rolls into the next round's pool — no numbers are
     *         drawn, no prizes paid. The owner cannot pick winning numbers; this
     *         only rescues stuck funds. Must target the oldest un-settled round to
     *         keep the rollover accounting in order.
     */
    function emergencyExpire(uint256 roundId) external onlyOwner {
        Round storage r = rounds[roundId];
        if (r.status != RoundStatus.Drawing)                  revert RoundNotDrawing();
        if (block.timestamp < r.drawRequestedAt + DRAW_TIMEOUT) revert DrawNotTimedOut();
        if (roundId != nextRoundToSettle)                     revert SettleOutOfOrder();

        uint256 poolRolled = TICKET_PRICE * r.ticketCount + nextRoundPool;
        nextRoundPool = poolRolled;

        r.status    = RoundStatus.Settled;
        r.settledAt = block.timestamp;
        nextRoundToSettle = roundId + 1;

        emit RoundExpired(roundId, poolRolled);
    }

    // ── Withdraw credits ────────────────────────────────────────────────────────

    /**
     * @notice Withdraw all prize credits accumulated across rounds. Withdraw
     *         within UNCLAIMED_EXPIRY (30 days) of your latest credit — after
     *         that the owner may reclaim unclaimed credits via sweepUnclaimed().
     */
    function withdraw() external nonReentrant {
        uint256 amount = credits[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        credits[msg.sender] = 0;
        lastCreditedAt[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // ── Protocol fee sweep ──────────────────────────────────────────────────────

    function sweepFees() external onlyOwner nonReentrant {
        uint256 amount = protocolFees;
        protocolFees   = 0;
        usdc.safeTransfer(feeRecipient, amount);
    }

    /**
     * @notice Sweep prize credits that have gone unclaimed for > UNCLAIMED_EXPIRY (30 days).
     *         Swept funds transfer to feeRecipient. Callable by owner only.
     * @param wallets Addresses to check and sweep.
     */
    function sweepUnclaimed(address[] calldata wallets) external onlyOwner nonReentrant {
        for (uint256 i = 0; i < wallets.length; i++) {
            address w = wallets[i];
            uint256 c = credits[w];
            if (c == 0) continue;
            uint256 ts = lastCreditedAt[w];
            if (ts == 0 || block.timestamp < ts + UNCLAIMED_EXPIRY) continue;
            credits[w] = 0;
            lastCreditedAt[w] = 0;
            usdc.safeTransfer(feeRecipient, c);
            emit UnclaimedSwept(w, c);
        }
    }

    // ── Internal helpers ────────────────────────────────────────────────────────

    function _openRound(uint256 endTime) internal {
        rounds[currentRound].startTicket = totalTickets;
        rounds[currentRound].endTime     = endTime;
        rounds[currentRound].status      = RoundStatus.Open;
    }

    function _validateNumbers(uint8[4] calldata main, uint8 kitti) internal pure {
        if (kitti >= KITTI_RANGE) revert BadNumbers();
        for (uint8 i = 0; i < 4; i++) {
            if (main[i] >= MAIN_RANGE) revert BadNumbers();
        }
        // Repeats are valid — 7-7-1-4 is a legal ticket.
    }

    /**
     * @dev Each digit is derived independently from the random word so repeats
     *      are possible in the winning numbers — matching the player experience.
     *      KITY letter: 0=K, 1=I, 2=T, 3=Y (uniform).
     */
    function _deriveNumbers(uint256 word) internal pure
        returns (uint8[4] memory main, uint8 kitti)
    {
        for (uint8 i = 0; i < 4; i++) {
            main[i] = uint8(uint256(keccak256(abi.encode(word, uint256(i)))) % MAIN_RANGE);
        }
        kitti = uint8(uint256(keccak256(abi.encode(word, uint256(99)))) % KITTI_RANGE);
    }

    /**
     * @dev Positional match: picked[i] == winning[i] for each slot.
     *      Returns 1 = Jackpot, 2 = 2nd, 3 = 3rd, 0 = no prize.
     */
    function _checkMatch(
        uint8[4] memory picked,  uint8 pickedKitti,
        uint8[4] memory winning, uint8 winKitti
    ) internal pure returns (uint8 tier) {
        uint8 m;
        for (uint8 i = 0; i < 4; i++) {
            if (picked[i] == winning[i]) m++;
        }
        if (m == 4 && pickedKitti == winKitti) return 1;
        if (m == 4)                             return 2;
        if (m == 3)                             return 3;
        return 0;
    }

    /// @dev Rejects fee-on-transfer tokens.
    function _pullExact(address from, uint256 amount) internal {
        uint256 before = usdc.balanceOf(address(this));
        usdc.safeTransferFrom(from, address(this), amount);
        require(usdc.balanceOf(address(this)) - before == amount, "FOT");
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setFeeRecipient(address r) external onlyOwner {
        if (r == address(0)) revert ZeroAddress();
        feeRecipient = r;
    }
    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    /**
     * @notice True when triggerDraw() would draw the current round — it is Open,
     *         has ≥ 1 ticket, and its endTime has passed. Use as the keeper
     *         resolver for triggering draws.
     */
    function drawDue() external view returns (bool) {
        Round storage r = rounds[currentRound];
        return r.status == RoundStatus.Open
            && r.ticketCount > 0
            && block.timestamp >= r.endTime;
    }

    /**
     * @notice True when settle() has work to do — the oldest un-settled round has
     *         received randomness (Drawn) but is not yet fully counted. Use as the
     *         keeper resolver for settlement.
     */
    function settleDue() external view returns (bool) {
        return rounds[nextRoundToSettle].status == RoundStatus.Drawn;
    }

    function getTicket(uint256 idx) external view returns (Ticket memory) {
        return tickets[idx];
    }

    /**
     * @notice Returns the prize tier for a settled ticket (0 = no match).
     */
    function checkTicket(uint256 roundId, uint256 ticketIdx) external view
        returns (uint8 tier)
    {
        Round storage r = rounds[roundId];
        if (r.status != RoundStatus.Settled) return 0;
        Ticket storage t = tickets[ticketIdx];
        return _checkMatch(t.mainNumbers, t.kittiNumber, r.winningMain, r.winningKitti);
    }

    function isLuckyWallet(uint256 roundId, address wallet) external view returns (bool) {
        return tickets[rounds[roundId].luckyTicket].buyer == wallet;
    }
}
