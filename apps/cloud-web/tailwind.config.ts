import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tf: {
          bg: "var(--tf-bg)",
          mid: "var(--tf-bg-mid)",
          surface: "var(--tf-surface)",
          border: "var(--tf-surface-border)",
          fg: "var(--tf-fg)",
          muted: "var(--tf-fg-muted)",
          subtle: "var(--tf-fg-subtle)",
          faint: "var(--tf-fg-faint)",
          accent: "var(--tf-accent)",
          "accent-soft": "var(--tf-accent-soft)",
          teal: "var(--tf-teal)",
          "teal-soft": "var(--tf-teal-soft)",
          violet: "var(--tf-violet)",
          "violet-soft": "var(--tf-violet-soft)",
        },
      },
      maxWidth: {
        content: "var(--tf-max)",
      },
      borderRadius: {
        tf: "var(--tf-radius)",
        "tf-lg": "var(--tf-radius-lg)",
      },
      fontFamily: {
        display: ["var(--font-sora)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
