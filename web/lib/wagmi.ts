import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),                                              // MetaMask, Rabby, etc.
    coinbaseWallet({ appName: "KITY", preference: "all" }), // Coinbase Wallet + Smart Wallet
    ...(wcProjectId                                          // WalletConnect (optional — set env var)
      ? [walletConnect({ projectId: wcProjectId })]
      : []),
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
