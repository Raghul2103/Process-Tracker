/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        card: "0 8px 24px rgba(15, 23, 42, 0.08)"
      },
      keyframes: {
        homeOrbPulse: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.35" },
          "50%": { transform: "scale(1.12)", opacity: "0.55" }
        },
        homeOrbDrift: {
          "0%": { transform: "translate(0, 0)" },
          "100%": { transform: "translate(-3%, 4%)" }
        },
        homeShimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" }
        }
      },
      animation: {
        homeOrbPulse: "homeOrbPulse 14s ease-in-out infinite",
        homeOrbDrift: "homeOrbDrift 20s ease-in-out infinite alternate",
        homeShimmer: "homeShimmer 18s ease-in-out infinite alternate"
      }
    }
  },
  plugins: []
};
