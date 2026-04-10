import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#075E54",
          foreground: "#ffffff",
          light: "#128C7E",
        },
        secondary: {
          DEFAULT: "#128C7E",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#25D366",
          foreground: "#111B21",
        },
        whatsapp: {
          teal: "#075E54",
          tealLight: "#128C7E",
          green: "#25D366",
          blue: "#34B7F1",
          light: "#F0F2F5",
          dark: "#111B21",
          darkLighter: "#202C33",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        'whatsapp-pattern': "url('https://w0.peakpx.com/wallpaper/580/650/HD-wallpaper-whatsapp-background-dark-background-whatsapp-patterns-background-thumbnail.jpg')",
      }
    },
  },
  plugins: [],
};
export default config;
