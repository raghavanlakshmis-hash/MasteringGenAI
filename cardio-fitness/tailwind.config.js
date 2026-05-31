/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4F75FF',
        'primary-light': '#EEF2FF',
        'cardio-red': '#CC2A1F',
        'cardio-bg': '#F0F4FF',
      },
    },
  },
  plugins: [],
}
