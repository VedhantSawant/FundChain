/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#14532D",       // Deep green
          primary: "#16A34A",    // Emerald green
          light: "#DCFCE7",     // Light tint
          accent: "#D4A017",    // Soft gold
          bg: "#F8FAF7",        // Off-white
          card: "#FFFFFF",      // Pure white
          text: "#1F2937",      // Charcoal
          muted: "#6B7280",     // Muted gray
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(20, 83, 45, 0.08)",
        hover: "0 10px 25px -3px rgba(20, 83, 45, 0.14)",
      },
    },
  },
  plugins: [],
};
