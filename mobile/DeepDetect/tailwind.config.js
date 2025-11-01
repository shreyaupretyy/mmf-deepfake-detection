/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        surface: {
          base: "#F8FAFC",
          card: "#FFFFFF",
        },
        ink: {
          dark: "#0F172A",
          DEFAULT: "#1E293B",
          secondary: "#475569",
          muted: "#94A3B8",
          faint: "#CBD5E1",
        },
        line: {
          DEFAULT: "#E2E8F0",
          subtle: "#F1F5F9",
        },
        brand: {
          DEFAULT: "#6366F1",
          dark: "#4F46E5",
          light: "#818CF8",
          surface: "#EEF2FF",
        },
      },
    },
  },
  plugins: [],
};
