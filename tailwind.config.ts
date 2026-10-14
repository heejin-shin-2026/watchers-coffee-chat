/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1B2A4A",
        navy2: "#24365E",
        brand: "#2563EB",
        branddark: "#1D4ED8",
        ink: "#1A202C",
        muted: "#64748B",
        softblue: "#EEF4FF",
        cream: "#FDF3D8",
      },
    },
  },
  plugins: [],
};
