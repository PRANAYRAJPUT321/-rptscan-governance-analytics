import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        pop: { "0%": { opacity: "0", transform: "scale(.97) translateY(-6px)" }, "100%": { opacity: "1", transform: "none" } },
        fadeUp: { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "none" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        pulseRing: { "0%": { transform: "scale(.8)", opacity: ".7" }, "100%": { transform: "scale(2.2)", opacity: "0" } },
        dash: { to: { strokeDashoffset: "0" } },
      },
      animation: {
        pop: "pop .18s ease-out",
        "fade-up": "fadeUp .6s cubic-bezier(.2,.7,.2,1) both",
        shimmer: "shimmer 2.2s linear infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-ring": "pulseRing 1.8s cubic-bezier(.2,.6,.4,1) infinite",
        dash: "dash 1.6s ease-out forwards",
      },
      colors: {
        ink: { 950: "#070b14", 900: "#0b1120", 850: "#0f172a", 800: "#141d33", 700: "#1e293b" },
        brand: { 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb" },
      },
    },
  },
  plugins: [],
} satisfies Config;
