import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F5F5DC",
        primary: "#2A1503",
        secondary: "#66350F",
        secondaryHover: "#4a260a",
        card: "#C2B280",
        accent: "#E8D8C4",
        shield: "#1cb0f6",
        danger: "#962d2d",
      },
      keyframes: {
        rotateLeft: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        rotateRight: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(-360deg)" },
        },
        flowerSpin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        rotateLeft: "rotateLeft 60s linear infinite",
        rotateRight: "rotateRight 90s linear infinite",
        flowerSpin: "flowerSpin 220s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
