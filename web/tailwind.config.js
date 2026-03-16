/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Bebas Neue'", "sans-serif"],
        body:    ["'Plus Jakarta Sans'", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%":   { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in":        "fade-in 0.6s ease forwards",
        "fade-out":       "fade-out 0.6s ease forwards",
        "slide-up":       "slide-up 0.5s ease forwards",
        "slide-up-delay": "slide-up 0.5s ease 0.1s forwards",
      },
    },
  },
  plugins: [],
};