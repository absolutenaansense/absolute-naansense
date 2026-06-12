/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FDF3EE',
          100: '#FAE0D0',
          200: '#F5C4A3',
          300: '#EFA070',
          400: '#E07A45',
          500: '#B85C2A',  // primary
          600: '#9E4D24',
          700: '#7D3B1A',
          800: '#5C2B12',
          900: '#3B1B0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
