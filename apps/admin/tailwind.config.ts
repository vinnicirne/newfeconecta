import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./shared/**/*.{js,ts,jsx,tsx,mdx}",
    "./domains/**/*.{js,ts,jsx,tsx,mdx}",
    "../../apps/admin/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../apps/admin/components/**/*.{js,ts,jsx,tsx,mdx}",
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
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          active: "hsl(var(--primary-active))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
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
          chatLight: "#EFEAE2",
          dark: "#000000",
          darkLighter: "#1C1C1C",
          darkMid: "#121212",
        },
        santuario: {
          bg: "#FAFAFA",
          card: "#FDFBF7",
          gold: "#D4AF37",
          goldLight: "#F3E5AB",
          earth: "#8B5A2B",
          earthDark: "#5C4033",
          ink: "#2C2C2C",
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
      fontFamily: {
        headline: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Manrope", "sans-serif"],
        santuario: ["Lora", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
      },
      boxShadow: {
        'premium': '0 20px 50px -12px rgba(0, 0, 0, 0.05)',
        'whatsapp': '0 1px 0.5px rgba(0,0,0,0.13)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      backgroundImage: {
        'whatsapp-pattern': "url('https://w0.peakpx.com/wallpaper/580/650/HD-wallpaper-whatsapp-background-dark-background-whatsapp-patterns-background-thumbnail.jpg')",
        'premium-gradient': 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)',
      }
    },
  },
  plugins: [],
};
export default config;
