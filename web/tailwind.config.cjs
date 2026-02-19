module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Space Grotesk", "sans-serif"]
      },
      colors: {
        ink: "#0f172a",
        ember: "#f97316",
        tide: "#06b6d4",
        lime: "#84cc16"
      }
    }
  },
  plugins: []
};
