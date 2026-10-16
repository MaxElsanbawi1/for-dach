/** @type {import('tailwindcss').Config} */
const acitColors = {
  gold: "rgb(var(--acit-gold-rgb) / <alpha-value>)",
};

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--acit-gold-rgb) / <alpha-value>)",
        secondary: "rgb(var(--acit-gold-rgb) / <alpha-value>)",
        acit: acitColors,
      },
      fontFamily: {
        sans: ["IBM Plex Sans Arabic", "sans-serif"],
      },
    },
  },
  plugins: [],
};
