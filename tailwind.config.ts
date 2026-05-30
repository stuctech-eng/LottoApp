import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0d1b2a",
          mid: "#1a2f45",
          light: "#243b55",
        },
        accent: {
          DEFAULT: "#4a9eff",
          soft: "#1e3a5f",
        },
        gold: {
          DEFAULT: "#f0c060",
          soft: "#2a2010",
        },
        surface: {
          DEFAULT: "#132233",
          2: "#0f1e2e",
        },
        success: {
          DEFAULT: "#34c97a",
          soft: "#0d2a1a",
        },
        warning: {
          DEFAULT: "#ffaa33",
          soft: "#2a1c00",
        },
        error: {
          DEFAULT: "#ff5a5a",
          soft: "#2a0d0d",
        },
        muted: "#7a9ab8",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        serif: ["DM Serif Display", "serif"],
      },
      borderColor: {
        DEFAULT: "rgba(74,158,255,0.13)",
      },
    },
  },
  plugins: [],
};
export default config;
