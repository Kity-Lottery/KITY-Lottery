"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectButton } from "@/components/ConnectButton";

const LINKS = [
  { href: "/play", label: "Play" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/community", label: "Community" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  // lock scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // close on route change
  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-indigo-100 transition-colors hover:bg-white/10"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70] flex flex-col bg-[#050816]/90 backdrop-blur-2xl"
          >
            {/* drawer header */}
            <div className="flex items-center justify-between px-4 py-4">
              <span className="gradient-text text-2xl font-black tracking-tight">KITY</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-indigo-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* links */}
            <nav className="flex flex-1 flex-col justify-center gap-2 px-6">
              {LINKS.map((l, i) => {
                const active = path === l.href;
                return (
                  <motion.div
                    key={l.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block py-3 text-4xl font-black tracking-tight transition-colors"
                      style={{ color: active ? "#c4b5fd" : "rgba(238,240,255,0.92)" }}
                    >
                      {l.label}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* footer: connect + CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3 px-6 pb-10"
            >
              <Link href="/play" onClick={() => setOpen(false)} className="btn-cta w-full">
                Enter the draw
                <span aria-hidden>→</span>
              </Link>
              <div className="flex justify-center pt-1">
                <ConnectButton />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
