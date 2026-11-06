import type { Config } from "tailwindcss";

/** A colour that the midnight design can repaint; the fallback is Tailwind's own value. */
const themeable = (name: string, fallbackRgb: string) => `rgb(var(--c-${name}, ${fallbackRgb}) / <alpha-value>)`;

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
          100: themeable("slate-100", "241 245 249"),
          200: themeable("slate-200", "226 232 240"),
          300: themeable("slate-300", "203 213 225"),
          400: "rgb(var(--theme-text-muted-rgb, 148 163 184) / <alpha-value>)",
          500: "rgb(var(--theme-text-muted-rgb, 100 116 139) / <alpha-value>)",
          600: "rgb(var(--theme-text-muted-rgb, 71 85 105) / <alpha-value>)",
          700: "rgb(var(--theme-text-rgb, 51 65 85) / <alpha-value>)",
          800: "rgb(var(--theme-text-rgb, 30 41 59) / <alpha-value>)",
          900: "rgb(var(--theme-text-rgb, 15 23 42) / <alpha-value>)",
        },
        gray: {
          50: themeable("gray-50", "249 250 251"),
          200: themeable("gray-200", "229 231 235"),
        },
        emerald: {
          50: themeable("emerald-50", "236 253 245"),
          100: themeable("emerald-100", "209 250 229"),
          200: themeable("emerald-200", "167 243 208"),
          300: themeable("emerald-300", "110 231 183"),
          600: themeable("emerald-600", "5 150 105"),
          700: themeable("emerald-700", "4 120 87"),
          800: themeable("emerald-800", "6 95 70"),
          900: themeable("emerald-900", "6 78 59"),
        },
        green: {
          50: themeable("green-50", "240 253 244"),
          100: themeable("green-100", "220 252 231"),
          200: themeable("green-200", "187 247 208"),
          600: themeable("green-600", "22 163 74"),
          700: themeable("green-700", "21 128 61"),
          800: themeable("green-800", "22 101 52"),
          900: themeable("green-900", "20 83 45"),
        },
        red: {
          50: themeable("red-50", "254 242 242"),
          100: themeable("red-100", "254 226 226"),
          200: themeable("red-200", "254 202 202"),
          300: themeable("red-300", "252 165 165"),
          400: themeable("red-400", "248 113 113"),
          500: themeable("red-500", "239 68 68"),
          600: themeable("red-600", "220 38 38"),
          700: themeable("red-700", "185 28 28"),
          800: themeable("red-800", "153 27 27"),
          900: themeable("red-900", "127 29 29"),
        },
        amber: {
          50: themeable("amber-50", "255 251 235"),
          100: themeable("amber-100", "254 243 199"),
          200: themeable("amber-200", "253 230 138"),
          600: themeable("amber-600", "217 119 6"),
          700: themeable("amber-700", "180 83 9"),
          800: themeable("amber-800", "146 64 14"),
          900: themeable("amber-900", "120 53 15"),
        },
        violet: {
          50: themeable("violet-50", "245 243 255"),
          200: themeable("violet-200", "221 214 254"),
          600: themeable("violet-600", "124 58 237"),
          700: themeable("violet-700", "109 40 217"),
          900: themeable("violet-900", "76 29 149"),
        },
        sky: {
          50: themeable("sky-50", "240 249 255"),
          200: themeable("sky-200", "186 230 253"),
          400: themeable("sky-400", "56 189 248"),
          600: themeable("sky-600", "2 132 199"),
          700: themeable("sky-700", "3 105 161"),
          800: themeable("sky-800", "7 89 133"),
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
