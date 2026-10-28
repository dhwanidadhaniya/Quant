/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#050308",
        charcoal: "#121018",
        ink: "#0b0910",
        pink: { DEFAULT: "#ff2d95", dim: "#ff2d9533" },
        magenta: "#e100ff",
        fuchsia: "#ff4ecd",
        violet: "#9b5cff",
        cyan: "#3dfff3",
        mist: "#ece8f0",
        mute: "#8b8296",
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(255, 45, 149, 0.12)",
        cyan: "0 0 24px rgba(61, 255, 243, 0.12)",
      },
    },
  },
  plugins: [],
};
