const { createPublicClient, http } = require("viem");
const { base } = require("viem/chains");

const LOTTERY_ADDRESS = "0x7AB998E1f73229f0Cf016e8811e9a88eFE8Ee0c5";

const abi = [
  {
    name: 'currentRound',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'getRound',
    type: 'function',
    stateMutability: 'view',
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
    name: 'drawDue',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'settleDue',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }]
  }
];

async function main() {
  const client = createPublicClient({
    chain: base,
    transport: http("https://base-rpc.publicnode.com")
  });

  const curr = await client.readContract({
    address: LOTTERY_ADDRESS,
    abi,
    functionName: "currentRound"
  });

  const round = await client.readContract({
    address: LOTTERY_ADDRESS,
    abi,
    functionName: "getRound",
    args: [curr]
  });

  const drawDue = await client.readContract({
    address: LOTTERY_ADDRESS,
    abi,
    functionName: "drawDue"
  });

  const settleDue = await client.readContract({
    address: LOTTERY_ADDRESS,
    abi,
    functionName: "settleDue"
  });

  console.log("Current Round ID:", curr.toString());
  console.log("Round Details:");
  console.log("  startTicket:", round.startTicket.toString());
  console.log("  ticketCount:", round.ticketCount.toString());
  console.log("  endTime (unix):", round.endTime.toString());
  console.log("  endTime (date):", new Date(Number(round.endTime) * 1000).toLocaleString());
  console.log("  status:", round.status); // 0=Open 1=Drawing 2=Drawn 3=Settled
  console.log("  drawRequestedAt:", round.drawRequestedAt.toString());
  console.log("  drawDue:", drawDue);
  console.log("  settleDue:", settleDue);
}

main().catch(console.error);
