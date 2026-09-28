/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gas: {
          blue: '#0284c7',
          dark: '#0f172a',
          warning: '#f59e0b',
          danger: '#ef4444',
          success: '#10b981',
        },
      },
    },
  },
  plugins: [],
}
