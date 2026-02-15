import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101727",
        fog: "#f4f6fb",
        primary: "#0958d9",
        accent: "#ff6b35"
      }
    }
  },
  plugins: []
} satisfies Config;
