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
        bebas:   ["Bebas Neue",        "sans-serif"],
        body:    ["'Plus Jakarta Sans'", "sans-serif"],
        jakarta: ["Plus Jakarta Sans", "sans-serif"],
      },
      colors: {
        navy:        "#06125C",
        "accent-blue": "#0D26C2",
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
        "edc-fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "edc-marquee-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)"    },
        },
        "anim-slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)"    },
        },
        "anim-slide-up-soft": {
          from: { opacity: "0", transform: "translateY(30px)" },
          to:   { opacity: "1", transform: "translateY(0)"    },
        },
        "anim-fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "anim-slide-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to:   { opacity: "1", transform: "translateY(0)"     },
        },
        "anim-shimmer": {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition:  "400px 0" },
        },
        "match-row-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)"   },
        },
        "dropdown-panel-in": {
          from: { maxHeight: "0",     opacity: "0" },
          to:   { maxHeight: "320px", opacity: "1" },
        },
        "dropdown-item-in": {
          from: { opacity: "0", transform: "translateY(5px)" },
          to:   { opacity: "1", transform: "translateY(0)"   },
        },
        "tab-spin": {
          to: { transform: "rotate(360deg)" },
        },
        "news-shimmer": {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)"  },
        },
        "digit-slot-in": {
          from: { transform: "translateY(-110%)", opacity: "0" },
          to:   { transform: "translateY(0%)",   opacity: "1" },
        },
        "digit-slot-out": {
          from: { transform: "translateY(0%)",    opacity: "1" },
          to:   { transform: "translateY(110%)", opacity: "0" },
        },
        "score-cell-swap": {
          from: { opacity: "0", transform: "scale(0.92)" },
          to:   { opacity: "1", transform: "scale(1)"    },
        },
      },
      animation: {
        "fade-in":        "fade-in 0.6s ease forwards",
        "fade-out":       "fade-out 0.6s ease forwards",
        "slide-up":       "slide-up 0.5s ease forwards",
        "slide-up-delay": "slide-up 0.5s ease 0.1s forwards",

        "edc-fade-in":      "edc-fade-in 0.4s ease forwards",
        "edc-marquee-up":   "edc-marquee-up 0.5s ease 900ms forwards",
        "anim-slide-up":    "anim-slide-up 600ms cubic-bezier(0.16,1,0.3,1) forwards",
        "anim-slide-up-soft": "anim-slide-up-soft 600ms cubic-bezier(0.22,1,0.36,1) forwards",
        "anim-fade-in":     "anim-fade-in 600ms cubic-bezier(0.16,1,0.3,1) forwards",
        "anim-shimmer":     "anim-shimmer 1.4s ease-in-out infinite",
        "match-row-in":     "match-row-in 0.28s ease forwards",
        "dropdown-panel-in": "dropdown-panel-in 0.22s ease-out forwards",
        "tab-spin":         "tab-spin 0.7s linear infinite",
        "news-shimmer":     "news-shimmer 1.6s ease-in-out infinite",
        "digit-slot-in":    "digit-slot-in 360ms cubic-bezier(0.4,0,0.2,1) forwards",
        "digit-slot-out":   "digit-slot-out 360ms cubic-bezier(0.4,0,0.2,1) forwards",
        "score-cell-swap":  "score-cell-swap 260ms ease forwards",
      },
    },
  },
  plugins: [],
};