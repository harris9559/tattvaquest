import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#050509",
        surface: "#0B0B11",
        surfaceMuted: "#13131B",
        accent: "#38BDF8",
        accentSoft: "#0F172A",
        borderSubtle: "#1F2933",
        textPrimary: "#F9FAFB",
        textMuted: "#9CA3AF",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 18px 45px rgba(15,23,42,0.55)",
      },
      borderRadius: {
        xl: "1.25rem",
      },
      maxWidth: {
        content: "1120px",
      },
    },
  },
  plugins: [],
};

export default config;
