export const lotteryAbi = [
  // ── Public state ─────────────────────────────────────────────────────────
  { name: 'currentRound',      type: 'function', stateMutability: 'view', inputs: [],                               outputs: [{ type: 'uint256' }] },
  { name: 'nextRoundToSettle', type: 'function', stateMutability: 'view', inputs: [],                               outputs: [{ type: 'uint256' }] },
  { name: 'totalTickets',      type: 'function', stateMutability: 'view', inputs: [],                               outputs: [{ type: 'uint256' }] },
  { name: 'nextRoundPool',     type: 'function', stateMutability: 'view', inputs: [],                               outputs: [{ type: 'uint256' }] },
  { name: 'protocolFees',      type: 'function', stateMutability: 'view', inputs: [],                               outputs: [{ type: 'uint256' }] },
  { name: 'credits',           type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'lastCreditedAt',    type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'drawDue',           type: 'function', stateMutability: 'view', inputs: [],                               outputs: [{ type: 'bool' }] },
  { name: 'settleDue',         type: 'function', stateMutability: 'view', inputs: [],                               outputs: [{ type: 'bool' }] },
  { name: 'entropyFee',        type: 'function', stateMutability: 'view', inputs: [],                               outputs: [{ type: 'uint256' }] },
  { name: 'entropy',           type: 'function', stateMutability: 'view', inputs: [],                               outputs: [{ type: 'address' }] },
  {
    name: 'prizeClaimed', type: 'function', stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }, { name: '', type: 'uint256' }], outputs: [{ type: 'bool' }],
  },
  // ── Constants ─────────────────────────────────────────────────────────────
  { name: 'TICKET_PRICE',          type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'ROUND_DURATION',        type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'UNCLAIMED_EXPIRY',      type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'MAX_TICKETS_PER_ROUND', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'FULL_DRAW_DELAY',       type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  // ── Writes ────────────────────────────────────────────────────────────────
  {
    name: 'buyTickets', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'mainNums', type: 'uint8[4][]' }, { name: 'kittiNums', type: 'uint8[]' }], outputs: [],
  },
  { name: 'withdraw',    type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'triggerDraw', type: 'function', stateMutability: 'payable',    inputs: [], outputs: [] },
  {
    name: 'settle', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'maxTickets', type: 'uint256' }], outputs: [],
  },
  {
    name: 'claimPrize', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'roundId', type: 'uint256' }, { name: 'ticketIdx', type: 'uint256' }], outputs: [],
  },
  { name: 'sweepFees', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  {
    name: 'sweepUnclaimed', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'wallets', type: 'address[]' }], outputs: [],
  },
  {
    name: 'withdrawEth', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [],
  },
  // ── Struct reads ──────────────────────────────────────────────────────────
  {
    name: 'getRound', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'roundId', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'startTicket',     type: 'uint256' },
        { name: 'ticketCount',     type: 'uint256' },
        { name: 'endTime',         type: 'uint256' },
        { name: 'drawRequestedAt', type: 'uint256' },
        { name: 'winningMain',     type: 'uint8[4]' },
        { name: 'winningKitti',    type: 'uint8' },
        { name: 'luckyTicket',     type: 'uint256' },
        { name: 'status',          type: 'uint8' },   // 0=Open 1=Drawing 2=Drawn 3=Settled
        { name: 'settledAt',       type: 'uint256' },
        { name: 'pool',            type: 'uint256' },
        { name: 'rolledToNext',    type: 'uint256' },
        { name: 'entropySeq',      type: 'uint64' },
        { name: 'randomWord',      type: 'uint256' },
        { name: 'scanCursor',      type: 'uint256' },
        { name: 'jWin',            type: 'uint256' },
        { name: 'p2Win',           type: 'uint256' },
        { name: 'p3Win',           type: 'uint256' },
        { name: 'jpp',             type: 'uint256' },
        { name: 'p2pp',            type: 'uint256' },
        { name: 'p3pp',            type: 'uint256' },
      ],
    }],
  },
  {
    name: 'getTicket', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'idx', type: 'uint256' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'buyer',       type: 'address' },
        { name: 'mainNumbers', type: 'uint8[4]' },
        { name: 'kittiNumber', type: 'uint8' },
      ],
    }],
  },
  {
    name: 'checkTicket', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'roundId', type: 'uint256' }, { name: 'ticketIdx', type: 'uint256' }],
    outputs: [{ name: 'tier', type: 'uint8' }],
  },
  {
    name: 'isLuckyWallet', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'roundId', type: 'uint256' }, { name: 'wallet', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  // ── Events ────────────────────────────────────────────────────────────────
  {
    name: 'TicketBought', type: 'event',
    inputs: [
      { name: 'roundId',   type: 'uint256', indexed: true },
      { name: 'ticketIdx', type: 'uint256', indexed: true },
      { name: 'buyer',     type: 'address', indexed: true },
    ],
  },
  {
    name: 'DrawTriggered', type: 'event',
    inputs: [
      { name: 'roundId',    type: 'uint256', indexed: true },
      { name: 'entropySeq', type: 'uint64',  indexed: false },
      { name: 'endTime',    type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'DrawReady', type: 'event',
    inputs: [
      { name: 'roundId',     type: 'uint256', indexed: true },
      { name: 'winMain',     type: 'uint8[4]', indexed: false },
      { name: 'winKitti',    type: 'uint8',    indexed: false },
      { name: 'luckyTicket', type: 'uint256',  indexed: false },
    ],
  },
  {
    name: 'DrawSettled', type: 'event',
    inputs: [
      { name: 'roundId',      type: 'uint256', indexed: true },
      { name: 'winMain',      type: 'uint8[4]', indexed: false },
      { name: 'winKitti',     type: 'uint8', indexed: false },
      { name: 'luckyTicket',  type: 'uint256', indexed: false },
      { name: 'rolledToNext', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'PrizeAwarded', type: 'event',
    inputs: [
      { name: 'roundId', type: 'uint256', indexed: true },
      { name: 'winner',  type: 'address', indexed: true },
      { name: 'tier',    type: 'uint8',   indexed: false },
      { name: 'amount',  type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Withdrawn', type: 'event',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount',    type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'UnclaimedSwept', type: 'event',
    inputs: [
      { name: 'wallet', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'RoundFilled', type: 'event',
    inputs: [
      { name: 'roundId', type: 'uint256', indexed: true },
      { name: 'drawAt',  type: 'uint256', indexed: false },
    ],
  },
  // ── Errors (so wagmi can decode reverts into named messages) ────────────────
  { type: 'error', name: 'BadNumbers',             inputs: [] },
  { type: 'error', name: 'RoundNotOpen',           inputs: [] },
  { type: 'error', name: 'RoundFull',              inputs: [] },
  { type: 'error', name: 'DrawNotDue',             inputs: [] },
  { type: 'error', name: 'NothingToWithdraw',      inputs: [] },
  { type: 'error', name: 'DrawNotTimedOut',        inputs: [] },
  { type: 'error', name: 'RoundNotDrawing',        inputs: [] },
  { type: 'error', name: 'RoundNotDrawn',          inputs: [] },
  { type: 'error', name: 'RoundNotSettled',        inputs: [] },
  { type: 'error', name: 'WrongRound',             inputs: [] },
  { type: 'error', name: 'NoPrize',                inputs: [] },
  { type: 'error', name: 'AlreadyClaimed',         inputs: [] },
  { type: 'error', name: 'SettleOutOfOrder',       inputs: [] },
  { type: 'error', name: 'InsufficientEntropyFee', inputs: [] },
  { type: 'error', name: 'ZeroAddress',            inputs: [] },
  { type: 'error', name: 'ZeroAmount',             inputs: [] },
  { type: 'error', name: 'EthTransferFailed',      inputs: [] },
] as const;
