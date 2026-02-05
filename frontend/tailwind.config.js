/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        manufacturing: {
          dark: '#1a1a1a',
          light: '#f5f5f5',
          primary: '#1e3a5f',
          accent: '#ff9500',
          success: '#10b981',
          danger: '#ef4444',
          warning: '#f59e0b',
        }
      }
    },
  },
  plugins: [],
}
