/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#050505",
        panel: "#0F1115",
        line: "#1E1E1E",
        ink: "#E6E6E6",
        muted: "#8A8F98",
        accent: "#FFA53B",
        warn: "#E5484D",
        good: "#3DDC97",
        partial: "#F5C542",
        cand: "#3EA6FF",
        space: {
          950: "#05070c",
          900: "#090d16",
          850: "#0e1320",
          800: "#141b2d",
          700: "#1e293b",
          600: "#334155",
        },
        lunar: {
          cyan: "#38bdf8",
          glow: "rgba(56, 189, 248, 0.15)",
        },
        martian: {
          amber: "#f97316",
          glow: "rgba(249, 115, 22, 0.15)",
        },
        analog: {
          emerald: "#10b981",
          gold: "#eab308",
        }
      },
      fontFamily: {
        display: ["Space Grotesk", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace"
        ],
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(56, 189, 248, 0.25)",
        "glow-mars": "0 0 25px -5px rgba(249, 115, 22, 0.25)",
      }
    },
  },
  plugins: [],
};

