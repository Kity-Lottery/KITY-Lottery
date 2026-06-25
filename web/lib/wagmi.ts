import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

// WalletConnect project id — a PUBLIC client identifier (shipped in the browser
// bundle). Env var overrides; falls back to the project's id so WalletConnect
// works without extra Vercel config.
const wcProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "1e5c117f7ffe5e756791926d8f0a3ea9";

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),                                              // MetaMask, Rabby, etc.
    coinbaseWallet({ appName: "KITY", preference: "all" }), // Coinbase Wallet + Smart Wallet
    walletConnect({                                          // WalletConnect — QR + mobile wallets
      projectId: wcProjectId,
      metadata: {
        name: "KITY",
        description: "On-chain Pick-4 lottery on Base",
        url: "https://kity-lottery.vercel.app",
        icons: [],
      },
    }),
  ],
  ssr: true,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
