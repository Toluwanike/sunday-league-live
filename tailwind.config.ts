import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

// ─── Tailwind Configuration ───────────────────────────────────────────────────
// This file tells Tailwind:
//   1. Which files to scan for class names (content)
//   2. What fonts, colours, and spacing to use (theme)
//   3. Which plugins to load

export default {
  // darkMode: "class" means dark mode is toggled by adding a "dark" class
  // to the <html> element — not by the OS setting
  darkMode: ["class"],

  // content: tells Tailwind which files to scan for class names
  // Any class used in these files will be included in the final CSS bundle
  // Unused classes are automatically removed (this keeps the CSS file small)
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],

  // prefix: "" means no prefix on utility classes
  // e.g. if prefix was "tw-" you'd write tw-flex instead of flex
  prefix: "",

  theme: {
    // container: controls the max width and padding of the .container class
    container: {
      center: true,       // centers the container horizontally
      padding: "1rem",    // adds 1rem padding on left and right
      screens: {
        "2xl": "1400px",  // max width on very large screens
      },
    },

    extend: {
      // ── Fonts ────────────────────────────────────────────────────────────
      // These replace the default Tailwind fonts
      // font-sans = body text (Barlow)
      // font-display = headings (Bebas Neue — bold condensed street feel)
      // font-condensed = subheadings and labels (Barlow Condensed)
      // font-mono = scores and numbers (Share Tech Mono — scoreboard feel)
      fontFamily: {
        sans: ["Barlow", "system-ui", "sans-serif"],
        display: ["Bebas Neue", "Barlow Condensed", "sans-serif"],
        condensed: ["Barlow Condensed", "sans-serif"],
        mono: ["Share Tech Mono", "monospace"],
      },

      // ── Colours ──────────────────────────────────────────────────────────
      // All colours reference CSS variables defined in index.css
      // This means changing a variable in CSS automatically updates all Tailwind classes
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Primary = pitch green (main brand colour)
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },

        // Secondary = dark surface for less prominent elements
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },

        // Destructive = red — errors, red cards
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        // Muted = very subtle backgrounds and grey text
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },

        // Accent = amber/orange — secondary highlights
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },

        // Popover = dropdowns and tooltip backgrounds
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },

        // Card = card backgrounds
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Custom project-specific colours
        pitch: "hsl(var(--pitch-green))",         // use as bg-pitch or text-pitch
        "pitch-dim": "hsl(var(--pitch-green-dim))", // darker pitch green
        warning: "hsl(var(--warning))",            // yellow card colour
        live: "hsl(var(--live-pulse))",            // live match red

        // Sidebar colours — for the navigation sidebar if used
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },

      // ── Border radius ─────────────────────────────────────────────────────
      // Slightly sharper than default — feels more utilitarian and less "app-like"
      borderRadius: {
        lg: "var(--radius)",                    // 0.5rem
        md: "calc(var(--radius) - 2px)",        // slightly smaller
        sm: "calc(var(--radius) - 4px)",        // smallest
      },

      // ── Keyframe animations ───────────────────────────────────────────────
      // These power Radix UI's accordion open/close animations
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },

      // ── Animation shortcuts ───────────────────────────────────────────────
      // Use these as className="animate-accordion-down" etc.
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },

  // ── Plugins ──────────────────────────────────────────────────────────────────
  // tailwindcss-animate adds animation utility classes used by shadcn/ui components
  plugins: [tailwindAnimate],
} satisfies Config;