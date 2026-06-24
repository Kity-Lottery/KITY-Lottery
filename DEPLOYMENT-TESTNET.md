# Testnet Deployment & Usage Guide (Base Sepolia)

This document provides a summary of the KittiLottery deployment on the Base Sepolia testnet and instructions for interaction.

## Deployment Details

- **Network:** Base Sepolia (Chain ID: `84532`)
- **KittiLottery Address:** `0x393A10cD71C45E1c8f15f31A8DEa9a6a50f38d7C`
- **Mock USDC (tUSDC) Address:** `0x5b1bEc4229a7a0e8ed6683cCEa7564178ED06B68`
- **Gelato VRF Operator:** `0x6Ceb9e4b3a3C83f0B3c3e3b97ff5A4a10C9cf388`
- **Fee Recipient:** `0xE67F620f864265bCFCBC298B07D29b20d4703D69`

## Environment Setup

The web frontend has been pre-configured in `web/.env.local`:

```dotenv
NEXT_PUBLIC_LOTTERY_ADDRESS=0x393A10cD71C45E1c8f15f31A8DEa9a6a50f38d7C
NEXT_PUBLIC_TOKEN_ADDRESS=0x5b1bEc4229a7a0e8ed6683cCEa7564178ED06B68
NEXT_PUBLIC_DEFAULT_CHAIN_ID=84532
```

## How to Test

### 1. Run the Frontend
```bash
cd web
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Connect Wallet
Ensure your wallet (e.g., MetaMask) is connected to the **Base Sepolia** network.

### 3. Get Test Tokens
Since this is a testnet deployment, you need the Mock USDC (tUSDC). You can mint tokens by calling the `mint` function on the contract `0x5b1bEc4229a7a0e8ed6683cCEa7564178ED06B68` via Basescan or a script.

### 4. Play the Lottery
- **Approve:** You must first approve the `KittiLottery` contract to spend your `tUSDC`.
- **Buy Tickets:** Select your numbers and purchase tickets. Every 100 tickets will trigger a draw.
- **VRF Draw:** When the threshold is hit, the contract requests randomness from Gelato. The draw will happen automatically once Gelato fulfills the request.

## Verification

To verify the contract on Basescan (once a valid API key is set in `.env`):

```bash
npx hardhat verify --network baseSepolia 0x393A10cD71C45E1c8f15f31A8DEa9a6a50f38d7C \
  "0x5b1bEc4229a7a0e8ed6683cCEa7564178ED06B68" \
  "0xE67F620f864265bCFCBC298B07D29b20d4703D69" \
  "0x6Ceb9e4b3a3C83f0B3c3e3b97ff5A4a10C9cf388"
```

## Fixed Issues
- **Gelato Address:** Fixed an issue where the Gelato operator address was missing the last digit. The correct address is `0x6Ceb9e4b3a3C83f0B3c3e3b97ff5A4a10C9cf388`.
