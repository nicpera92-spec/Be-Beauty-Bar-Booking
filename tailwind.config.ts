import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#1e3a5f",
        "navy-light": "#2c5282",
        "elegant-grey": "#475569",
        "elegant-grey-deep": "#334155",
      },
      keyframes: {
        "home-bg-drift": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: "0.35" },
          "33%": { transform: "translate(2%, -1%) scale(1.02)", opacity: "0.45" },
          "66%": { transform: "translate(-1%, 2%) scale(0.98)", opacity: "0.3" },
        },
        "home-bg-gradient": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "home-bg-drift": "home-bg-drift 20s ease-in-out infinite",
        "home-bg-gradient": "home-bg-gradient 28s ease infinite",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
