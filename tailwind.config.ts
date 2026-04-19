import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: [
          "var(--font-display)",
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--destructive)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      backgroundImage: {
        "mesh-1":
          "radial-gradient(ellipse 90% 70% at 15% -15%, oklch(0.88 0.08 252 / 0.45), transparent 55%)",
        "mesh-2":
          "radial-gradient(ellipse 70% 55% at 85% 5%, oklch(0.9 0.06 285 / 0.35), transparent 50%)",
        "mesh-3":
          "radial-gradient(ellipse 60% 40% at 50% 105%, oklch(0.88 0.05 220 / 0.3), transparent 55%)",
        "mesh-4":
          "radial-gradient(ellipse 40% 30% at 70% 50%, oklch(0.92 0.04 200 / 0.2), transparent 60%)",
      },
      keyframes: {
        "mesh-drift": {
          "0%, 100%": { opacity: "1", transform: "scale(1) translate(0, 0)" },
          "33%": { opacity: "0.95", transform: "scale(1.02) translate(1%, -1%)" },
          "66%": { opacity: "0.98", transform: "scale(0.99) translate(-1%, 0.5%)" },
        },
      },
      animation: {
        "mesh-drift": "mesh-drift 28s ease-in-out infinite",
      },
      boxShadow: {
        glass: "0 8px 32px oklch(0.2 0.04 260 / 0.08), inset 0 1px 0 oklch(1 0 0 / 0.45)",
        "glass-sm":
          "0 4px 24px oklch(0.2 0.04 260 / 0.06), inset 0 1px 0 oklch(1 0 0 / 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
