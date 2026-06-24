# KITY — On-Chain Lottery on Base

> Pick 4 digits + a KITY letter. A draw fires every 24 hours — even with one ticket in. Randomness is verifiable on-chain via Pyth Entropy. No custodian, no operator can front-run the draw or withhold prizes.

KITY is a **positional Pick-4 lottery** deployed on Base L2. The smart contract holds the prize pool, the draw is resolved by **Pyth Entropy** verifiable randomness, and winners pull their USDC straight from the contract.

**Live on Base mainnet:** [`0x7AB998E1f73229f0Cf016e8811e9a88eFE8Ee0c5`](https://basescan.org/address/0x7AB998E1f73229f0Cf016e8811e9a88eFE8Ee0c5)

---

## How it works

1. **Pick your numbers** — choose a digit 0–9 for each of four balls, then one KITY letter (K, I, T, or Y). Position matters; repeats are allowed. Cost: $2 USDC per ticket.
2. **Draw triggers** — each round draws at whichever comes first: its **24-hour timer**, or **15 minutes after it fills to 1,000 tickets** (`MAX_TICKETS_PER_ROUND`). When due, `triggerDraw()` can be called by anyone (a keeper polls `drawDue()`); it requests randomness from Pyth Entropy and opens the next round. The draw fires even with a single ticket in.
3. **Randomness arrives** — Pyth Entropy delivers a verifiable random number to `entropyCallback()`, which stores the winning combo (O(1) — no heavy work in the callback). Each digit is derived deterministically from the seed (`keccak256(seed, i) % 10`), re-playable from the emitted `DrawReady` event.
4. **Settlement** — anyone calls `settle()` (a keeper polls `settleDue()`); it counts winners per tier in gas-safe batches and finalises the pots. The **Lucky Wallet** prize is credited automatically.
5. **Claim & withdraw** — Jackpot / 2nd / 3rd winners call `claimPrize(roundId, ticketIdx)` to credit their prize, then `withdraw()` to receive USDC. Lucky Wallet winners just `withdraw()`.

### Odds (per ticket)

| Tier | Match | Odds |
|---|---|---|
| 🏆 Jackpot | All 4 digits in position + KITY letter | 1 in 40,000 |
| 🥈 2nd Prize | All 4 digits in position | 1 in 10,000 |
| 🥉 3rd Prize | Any 3 of 4 digits in position | 1 in 278 |
| 🍀 Lucky Wallet | One random ticket wins | 1 per draw |

### Prize split (per round)

| Bucket | % of pool |
|---|---|
| Jackpot | 50% |
| 2nd Prize | 15% |
| 3rd Prize | 10% |
| Lucky Wallet | 10% |
| Platform fee | 5% |
| Rollover (seeds next draw) | 10% |

If no ticket matches a tier, that prize bucket also rolls forward into the next round — a compounding jackpot.

---

## Randomness & settlement design

Pyth Entropy callbacks are **gas-limited**, so the winner-counting loop (up to 1,000 tickets) is decoupled from the randomness callback:

- `triggerDraw()` → requests randomness, opens the next round. No looping.
- `entropyCallback()` → O(1): stores the random word + winning numbers, marks the round **Drawn**. Pays nothing here.
- `settle(maxTickets)` → permissionless, **batched** winner counting; finalises pots when the last ticket is scanned.
- `claimPrize()` → pull-based tier payout (gas-safe regardless of winner count).

The Pyth Entropy request fee (~0.00001 ETH/draw) is paid from a small **ETH float** held by the contract. Fund it by sending ETH to the contract address; read the live fee with `entropyFee()`.

---

## Repository layout

```
contracts/
  KittiLottery.sol       — main lottery contract (Pyth Entropy, rolling jackpot)
  mocks/                 — MockERC20 (test USDC) + Pyth MockEntropy (tests only)
scripts/
  deploy.js              — hardhat deploy for Base / Base Sepolia
  keeper.js              — keeper: settles drawn rounds + triggers due draws
test/
  KittiLottery.test.js   — 63-case test suite
.github/workflows/
  keeper.yml             — runs the keeper every 10 min (free on public repos)
web/                     — Next.js 14 dApp (wagmi v2 + viem, Tailwind, Framer Motion)
```

---

## Quickstart

```bash
npm install
npm test        # 63 tests — round lifecycle, randomness, settle, claim, fees, re-entrancy
npm run build   # compile
```

### Deploy to Base mainnet

```bash
cp .env.example .env
# Set CONTRACT_OWNER and FEE_RECIPIENT to your Safe — the script refuses to deploy
# to base without them. The deployer EOA never owns the contract. The Pyth Entropy
# address is hardcoded per network (no operator/account to register).
npm run deploy:base
# Uses canonical USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

### Post-deploy checklist

The deploy script prints these with addresses filled in:

1. **Verify on Sourcify/Basescan** (constructor args are positional — `usdc, feeRecipient, entropy, owner`):
   ```bash
   npx hardhat verify --network base <LOTTERY> <USDC> <FEE_RECIPIENT> <ENTROPY> <CONTRACT_OWNER>
   ```
2. **Fund the ETH float** — send ~0.01 ETH on Base to the contract (≈1,000 draws of Pyth fees). `triggerDraw()` reverts with `InsufficientEntropyFee` if it can't pay.
3. **Run the keeper** — set `KEEPER_PRIVATE_KEY` (a funded keeper EOA, gas-only — **not** the owner key) as a GitHub Actions secret. The included workflow calls `triggerDraw()`/`settle()` every 10 minutes. No third-party automation service required.
4. **Confirm Safe ownership** — `await lottery.owner()` → your Safe (set at construction, no transfer step).

> **No randomness service to register.** Unlike LINK/VRF or Gelato, Pyth Entropy needs no dashboard, account, or task — the contract calls `requestV2()` and Pyth's keeper auto-fulfills.

---

## Frontend (web/)

```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev
```

### Environment variables

```env
NEXT_PUBLIC_LOTTERY_ADDRESS=0x...   # deployed KittiLottery (mainnet default baked into lib/contracts.ts)
NEXT_PUBLIC_TOKEN_ADDRESS=0x...     # USDC (or MockERC20 on testnet)
NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453   # 8453 = Base mainnet, 84532 = Base Sepolia

# Optional — WalletConnect (MetaMask + Coinbase Wallet work without this)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=   # from cloud.walletconnect.com
```

### Stack

- **Next.js 14** (App Router, TypeScript)
- **wagmi v2 + viem** — wallet connection, contract reads/writes
- **Framer Motion** — animations · **Tailwind CSS** — styling
- **Connectors:** MetaMask / Rabby (injected), Coinbase Wallet + Smart Wallet, WalletConnect (optional)

---

## Contract API

| Function | Callable by | Description |
|---|---|---|
| `buyTickets(main[][], kitti[])` | anyone | Buy one or more tickets in the current round |
| `triggerDraw()` | anyone (after `endTime`) | Request Pyth Entropy randomness; opens the next round |
| `settle(maxTickets)` | anyone | Count winners for the oldest drawn round, in batches; finalises when done |
| `claimPrize(roundId, ticketIdx)` | anyone | Credit a winning ticket's tier prize to its buyer (pull model) |
| `withdraw()` | anyone with credits | Withdraw accumulated prize credits as USDC |
| `entropyCallback(uint64, address, bytes32)` | Pyth Entropy only | Randomness callback: stores winning numbers + lucky ticket (O(1)) |
| `entropyFee()` | view | Current Pyth Entropy fee per draw (native ETH) |
| `drawDue()` / `settleDue()` | view | Keeper resolvers — true when a draw / settlement is due |
| `sweepFees()` | owner | Transfer accrued protocol fees to `feeRecipient` |
| `emergencyExpire(roundId)` | owner | Expire a round stuck past the 48h randomness timeout; rolls its pool forward |
| `sweepUnclaimed(address[])` | owner | Reclaim prize credits unclaimed for >30 days to `feeRecipient` |
| `withdrawEth(to, amount)` | owner | Withdraw surplus ETH float (never touches USDC/credits) |
| `setFeeRecipient(address)` | owner | Update the protocol-fee recipient |
| `pause()` / `unpause()` | owner | Halt / resume ticket buying and draws |
| `getRound(id)` / `getTicket(idx)` / `checkTicket(roundId, idx)` / `isLuckyWallet(roundId, addr)` | view | Round / ticket / result reads |

**Key constants (immutable):**

| Constant | Value |
|---|---|
| `TICKET_PRICE` | 2 USDC | 
| `ROUND_DURATION` | 24 hours |
| `MAX_TICKETS_PER_ROUND` | 1,000 |
| `UNCLAIMED_EXPIRY` | 30 days (credits sweepable after) |
| `FEE_BPS` | 500 (5%) — no setter |
| `MAIN_RANGE` / `KITTI_RANGE` | 10 (digits 0–9) / 4 (K·I·T·Y) |

---

## Security

This is an **MVP under active development**. See the post-deploy checklist above for the launch steps.

- **Randomness** — verifiable randomness from **Pyth Entropy** (provider pre-commits to a hash chain, so it cannot bias the result after seeing the request). The contract inherits Pyth's `IEntropyConsumer`, which authenticates the callback (`msg.sender == entropy`); the Entropy address is `immutable`. Each winning digit is derived deterministically from the seed (`keccak256(seed, i) % 10`), and every round emits `DrawReady` / `DrawSettled` events — anyone can re-derive and verify the result.
- **Gas-safe settlement** — the 1,000-ticket winner count runs in a permissionless, batched `settle()` outside the gas-limited randomness callback, so settlement can never get stuck on gas. Tier payouts are pull-based.
- **Re-entrancy** — state-changing functions are guarded with `ReentrancyGuard`.
- **Fee cap** — protocol fee is hard-coded at 5% (`FEE_BPS = 500`); there is no setter.
- **Ownership** — set at construction via `_owner` (Ownable2Step), so the contract is Safe-owned from transaction #1; the deploying EOA never holds ownership. Owner powers (`sweepFees`, `sweepUnclaimed`, `emergencyExpire`, `pause`, `setFeeRecipient`, `withdrawEth`) cannot touch user prize funds beyond the defined fee/unclaimed paths, and the owner cannot influence the draw.
- **Not professionally audited.** A multi-lens adversarial review was run and the 63-test suite covers the round lifecycle, randomness callback, batched settlement, claims, fees, re-entrancy, settlement idempotency, early-fill draws, and edge cases. This is not a substitute for a professional audit before handling real value.

### Legal note (not legal advice)

Lottery and gambling laws vary widely by jurisdiction. USDC-denominated on-chain games may be regulated activity in your region. Get qualified legal advice before operating KITY for real money.

---

## Roadmap

- [x] Pyth Entropy randomness integration
- [x] Base mainnet deployment + Sourcify verification
- [x] Keeper (GitHub Actions cron) for auto draw + settle
- [ ] Safe multisig ownership
- [ ] Vercel production deployment
- [ ] Referral / share-to-boost mechanic
- [ ] Multi-round history & personal ticket dashboard

---

## License

MIT — see [`LICENSE`](LICENSE).
