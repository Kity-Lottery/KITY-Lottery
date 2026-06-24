"use client";

import { useEffect, useRef } from "react";

/**
 * ParticleField — a dependency-free canvas "energy field".
 * Particles drift in a lazy galactic swirl, link into a neural-net constellation,
 * and bend around the pointer like a gravity well. Additive blending gives the
 * neon bloom. Pauses when offscreen / tab hidden; renders one static frame under
 * prefers-reduced-motion.
 */
type RGB = [number, number, number];

const PALETTE: { color: RGB; weight: number }[] = [
  { color: [124, 92, 255], weight: 0.5 }, // violet
  { color: [0, 212, 255], weight: 0.32 }, // cyan
  { color: [167, 139, 250], weight: 0.12 }, // light violet
  { color: [245, 158, 11], weight: 0.06 }, // amber spark
];

function pickColor(): RGB {
  let r = Math.random();
  for (const p of PALETTE) {
    if (r < p.weight) return p.color;
    r -= p.weight;
  }
  return PALETTE[0].color;
}

function makeSprite(color: RGB): HTMLCanvasElement {
  const s = 36;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  const [r, gr, b] = color;
  g.addColorStop(0, `rgba(${r},${gr},${b},0.9)`);
  g.addColorStop(0.25, `rgba(${r},${gr},${b},0.5)`);
  g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return c;
}

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: RGB;
  sprite: HTMLCanvasElement;
}

export function ParticleField({
  className = "",
  density = 1,
  interactive = true,
}: {
  className?: string;
  density?: number;
  interactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const sprites = new Map<string, HTMLCanvasElement>();
    const spriteFor = (c: RGB) => {
      const key = c.join(",");
      let s = sprites.get(key);
      if (!s) {
        s = makeSprite(c);
        sprites.set(key, s);
      }
      return s;
    };

    let W = 0,
      H = 0,
      dpr = 1;
    let particles: P[] = [];
    let cx = 0,
      cy = 0;

    const pointer = { x: 0, y: 0, active: false, influence: 0 };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2;
      cy = H * 0.42;

      const area = W * H;
      const base = Math.round((area / 14000) * density);
      const count = Math.max(28, Math.min(window.innerWidth < 640 ? 70 : 150, base));

      particles = Array.from({ length: count }, () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.pow(Math.random(), 0.6) * Math.min(W, H) * 0.55;
        const color = pickColor();
        return {
          x: cx + Math.cos(ang) * rad,
          y: cy + Math.sin(ang) * rad,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: 0.8 + Math.random() * 1.8,
          color,
          sprite: spriteFor(color),
        };
      });
    };

    const LINK = 118; // px connection distance
    const LINK2 = LINK * LINK;

    const step = (animate: boolean) => {
      ctx.clearRect(0, 0, W, H);

      // central core glow
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.5);
      core.addColorStop(0, "rgba(124,92,255,0.18)");
      core.addColorStop(0.5, "rgba(80,60,200,0.06)");
      core.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, W, H);

      if (animate) {
        if (pointer.active) pointer.influence = Math.min(1, pointer.influence + 0.06);
        else pointer.influence = Math.max(0, pointer.influence - 0.04);

        for (const p of particles) {
          // swirl: weak centripetal pull + tangential push around center
          const dx = cx - p.x;
          const dy = cy - p.y;
          const d = Math.hypot(dx, dy) || 1;
          const nx = dx / d;
          const ny = dy / d;
          p.vx += nx * 0.0009 * d * 0.012; // gentle bind toward center
          p.vy += ny * 0.0009 * d * 0.012;
          p.vx += -ny * 0.014; // tangential → rotation
          p.vy += nx * 0.014;

          // pointer gravity well (repel for interactive "parting" feel)
          if (interactive && pointer.influence > 0.001) {
            const mdx = p.x - pointer.x;
            const mdy = p.y - pointer.y;
            const md2 = mdx * mdx + mdy * mdy;
            const R = 150;
            if (md2 < R * R) {
              const md = Math.sqrt(md2) || 1;
              const f = (1 - md / R) * pointer.influence * 1.4;
              p.vx += (mdx / md) * f;
              p.vy += (mdy / md) * f;
            }
          }

          p.vx *= 0.94;
          p.vy *= 0.94;
          p.x += p.vx;
          p.y += p.vy;

          // soft wrap so the field never empties at edges
          const m = 40;
          if (p.x < -m) p.x = W + m;
          else if (p.x > W + m) p.x = -m;
          if (p.y < -m) p.y = H + m;
          else if (p.y > H + m) p.y = -m;
        }
      }

      // connections (additive)
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK2) {
            const alpha = (1 - d2 / LINK2) * 0.16;
            ctx.strokeStyle = `rgba(140,120,255,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // particles (additive glow sprite + crisp core)
      for (const p of particles) {
        const size = p.r * 7;
        ctx.drawImage(p.sprite, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalCompositeOperation = "source-over";
      for (const p of particles) {
        const [r, g, b] = p.color;
        ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let raf = 0;
    let running = false;
    const loop = () => {
      step(true);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduce) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };

    const ro = new ResizeObserver(() => {
      build();
      step(false);
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0.01 }
    );
    io.observe(canvas);

    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVis);
    if (interactive) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerleave", onPointerLeave);
    }

    build();
    step(false);
    if (!reduce) start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [density, interactive]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
