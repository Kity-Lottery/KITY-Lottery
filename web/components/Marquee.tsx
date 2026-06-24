"use client";

import type { ReactNode } from "react";

/**
 * Marquee — seamless infinite horizontal scroll. Children are duplicated once so
 * the -50% keyframe loops without a visible seam. Edge-masked via `.marquee-mask`.
 */
export function Marquee({
  children,
  duration = 32,
  className = "",
}: {
  children: ReactNode;
  duration?: number;
  className?: string;
}) {
  return (
    <div className={`marquee-mask overflow-hidden ${className}`}>
      <div className="marquee" style={{ ["--marquee-dur" as string]: `${duration}s` }}>
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
