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
        navy: "var(--navy, #1e3a5f)",
        "navy-light": "var(--navy-light, #2c5282)",
        "theme-link": "var(--theme-link, var(--navy-light, #2c5282))",
        charcoal: "rgb(var(--theme-text-rgb, 30 58 95) / <alpha-value>)",
        "elegant-grey": "rgb(var(--theme-text-muted-rgb, 71 85 105) / <alpha-value>)",
        "elegant-grey-deep": "rgb(var(--theme-text-rgb, 30 58 95) / <alpha-value>)",
        slate: {
          50: "rgb(var(--theme-bg-rgb, 248 250 252) / <alpha-value>)",
          400: "rgb(var(--theme-text-muted-rgb, 148 163 184) / <alpha-value>)",
          500: "rgb(var(--theme-text-muted-rgb, 100 116 139) / <alpha-value>)",
          600: "rgb(var(--theme-text-muted-rgb, 71 85 105) / <alpha-value>)",
          700: "rgb(var(--theme-text-rgb, 51 65 85) / <alpha-value>)",
          800: "rgb(var(--theme-text-rgb, 30 41 59) / <alpha-value>)",
          900: "rgb(var(--theme-text-rgb, 15 23 42) / <alpha-value>)",
        },
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
