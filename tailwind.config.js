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

