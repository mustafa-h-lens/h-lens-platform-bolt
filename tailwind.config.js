/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          light: '#3b82f6',
          lighter: '#60a5fa',
        },
        dark: {
          bg: '#050d1e',
          card: '#071428',
          border: 'rgba(255,255,255,0.09)',
        }
      },
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
