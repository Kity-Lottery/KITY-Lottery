"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/play", label: "Play" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/community", label: "Community" },
];

export function NavLinks() {
  const path = usePathname();

  return (
    <nav className="hidden sm:flex items-center gap-1">
      {LINKS.map(({ href, label }) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            className="relative px-3 py-1.5 text-xs lg:px-4 lg:py-2 lg:text-sm font-semibold rounded-lg transition-colors"
            style={{
              color: active ? "#c4b5fd" : "rgba(165,148,255,0.45)",
              background: active ? "rgba(124,92,255,0.15)" : "transparent",
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
