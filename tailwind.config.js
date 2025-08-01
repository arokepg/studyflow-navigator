/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nord0: '#2E3440', // Polar Night
        nord1: '#3B4252',
        nord2: '#434C5E',
        nord3: '#4C566A',
        nord4: '#D8DEE9', // Snow Storm
        nord5: '#E5E9F0',
        nord6: '#ECEFF4',
        nord7: '#8FBCBB', // Frost
        nord8: '#88C0D0',
        nord9: '#81A1C1',
        nord10: '#5E81AC',
      },
      // Added custom font family for monospace
      fontFamily: {
        mono: ['monospace', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'Courier New'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        'fade-in': 'fadeIn 2s ease-out forwards',
      }
    },
  },
  plugins: [],
}
