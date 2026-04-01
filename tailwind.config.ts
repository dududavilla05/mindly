import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mindly: {
          50:  "#f5f0ff",
          100: "#ede0ff",
          200: "#dbc5ff",
          300: "#c39dff",
          400: "#a66aff",
          500: "#8b3dff",
          600: "#7c1fff",
          700: "#6b0fe0",
          800: "#5a0eb8",
          900: "#4a0e96",
          950: "#2d0566",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "shimmer": "shimmer 1.5s infinite",
        "float": "float 3s ease-in-out infinite",
        "float-alt": "floatAlt 4.5s ease-in-out infinite",
        "float-slow": "float 5.5s ease-in-out infinite",
        "pulse-ring": "pulseRing 2s ease-in-out infinite",
        "bounce-dot": "bounceDot 1.4s ease-in-out infinite",
        "lesson-enter": "lessonEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) scale(1)", opacity: "0.5" },
          "50%": { transform: "translateY(-18px) scale(1.08)", opacity: "0.9" },
        },
        floatAlt: {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)", opacity: "0.35" },
          "33%": { transform: "translateY(-12px) translateX(10px)", opacity: "0.75" },
          "66%": { transform: "translateY(-6px) translateX(-8px)", opacity: "0.55" },
        },
        pulseRing: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.7" },
          "50%": { transform: "scale(1.2)", opacity: "0.15" },
        },
        bounceDot: {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        lessonEnter: {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
