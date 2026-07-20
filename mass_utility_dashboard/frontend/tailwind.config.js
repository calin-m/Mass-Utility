// @Arch[JS_Engine]
// @Description: Tailwind CSS configuration file mapping Obsidian design tokens.
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pm: {
          primary: 'var(--pm-primary)',
          success: 'var(--pm-success)',
          warning: 'var(--pm-warning)',
          danger: 'var(--pm-danger)',
          purple: 'var(--pm-purple)',
          card: 'var(--pm-card-bg)',
          input: 'var(--pm-input-bg)',
          border: 'var(--pm-border-color)'
        }
      }
    },
  },
  plugins: [],
}
