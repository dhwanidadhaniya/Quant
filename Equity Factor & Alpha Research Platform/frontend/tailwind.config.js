/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Fraunces", "Source Serif 4", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "Source Sans 3", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ivory: "#F6F1E8",
        paper: "#FBF7F0",
        mist: "#E4DFD4",
        ink: "#1B2430",
        mute: "#5B6572",
        teal: "#1E6E63",
        violet: "#534178",
        navy: "#101A28",
        up: "#1F7A4D",
        down: "#B42318",
      },
      boxShadow: {
        glass: "0 10px 40px rgba(28, 36, 48, 0.08)",
      },
    },
  },
  plugins: [],
};
