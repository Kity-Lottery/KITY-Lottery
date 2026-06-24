import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectButton } from "@/components/ConnectButton";
import { AuroraBackground } from "@/components/AuroraBackground";
import { NavLinks } from "@/components/NavLinks";
import { MobileMenu } from "@/components/MobileMenu";

export const metadata: Metadata = {
  title: "KITY — The fairest lottery on-chain",
  description:
    "Pick-4 lottery on Base. A Pyth Entropy draw fires every 24 hours — even with a single ticket in the pot. Pick digits 0–9 plus a KITY letter — K, I, T or Y; jackpot odds a flat 1 in 40,000. No winner? It rolls into the next draw. $2 a ticket, zero house edge on the randomness.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050816",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans overflow-x-hidden">
        <Providers>
          {/* Ambient field behind everything */}
          <AuroraBackground />

          {/* Sticky translucent nav — full width */}
          <header className="sticky top-0 z-50">
            <div className="absolute inset-0 -z-10 border-b border-white/5 bg-[#050816]/55 backdrop-blur-xl" />
            <div className="mx-auto flex max-w-6xl xl:max-w-7xl items-center justify-between gap-3 px-4 py-4 lg:px-8 lg:py-5">
              <a href="/" className="group flex shrink-0 items-center gap-3">
                <div
                  className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-2xl text-lg font-black text-white"
                  style={{
                    background: "linear-gradient(135deg, #7c5cff 0%, #3b1fa8 50%, #00d4ff 100%)",
                    boxShadow: "0 0 20px rgba(124,92,255,0.5), 0 4px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  <span
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)",
                    }}
                  />
                  <span className="logo-animated relative z-10">K</span>
                </div>
                <div className="flex flex-col">
                  <span className="gradient-text text-2xl font-black leading-none tracking-tight">
                    KITY
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-indigo-300/50">
                    On-chain Lottery
                  </span>
                </div>
              </a>

              <NavLinks />

              <div className="hidden sm:block">
                <ConnectButton />
              </div>
              <MobileMenu />
            </div>
          </header>

          {/* Page column */}
          <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 lg:max-w-6xl lg:px-8 xl:max-w-7xl">
            <main className="flex-1 pb-16 pt-6">{children}</main>

            <footer className="border-t border-white/5 py-8 text-center text-xs text-indigo-300/30 space-y-1 lg:mx-auto lg:max-w-2xl">
              <div>Powered by Pyth Entropy · Built on Base · Open source</div>
              <div className="text-indigo-300/20">
                A verifiable on-chain draw fires every 24 hours — even with one ticket in
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
