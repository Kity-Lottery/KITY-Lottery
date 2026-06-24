# KITY — Web frontend

The Next.js dApp for **KITY**, a positional Pick-4 on-chain lottery on Base. Pick
4 digits + a KITY letter, buy a $2 USDC ticket, and a verifiable Pyth Entropy draw
decides the winners. Non-custodial — the contract holds the pool and winners pull
their USDC.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **wagmi v2** + **viem v2** + **@tanstack/react-query**
- Wallet connectors: injected (MetaMask / Rabby), Coinbase Wallet, optional WalletConnect
- Chains: **Base mainnet (8453)** and **Base Sepolia (84532)**

## Getting started

```bash
cd web
npm install
cp .env.local.example .env.local   # optional — Base-mainnet defaults are baked in
npm run dev                        # http://localhost:3000
```

## Environment variables

All optional — `lib/contracts.ts` hardcodes the Base-mainnet defaults, so the app
runs unconfigured. Set these only to override.

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_LOTTERY_ADDRESS` | Deployed KittiLottery contract |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | USDC (or MockERC20 on testnet) |
| `NEXT_PUBLIC_DEFAULT_CHAIN_ID` | 8453 = Base mainnet, 84532 = Base Sepolia |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional — enables WalletConnect |

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build
npm run start   # serve the production build
```

## Pages

- `/` — landing + hero
- `/play` — pick numbers, build a ticket slip, buy; My Tickets (claim + withdraw); Results
- `/about`, `/faq`, `/community`
