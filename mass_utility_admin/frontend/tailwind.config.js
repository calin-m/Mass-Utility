/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'pm-bg': 'var(--pm-body-bg)',
        'pm-card': 'var(--pm-card-bg)',
        'pm-border': 'var(--pm-border-color)',
        'pm-text': 'var(--pm-text-primary)',
        'pm-secondary': 'var(--pm-text-secondary)',
        'pm-primary': 'var(--pm-primary)',
        'pm-primary-dark': 'var(--pm-primary-dark)',
        'pm-input': 'var(--pm-input-bg)',
      },
    },
  },
  plugins: [],
}
