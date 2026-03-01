/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0A2A66',
          light: '#1B4FA9',
          lighter: '#256DDA',
        },
        dark: {
          bg: '#0E1116',
          card: '#1A1F2E',
          border: '#2D3748',
        }
      },
      fontFamily: {
        sans: ['Tajawal', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
