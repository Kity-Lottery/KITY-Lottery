"use client";

import { useEffect, useRef, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { shortAddress } from "@/lib/format";
import { SUPPORTED_CHAIN_IDS, DEFAULT_CHAIN_ID } from "@/lib/contracts";

const CHAIN_NAMES: Record<number, string> = {
  8453: "Base",
  84532: "Base Sepolia",
};

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const wrongChain =
    isConnected && !SUPPORTED_CHAIN_IDS.includes(chainId as 8453 | 84532);

  // Resolve the env default to a supported literal chain id for switchChain.
  const targetChainId: 8453 | 84532 = SUPPORTED_CHAIN_IDS.includes(
    DEFAULT_CHAIN_ID as 8453 | 84532,
  )
    ? (DEFAULT_CHAIN_ID as 8453 | 84532)
    : baseSepolia.id;

  if (!isConnected) {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          className="btn btn-primary px-3 py-2"
          onClick={() => setOpen((v) => !v)}
          disabled={isPending}
        >
          {isPending ? "Connecting…" : "Connect wallet"}
        </button>
        {open && (
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-white/10 bg-navy-800 p-2 shadow-2xl">
            {connectors.map((c) => (
              <button
                key={c.uid}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-indigo-100 hover:bg-white/5"
                onClick={() => {
                  connect({ connector: c });
                  setOpen(false);
                }}
              >
                {c.name}
              </button>
            ))}
            {connectors.length === 0 && (
              <p className="px-3 py-2 text-xs text-indigo-300/60">
                No wallet detected. Install a browser wallet or Coinbase Wallet.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      {wrongChain ? (
        <button
          type="button"
          className="btn px-3 py-2 bg-amber-500/90 text-amber-950 hover:bg-amber-400"
          onClick={() => switchChain({ chainId: targetChainId })}
        >
          Wrong network — switch
        </button>
      ) : (
        <span className="hidden rounded-lg border border-white/10 bg-navy-800 px-2.5 py-2 text-xs text-indigo-200 sm:inline">
          {CHAIN_NAMES[chainId] ?? `Chain ${chainId}`}
        </span>
      )}
      <button
        type="button"
        className="btn btn-secondary px-3 py-2"
        onClick={() => setOpen((v) => !v)}
      >
        {shortAddress(address)}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-white/10 bg-navy-800 p-2 shadow-2xl">
          <div className="px-3 py-2 text-xs text-indigo-300/60">
            Connected to {CHAIN_NAMES[chainId] ?? `chain ${chainId}`}
          </div>
          {[base, baseSepolia].map((c) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-indigo-100 hover:bg-white/5"
              onClick={() => {
                switchChain({ chainId: c.id });
                setOpen(false);
              }}
            >
              <span>{CHAIN_NAMES[c.id]}</span>
              {chainId === c.id && <span className="text-accent-soft">●</span>}
            </button>
          ))}
          <button
            type="button"
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-white/5"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
