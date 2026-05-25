/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f1118',
          100: '#151820',
          200: '#1b1f2b',
          300: '#242836',
        },
        accent: {
          green: '#00d26a',
          red: '#ff4757',
          blue: '#3b82f6',
          gold: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
}
