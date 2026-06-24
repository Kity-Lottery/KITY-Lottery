import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#050816",
          900: "#0a0e27",
          800: "#0f1535",
          700: "#161d44",
          600: "#1e2754",
          500: "#283265",
        },
        accent: {
          DEFAULT: "#7c5cff",
          hover:   "#6b4aff",
          soft:    "#a594ff",
          glow:    "#5b3dde",
        },
        cyan: { DEFAULT: "#00d4ff", soft: "#67e8f9" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "glow-violet": "radial-gradient(ellipse at center, rgba(124,92,255,0.15) 0%, transparent 70%)",
        "glow-cyan":   "radial-gradient(ellipse at center, rgba(0,212,255,0.12) 0%, transparent 70%)",
      },
      animation: {
        "ball-pop":      "ball-pop 0.35s cubic-bezier(0.16,1,0.3,1)",
        "float":         "float-y 3s ease-in-out infinite",
        "gradient-flow": "gradient-flow 4s ease infinite",
        "shimmer":       "shimmer 2.5s ease-in-out infinite",
        "orb-1":         "orb-drift-1 18s ease-in-out infinite",
        "orb-2":         "orb-drift-2 22s ease-in-out infinite",
        "orb-3":         "orb-drift-3 25s ease-in-out infinite",
        "glow-pulse":    "glow-ring-pulse 1.5s ease-in-out infinite",
        "mega-pulse":    "mega-pulse 1.5s ease-out infinite",
        "count-up":      "count-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
      },
      keyframes: {
        "float-y": {
          "0%,100%": { transform: "translateY(0px)" },
          "50%":     { transform: "translateY(-8px)" },
        },
        "gradient-flow": {
          "0%,100%": { "background-position": "0% 50%" },
          "50%":     { "background-position": "100% 50%" },
        },
        "shimmer": {
          "0%":   { "background-position": "-200% center" },
          "100%": { "background-position": "200% center" },
        },
        "ball-pop": {
          "0%":   { transform: "scale(1)" },
          "35%":  { transform: "scale(1.35)" },
          "65%":  { transform: "scale(0.88)" },
          "82%":  { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
        "glow-ring-pulse": {
          "0%,100%": { "box-shadow": "0 0 12px 2px rgba(124,92,255,0.4)" },
          "50%":     { "box-shadow": "0 0 28px 6px rgba(124,92,255,0.7)" },
        },
        "mega-pulse": {
          "0%,100%": { "box-shadow": "0 0 0 0 rgba(124,92,255,0.4)" },
          "50%":     { "box-shadow": "0 0 0 12px rgba(124,92,255,0)" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
