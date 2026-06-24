const { expect } = require("chai");
const { ethers }  = require("hardhat");
const {
  loadFixture, time, impersonateAccount, setBalance,
} = require("@nomicfoundation/hardhat-network-helpers");

const USDC  = (n) => BigInt(Math.round(n * 1e6));
const DAY   = 24 * 3600;

// Round status enum: Open=0, Drawing=1, Drawn=2, Settled=3
const OPEN = 0, DRAWING = 1, DRAWN = 2, SETTLED = 3;

// Dummy Pyth Entropy provider used by MockEntropy in tests.
const PROVIDER = "0x1111111111111111111111111111111111111111";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Build n tickets with digits 0–9 */
function makeTickets(n, baseMain = [0, 1, 2, 3], baseKitti = 0) {
  const mains  = [];
  const kittis = [];
  for (let i = 0; i < n; i++) {
    mains.push(baseMain.map(v => (v + i) % 10));
    kittis.push((baseKitti + i) % 4);
  }
  return { mains, kittis };
}

/** uint256 word → bytes32 (the random number Pyth delivers). uint256(bytes32) == word. */
function toRandom(word) {
  return ethers.zeroPadValue(ethers.toBeHex(word), 32);
}

/**
 * Derive the winning numbers in JS, mirroring _deriveNumbers() in Solidity.
 * Used to construct winning tickets for prize tests.
 */
function deriveWinners(word) {
  const main = [];
  for (let i = 0n; i < 4n; i++) {
    const packed = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"], [word, i]
    );
    main.push(Number(BigInt(ethers.keccak256(packed)) % 10n));
  }
  const packedK = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "uint256"], [word, 99n]
  );
  const kitti = Number(BigInt(ethers.keccak256(packedK)) % 4n);
  return { main, kitti };
}

// ── fixture ──────────────────────────────────────────────────────────────────

async function fixture() {
  const [owner, alice, bob, carol, ...rest] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("MockERC20");
  const usdc  = await Token.deploy("USD Coin", "USDC", 6);

  // Pyth Entropy mock — getFeeV2() returns 0 so triggerDraw needs no ETH float.
  const Entropy = await ethers.getContractFactory("MockEntropy");
  const mockEntropy = await Entropy.deploy(PROVIDER);

  const Lottery = await ethers.getContractFactory("KittiLottery");
  const lottery = await Lottery.deploy(
    await usdc.getAddress(),
    owner.address,                    // feeRecipient
    await mockEntropy.getAddress(),   // entropy
    owner.address                     // owner
  );

  const lotteryAddr = await lottery.getAddress();

  for (const u of [alice, bob, carol, ...rest.slice(0, 5)]) {
    await usdc.mint(u.address, USDC(10_000));
    await usdc.connect(u).approve(lotteryAddr, ethers.MaxUint256);
  }

  return { owner, alice, bob, carol, rest, usdc, lottery, mockEntropy };
}

/** Reveal randomness for a round that is in Drawing state → Drawn. */
async function reveal(ctx, rid, word) {
  const seq = (await ctx.lottery.getRound(rid)).entropySeq;
  await ctx.mockEntropy.mockReveal(PROVIDER, seq, toRandom(word));
}

/**
 * Buy n tickets, advance past endTime, triggerDraw, deliver Pyth randomness,
 * then settle the round. `word` is the randomness (uint256) supplied.
 */
async function buyAndDraw(ctx, signer, n = 1, mainOverride, kittiOverride, word = 42n) {
  const { lottery } = ctx;
  const { mains, kittis } = makeTickets(n, mainOverride, kittiOverride);
  const rid = await lottery.currentRound();

  if (n > 0) await lottery.connect(signer).buyTickets(mains, kittis);

  const r = await lottery.getRound(rid);
  await time.increaseTo(Number(r.endTime) + 1);
  await lottery.triggerDraw();      // round → Drawing
  await reveal(ctx, rid, word);     // round → Drawn
  await lottery.settle(10_000);     // round → Settled
  return rid;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("KittiLottery v3 (Pyth Entropy)", function () {

  // ── Deployment ─────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("initialises round 0 as Open with a 24 h end time", async function () {
      const { lottery } = await loadFixture(fixture);
      const r = await lottery.getRound(0n);
      expect(r.status).to.equal(OPEN);
      expect(await lottery.currentRound()).to.equal(0n);
      const now = BigInt(await time.latest());
      expect(r.endTime).to.be.closeTo(now + BigInt(DAY), 120n);
    });

    it("stores correct constants and entropy address", async function () {
      const { lottery, mockEntropy } = await loadFixture(fixture);
      expect(await lottery.TICKET_PRICE()).to.equal(USDC(2));
      expect(await lottery.ROUND_DURATION()).to.equal(BigInt(DAY));
      expect(await lottery.MAIN_RANGE()).to.equal(10n);
      expect(await lottery.KITTI_RANGE()).to.equal(4n);
      expect(await lottery.entropy()).to.equal(await mockEntropy.getAddress());
    });

    it("sets owner to the constructor _owner, not the deploying EOA", async function () {
      const [deployerEOA, , , , safe] = await ethers.getSigners();
      const Token = await ethers.getContractFactory("MockERC20");
      const usdc = await Token.connect(deployerEOA).deploy("USD Coin", "USDC", 6);
      const Entropy = await ethers.getContractFactory("MockEntropy");
      const ent = await Entropy.connect(deployerEOA).deploy(PROVIDER);
      const Lottery = await ethers.getContractFactory("KittiLottery");
      const lottery = await Lottery.connect(deployerEOA).deploy(
        await usdc.getAddress(),
        safe.address,
        await ent.getAddress(),
        safe.address // _owner = the "Safe"
      );
      expect(await lottery.owner()).to.equal(safe.address);
      expect(await lottery.owner()).to.not.equal(deployerEOA.address);
    });

    it("reverts on zero entropy address", async function () {
      const { usdc, owner } = await loadFixture(fixture);
      const Lottery = await ethers.getContractFactory("KittiLottery");
      await expect(Lottery.deploy(
        await usdc.getAddress(), owner.address, ethers.ZeroAddress, owner.address
      )).to.be.revertedWithCustomError(Lottery, "ZeroAddress");
    });
  });

  // ── Settlement idempotency (H-1) ─────────────────────────────────────────────

  describe("Settlement idempotency (H-1)", function () {
    it("a stale entropy callback on a non-Drawing round is a no-op", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, mockEntropy, alice } = ctx;
      const rid = await buyAndDraw(ctx, alice, 1, undefined, undefined, 42n);

      const creditsAfter = await lottery.credits(alice.address);
      expect(creditsAfter).to.be.gt(0n);

      // Impersonate the Entropy contract and replay the callback for the settled
      // round. The status guard must make it a no-op (no re-credit / re-derive).
      const entropyAddr = await mockEntropy.getAddress();
      await impersonateAccount(entropyAddr);
      await setBalance(entropyAddr, ethers.parseEther("1"));
      const entropySigner = await ethers.getSigner(entropyAddr);
      const seq = (await lottery.getRound(rid)).entropySeq;
      await lottery.connect(entropySigner)._entropyCallback(seq, PROVIDER, toRandom(42n));

      expect(await lottery.credits(alice.address)).to.equal(creditsAfter);
      expect((await lottery.getRound(rid)).status).to.equal(SETTLED);
    });

    it("rejects entropy callback from a non-Entropy caller", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await expect(
        lottery.connect(alice)._entropyCallback(1n, PROVIDER, toRandom(1n))
      ).to.be.revertedWith("Only Entropy can call this function");
    });
  });

  // ── Ticket validation ───────────────────────────────────────────────────────

  describe("Ticket validation", function () {
    it("rejects KITY letter >= 4", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await expect(
        lottery.connect(alice).buyTickets([[0, 1, 2, 3]], [4])
      ).to.be.revertedWithCustomError(lottery, "BadNumbers");
    });

    it("rejects main digit >= 10", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await expect(
        lottery.connect(alice).buyTickets([[10, 1, 2, 3]], [0])
      ).to.be.revertedWithCustomError(lottery, "BadNumbers");
    });

    it("accepts duplicate main digits (7-7-1-4 is valid)", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await expect(lottery.connect(alice).buyTickets([[7, 7, 1, 4]], [0])).to.not.be.reverted;
    });

    it("accepts all-same digit ticket (2-2-2-2)", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await expect(lottery.connect(alice).buyTickets([[2, 2, 2, 2]], [1])).to.not.be.reverted;
    });
  });

  // ── Buying tickets ──────────────────────────────────────────────────────────

  describe("Buying tickets", function () {
    it("stores ticket and emits TicketBought", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await expect(lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]))
        .to.emit(lottery, "TicketBought").withArgs(0n, 0n, alice.address);
      const t = await lottery.getTicket(0n);
      expect(t.buyer).to.equal(alice.address);
      expect(t.kittiNumber).to.equal(0n);
    });

    it("pulls $2 USDC per ticket", async function () {
      const { lottery, alice, usdc } = await loadFixture(fixture);
      const before = await usdc.balanceOf(alice.address);
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4], [5, 6, 7, 8]], [0, 1]);
      expect(before - await usdc.balanceOf(alice.address)).to.equal(USDC(4));
    });

    it("opens the next round on draw; buying continues in the new round", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await lottery.connect(alice).buyTickets(...Object.values(makeTickets(1)));

      const r = await lottery.getRound(0n);
      await time.increaseTo(Number(r.endTime) + 1);
      await lottery.triggerDraw(); // round 0 → Drawing, round 1 opens

      expect((await lottery.getRound(0n)).status).to.equal(DRAWING);
      await expect(lottery.connect(alice).buyTickets([[5, 6, 7, 8]], [2])).to.not.be.reverted;
      expect(await lottery.currentRound()).to.equal(1n);
    });
  });

  // ── Draw trigger ────────────────────────────────────────────────────────────

  describe("Draw trigger", function () {
    it("reverts triggerDraw before endTime", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]);
      await expect(lottery.triggerDraw()).to.be.revertedWithCustomError(lottery, "DrawNotDue");
    });

    it("extends round by 24 h if no tickets sold", async function () {
      const { lottery } = await loadFixture(fixture);
      const r0 = await lottery.getRound(0n);
      await time.increaseTo(Number(r0.endTime) + 1);

      await expect(lottery.triggerDraw())
        .to.emit(lottery, "RoundExtended").withArgs(0n, r0.endTime + BigInt(DAY));

      const r0after = await lottery.getRound(0n);
      expect(r0after.endTime).to.equal(r0.endTime + BigInt(DAY));
      expect(r0after.status).to.equal(OPEN);
    });

    it("triggers draw, requests randomness, and moves to Drawing", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]);
      const r = await lottery.getRound(0n);
      await time.increaseTo(Number(r.endTime) + 1);

      await expect(lottery.triggerDraw()).to.emit(lottery, "DrawTriggered");

      const r0 = await lottery.getRound(0n);
      expect(r0.status).to.equal(DRAWING);
      expect(r0.entropySeq).to.be.gt(0n); // a Pyth sequence number was assigned
      expect(await lottery.currentRound()).to.equal(1n);
    });

    it("next round endTime is previous endTime + 24 h", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]);
      const r0 = await lottery.getRound(0n);
      await time.increaseTo(Number(r0.endTime) + 1);
      await lottery.triggerDraw();
      const r1 = await lottery.getRound(1n);
      expect(r1.endTime).to.equal(r0.endTime + BigInt(DAY));
    });

    it("anyone can call triggerDraw after endTime", async function () {
      const { lottery, alice, bob } = await loadFixture(fixture);
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]);
      const r = await lottery.getRound(0n);
      await time.increaseTo(Number(r.endTime) + 1);
      await expect(lottery.connect(bob).triggerDraw()).to.not.be.reverted;
    });
  });

  // ── Early draw on full round ──────────────────────────────────────────────────

  describe("Early draw on full round", function () {
    async function fillRound(lottery, signer, cap) {
      for (let i = 0; i < cap; i += 100) {
        const { mains, kittis } = makeTickets(Math.min(100, cap - i));
        await lottery.connect(signer).buyTickets(mains, kittis);
      }
    }

    it("hitting the cap shortens endTime to ~15 min and enables an early draw", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      const cap = Number(await lottery.MAX_TICKETS_PER_ROUND());
      const r0 = await lottery.getRound(0n);

      await fillRound(lottery, alice, cap);

      const r = await lottery.getRound(0n);
      const now = BigInt(await time.latest());
      expect(r.ticketCount).to.equal(BigInt(cap));
      expect(r.endTime).to.be.lt(r0.endTime);
      expect(r.endTime).to.be.closeTo(now + 900n, 120n);

      expect(await lottery.drawDue()).to.equal(false);
      await expect(lottery.triggerDraw()).to.be.revertedWithCustomError(lottery, "DrawNotDue");

      await time.increaseTo(Number(r.endTime) + 1);
      expect(await lottery.drawDue()).to.equal(true);
      await lottery.triggerDraw();
      expect((await lottery.getRound(0n)).status).to.equal(DRAWING);
    });

    it("buying past the cap reverts with RoundFull", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      const cap = Number(await lottery.MAX_TICKETS_PER_ROUND());
      await fillRound(lottery, alice, cap);
      await expect(lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]))
        .to.be.revertedWithCustomError(lottery, "RoundFull");
    });

    it("drawDue is false for an open round before its endTime", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]);
      expect(await lottery.drawDue()).to.equal(false);
    });
  });

  // ── Randomness + settlement ───────────────────────────────────────────────────

  describe("Randomness + settlement", function () {
    it("entropyCallback marks the round Drawn and stores winning numbers", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, alice } = ctx;
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]);
      const r = await lottery.getRound(0n);
      await time.increaseTo(Number(r.endTime) + 1);
      await lottery.triggerDraw();

      expect(await lottery.settleDue()).to.equal(false); // still Drawing
      await reveal(ctx, 0n, 42n);
      const rd = await lottery.getRound(0n);
      expect(rd.status).to.equal(DRAWN);
      expect(await lottery.settleDue()).to.equal(true);
    });

    it("settle finalises the round and emits DrawSettled", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, alice } = ctx;
      const rid = await buyAndDraw(ctx, alice);
      const r = await lottery.getRound(rid);
      expect(r.status).to.equal(SETTLED);
      expect(r.settledAt).to.be.gt(0n);
      expect(await lottery.settleDue()).to.equal(false);
    });

    it("settle can be batched across multiple calls", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, alice } = ctx;
      await lottery.connect(alice).buyTickets(...Object.values(makeTickets(5)));
      const r = await lottery.getRound(0n);
      await time.increaseTo(Number(r.endTime) + 1);
      await lottery.triggerDraw();
      await reveal(ctx, 0n, 42n);

      // First batch processes 2 of 5 tickets — round stays Drawn.
      await expect(lottery.settle(2)).to.emit(lottery, "RoundSettleProgress").withArgs(0n, 2n, 5n);
      expect((await lottery.getRound(0n)).status).to.equal(DRAWN);
      // Remaining tickets finish it.
      await lottery.settle(2);
      expect((await lottery.getRound(0n)).status).to.equal(DRAWN);
      await lottery.settle(2);
      expect((await lottery.getRound(0n)).status).to.equal(SETTLED);
    });

    it("settle reverts when no round is Drawn", async function () {
      const { lottery } = await loadFixture(fixture);
      await expect(lottery.settle(10)).to.be.revertedWithCustomError(lottery, "RoundNotDrawn");
    });

    it("winning digits are 0–9 and KITY letter is 0–3", async function () {
      const ctx = await loadFixture(fixture);
      const rid = await buyAndDraw(ctx, ctx.alice);
      const r = await ctx.lottery.getRound(rid);
      for (const d of r.winningMain) expect(Number(d)).to.be.gte(0).and.lte(9);
      expect(Number(r.winningKitti)).to.be.gte(0).and.lte(3);
    });
  });

  // ── Prize split — no winners ────────────────────────────────────────────────

  describe("Prize split — no winners", function () {
    it("routes 5 % to protocolFees", async function () {
      const ctx = await loadFixture(fixture);
      await buyAndDraw(ctx, ctx.alice, 1);
      expect(await ctx.lottery.protocolFees()).to.equal(USDC(2) * 500n / 10000n);
    });

    it("lucky wallet is auto-credited 10 % at settlement", async function () {
      const ctx = await loadFixture(fixture);
      const rid = await buyAndDraw(ctx, ctx.alice, 1);
      const r = await ctx.lottery.getRound(rid);
      const luckyBuyer = (await ctx.lottery.getTicket(r.luckyTicket)).buyer;
      expect(await ctx.lottery.credits(luckyBuyer)).to.be.gte(USDC(2) * 1000n / 10000n);
    });

    it("no-winner tiers + 10 % reserve roll to nextRoundPool", async function () {
      const ctx = await loadFixture(fixture);
      const rid = await buyAndDraw(ctx, ctx.alice, 1, [0, 1, 2, 3], 0, 999999n);
      const r = await ctx.lottery.getRound(rid);
      expect(r.rolledToNext).to.be.gt(0n);
      expect(await ctx.lottery.nextRoundPool()).to.equal(r.rolledToNext);
    });
  });

  // ── Jackpot winner + claimPrize ────────────────────────────────────────────────

  describe("Jackpot winner + claimPrize", function () {
    it("jackpot winner claims their tier prize on top of the lucky credit", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, alice, usdc } = ctx;
      const WORD = 12345n;
      const { main, kitti } = deriveWinners(WORD);

      const rid = await buyAndDraw(ctx, alice, 1, main, kitti, WORD);

      // Lucky credit is auto-applied; the tier prize must be claimed.
      const beforeClaim = await lottery.credits(alice.address);
      expect(beforeClaim).to.be.gt(0n); // lucky

      await expect(lottery.claimPrize(rid, 0n)).to.emit(lottery, "PrizeAwarded");
      const afterClaim = await lottery.credits(alice.address);
      expect(afterClaim).to.be.gt(beforeClaim); // jackpot added

      const before = await usdc.balanceOf(alice.address);
      await lottery.connect(alice).withdraw();
      expect(await usdc.balanceOf(alice.address) - before).to.equal(afterClaim);
    });

    it("checkTicket returns tier 1 for jackpot ticket", async function () {
      const ctx = await loadFixture(fixture);
      const WORD = 12345n;
      const { main, kitti } = deriveWinners(WORD);
      const rid = await buyAndDraw(ctx, ctx.alice, 1, main, kitti, WORD);
      expect(await ctx.lottery.checkTicket(rid, 0n)).to.equal(1n);
    });

    it("double-claim reverts with AlreadyClaimed", async function () {
      const ctx = await loadFixture(fixture);
      const WORD = 12345n;
      const { main, kitti } = deriveWinners(WORD);
      const rid = await buyAndDraw(ctx, ctx.alice, 1, main, kitti, WORD);
      await ctx.lottery.claimPrize(rid, 0n);
      await expect(ctx.lottery.claimPrize(rid, 0n))
        .to.be.revertedWithCustomError(ctx.lottery, "AlreadyClaimed");
    });

    it("claiming a non-winning ticket reverts with NoPrize", async function () {
      const ctx = await loadFixture(fixture);
      const rid = await buyAndDraw(ctx, ctx.alice, 1, [0, 1, 2, 3], 0, 999999n);
      await expect(ctx.lottery.claimPrize(rid, 0n))
        .to.be.revertedWithCustomError(ctx.lottery, "NoPrize");
    });

    it("claiming a ticket outside the round reverts with WrongRound", async function () {
      const ctx = await loadFixture(fixture);
      const WORD = 12345n;
      const { main, kitti } = deriveWinners(WORD);
      const rid = await buyAndDraw(ctx, ctx.alice, 1, main, kitti, WORD);
      await expect(ctx.lottery.claimPrize(rid, 5n))
        .to.be.revertedWithCustomError(ctx.lottery, "WrongRound");
    });

    it("claiming before settlement reverts with RoundNotSettled", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, alice } = ctx;
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]);
      const r = await lottery.getRound(0n);
      await time.increaseTo(Number(r.endTime) + 1);
      await lottery.triggerDraw();
      await reveal(ctx, 0n, 42n); // Drawn, not settled
      await expect(lottery.claimPrize(0n, 0n))
        .to.be.revertedWithCustomError(lottery, "RoundNotSettled");
    });
  });

  // ── Credits and withdrawal ──────────────────────────────────────────────────

  describe("Credits and withdrawal", function () {
    it("withdraw() transfers credits and zeroes the balance", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, alice, usdc } = ctx;
      await buyAndDraw(ctx, alice, 1); // alice is the lone buyer → lucky credit
      const credit = await lottery.credits(alice.address);
      expect(credit).to.be.gt(0n);

      const before = await usdc.balanceOf(alice.address);
      await lottery.connect(alice).withdraw();
      expect(await usdc.balanceOf(alice.address) - before).to.equal(credit);
      expect(await lottery.credits(alice.address)).to.equal(0n);
    });

    it("withdraw() emits Withdrawn event", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, alice } = ctx;
      await buyAndDraw(ctx, alice, 1);
      const credit = await lottery.credits(alice.address);
      await expect(lottery.connect(alice).withdraw())
        .to.emit(lottery, "Withdrawn").withArgs(alice.address, credit);
    });

    it("withdraw() reverts when credits are zero", async function () {
      const { lottery, bob } = await loadFixture(fixture);
      await expect(lottery.connect(bob).withdraw())
        .to.be.revertedWithCustomError(lottery, "NothingToWithdraw");
    });

    it("cannot withdraw twice", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, alice } = ctx;
      await buyAndDraw(ctx, alice, 1);
      await lottery.connect(alice).withdraw();
      await expect(lottery.connect(alice).withdraw())
        .to.be.revertedWithCustomError(lottery, "NothingToWithdraw");
    });

    it("credits accumulate across multiple rounds before withdrawal", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, alice } = ctx;
      await buyAndDraw(ctx, alice, 1);
      const c1 = await lottery.credits(alice.address);
      await buyAndDraw(ctx, alice, 1);
      const c2 = await lottery.credits(alice.address);
      expect(c2).to.be.gt(c1);
    });
  });

  // ── Rolling jackpot ─────────────────────────────────────────────────────────

  describe("Rolling jackpot", function () {
    it("nextRoundPool is included in next round's pool", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, alice } = ctx;
      const rid0 = await buyAndDraw(ctx, alice, 1, [0, 1, 2, 3], 0, 999999n);
      const rolled = (await lottery.getRound(rid0)).rolledToNext;
      expect(rolled).to.be.gt(0n);

      const rid1 = await buyAndDraw(ctx, alice, 1, [0, 1, 2, 3], 0, 999998n);
      expect((await lottery.getRound(rid1)).pool).to.equal(USDC(2) + rolled);
    });

    it("nextRoundPool grows across multiple no-winner rounds", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, alice } = ctx;
      await buyAndDraw(ctx, alice, 1, [0, 1, 2, 3], 0, 999999n);
      await buyAndDraw(ctx, alice, 1, [0, 1, 2, 3], 0, 999998n);
      expect(await lottery.nextRoundPool()).to.be.gt(0n);
    });
  });

  // ── Protocol fees ───────────────────────────────────────────────────────────

  describe("Protocol fees", function () {
    it("sweepFees sends accumulated fees to feeRecipient", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, alice, owner, usdc } = ctx;
      await buyAndDraw(ctx, alice, 1);
      const fees = await lottery.protocolFees();
      expect(fees).to.be.gt(0n);
      const before = await usdc.balanceOf(owner.address);
      await lottery.connect(owner).sweepFees();
      expect(await usdc.balanceOf(owner.address) - before).to.equal(fees);
      expect(await lottery.protocolFees()).to.equal(0n);
    });

    it("sweepFees reverts for non-owner", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await expect(lottery.connect(alice).sweepFees())
        .to.be.revertedWithCustomError(lottery, "OwnableUnauthorizedAccount");
    });
  });

  // ── ETH float (Pyth fees) ─────────────────────────────────────────────────────

  describe("ETH float", function () {
    it("accepts ETH via receive() and reports entropyFee", async function () {
      const { lottery, owner } = await loadFixture(fixture);
      await expect(owner.sendTransaction({ to: await lottery.getAddress(), value: ethers.parseEther("0.01") }))
        .to.emit(lottery, "EthFunded");
      expect(await ethers.provider.getBalance(await lottery.getAddress())).to.equal(ethers.parseEther("0.01"));
      expect(await lottery.entropyFee()).to.equal(0n); // MockEntropy fee is 0
    });

    it("owner can withdraw ETH float; non-owner cannot", async function () {
      const { lottery, owner, alice } = await loadFixture(fixture);
      await owner.sendTransaction({ to: await lottery.getAddress(), value: ethers.parseEther("1") });
      await expect(lottery.connect(alice).withdrawEth(alice.address, 1n))
        .to.be.revertedWithCustomError(lottery, "OwnableUnauthorizedAccount");
      const before = await ethers.provider.getBalance(alice.address);
      await lottery.connect(owner).withdrawEth(alice.address, ethers.parseEther("0.5"));
      expect(await ethers.provider.getBalance(alice.address) - before).to.equal(ethers.parseEther("0.5"));
    });
  });

  // ── Multi-round continuity ──────────────────────────────────────────────────

  describe("Multi-round continuity", function () {
    it("round 1 opens immediately after round 0 draw", async function () {
      const ctx = await loadFixture(fixture);
      await buyAndDraw(ctx, ctx.alice, 1);
      expect(await ctx.lottery.currentRound()).to.equal(1n);
      expect((await ctx.lottery.getRound(1n)).status).to.equal(OPEN);
    });

    it("global ticket index is monotonically increasing", async function () {
      const ctx = await loadFixture(fixture);
      await buyAndDraw(ctx, ctx.alice, 3);
      expect((await ctx.lottery.getRound(1n)).startTicket).to.equal(3n);
    });
  });

  // ── Pausable ─────────────────────────────────────────────────────────────────

  describe("Pausable", function () {
    it("blocks buyTickets when paused", async function () {
      const { lottery, alice, owner } = await loadFixture(fixture);
      await lottery.connect(owner).pause();
      await expect(lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]))
        .to.be.revertedWithCustomError(lottery, "EnforcedPause");
    });

    it("blocks triggerDraw when paused", async function () {
      const { lottery, alice, owner } = await loadFixture(fixture);
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]);
      const r = await lottery.getRound(0n);
      await time.increaseTo(Number(r.endTime) + 1);
      await lottery.connect(owner).pause();
      await expect(lottery.triggerDraw()).to.be.revertedWithCustomError(lottery, "EnforcedPause");
    });

    it("allows buyTickets after unpause", async function () {
      const { lottery, alice, owner } = await loadFixture(fixture);
      await lottery.connect(owner).pause();
      await lottery.connect(owner).unpause();
      await expect(lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0])).to.not.be.reverted;
    });

    it("only owner can pause/unpause", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await expect(lottery.connect(alice).pause())
        .to.be.revertedWithCustomError(lottery, "OwnableUnauthorizedAccount");
    });
  });

  // ── Number derivation ────────────────────────────────────────────────────────

  describe("Number derivation (deterministic)", function () {
    it("JS deriveWinners matches contract output", async function () {
      const ctx = await loadFixture(fixture);
      const WORD = 77777n;
      const { main, kitti } = deriveWinners(WORD);
      const rid = await buyAndDraw(ctx, ctx.alice, 1, [0, 1, 2, 3], 0, WORD);
      const r = await ctx.lottery.getRound(rid);
      for (let i = 0; i < 4; i++) expect(Number(r.winningMain[i])).to.equal(main[i]);
      expect(Number(r.winningKitti)).to.equal(kitti);
    });
  });

  // ── Positional matching ──────────────────────────────────────────────────────

  describe("Positional matching", function () {
    it("3 digits in correct POSITIONS wins 3rd prize", async function () {
      const ctx = await loadFixture(fixture);
      const WORD = 12345n;
      const { main, kitti } = deriveWinners(WORD);
      const partial = [main[0], main[1], main[2], (main[3] + 1) % 10];
      const rid = await buyAndDraw(ctx, ctx.alice, 1, partial, kitti, WORD);
      expect(await ctx.lottery.checkTicket(rid, 0n)).to.equal(3n);
    });

    it("matching 3 values in wrong positions is NOT a win", async function () {
      const ctx = await loadFixture(fixture);
      const WORD = 12345n;
      const { main } = deriveWinners(WORD);
      const shifted = [main[1], main[2], main[3], main[0]];
      const rid = await buyAndDraw(ctx, ctx.alice, 1, shifted, 0, WORD);
      expect(await ctx.lottery.checkTicket(rid, 0n)).to.equal(0n);
    });

    it("4 digits match but wrong KITY letter wins 2nd prize", async function () {
      const ctx = await loadFixture(fixture);
      const WORD = 12345n;
      const { main, kitti } = deriveWinners(WORD);
      const rid = await buyAndDraw(ctx, ctx.alice, 1, main, (kitti + 1) % 4, WORD);
      expect(await ctx.lottery.checkTicket(rid, 0n)).to.equal(2n);
    });
  });

  // ── Emergency expire ─────────────────────────────────────────────────────────

  describe("Emergency expire", function () {
    it("reverts before the 48 h timeout", async function () {
      const { lottery, alice, owner } = await loadFixture(fixture);
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]);
      const r = await lottery.getRound(0n);
      await time.increaseTo(Number(r.endTime) + 1);
      await lottery.triggerDraw(); // Drawing, no reveal
      await expect(lottery.connect(owner).emergencyExpire(0n))
        .to.be.revertedWithCustomError(lottery, "DrawNotTimedOut");
    });

    it("reverts for non-owner", async function () {
      const { lottery, alice, owner } = await loadFixture(fixture);
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]);
      const r = await lottery.getRound(0n);
      await time.increaseTo(Number(r.endTime) + 1);
      await lottery.triggerDraw();
      await time.increase(48 * 3600 + 1);
      await expect(lottery.connect(alice).emergencyExpire(0n))
        .to.be.revertedWithCustomError(lottery, "OwnableUnauthorizedAccount");
    });

    it("reverts on an already-settled round", async function () {
      const ctx = await loadFixture(fixture);
      const rid = await buyAndDraw(ctx, ctx.alice, 1);
      await expect(ctx.lottery.connect(ctx.owner).emergencyExpire(rid))
        .to.be.revertedWithCustomError(ctx.lottery, "RoundNotDrawing");
    });

    it("expires after 48 h, marks Settled, rolls pool to nextRoundPool", async function () {
      const { lottery, alice, owner } = await loadFixture(fixture);
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]);
      const r0 = await lottery.getRound(0n);
      await time.increaseTo(Number(r0.endTime) + 1);
      await lottery.triggerDraw();
      await time.increase(48 * 3600 + 1);

      await expect(lottery.connect(owner).emergencyExpire(0n))
        .to.emit(lottery, "RoundExpired").withArgs(0n, USDC(2));

      const r = await lottery.getRound(0n);
      expect(r.status).to.equal(SETTLED);
      expect(await lottery.nextRoundPool()).to.equal(USDC(2));
      expect(await lottery.nextRoundToSettle()).to.equal(1n);
    });

    it("expired ticket revenue appears in next round's pool", async function () {
      const ctx = await loadFixture(fixture);
      const { lottery, alice, owner } = ctx;
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]);
      const r0 = await lottery.getRound(0n);
      await time.increaseTo(Number(r0.endTime) + 1);
      await lottery.triggerDraw();
      await time.increase(48 * 3600 + 1);
      await lottery.connect(owner).emergencyExpire(0n);

      const rid1 = await lottery.currentRound(); // 1
      await lottery.connect(alice).buyTickets([[0, 1, 2, 3]], [0]);
      await lottery.triggerDraw(); // time already past r1.endTime
      await reveal(ctx, rid1, 999998n);
      await lottery.settle(10_000);

      expect((await lottery.getRound(rid1)).pool).to.equal(USDC(4));
    });
  });

  // ── Views ────────────────────────────────────────────────────────────────────

  describe("Views", function () {
    it("checkTicket returns 0 for unsettled round", async function () {
      const { lottery, alice } = await loadFixture(fixture);
      await lottery.connect(alice).buyTickets([[1, 2, 3, 4]], [0]);
      expect(await lottery.checkTicket(0n, 0n)).to.equal(0n);
    });

    it("isLuckyWallet true for lucky buyer, false otherwise", async function () {
      const ctx = await loadFixture(fixture);
      const rid = await buyAndDraw(ctx, ctx.alice, 1);
      expect(await ctx.lottery.isLuckyWallet(rid, ctx.alice.address)).to.be.true;
      expect(await ctx.lottery.isLuckyWallet(rid, ctx.bob.address)).to.be.false;
    });
  });
});
