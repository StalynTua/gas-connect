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
        industrial: {
          canvas: '#F4F7FA',
          card: '#FFFFFF',
          'border-card': '#D6E2EA',
          'border-input': '#7A8C99',
          focus: '#0A86B8',
          navy: {
            DEFAULT: '#102D43',
            muted: '#536777',
          },
          petrol: {
            DEFAULT: '#185686',
            hover: '#134074',
            light: '#EAF4FA',
          },
          amber: {
            DEFAULT: '#E78B47',
            hover: '#D9772F',
            pressed: '#F7B76B',
            ink: '#102D43',
            surface: '#FFF2E4',
          },
          cyan: {
            DEFAULT: '#09A0DB',
            ink: '#00739E',
            surface: '#EAF4FA',
          },
          danger: {
            DEFAULT: '#B42336',
            surface: '#FDECEA',
            border: '#FCA5A5',
          },
          warning: {
            DEFAULT: '#8A4B0F',
            surface: '#FFF2E4',
          },
          success: {
            DEFAULT: '#16734B',
            surface: '#EAF4FA',
          },
        },
      },
      borderRadius: {
        card: '16px',
        control: '12px',
        chip: '8px',
      },
    },
  },
  plugins: [],
}
