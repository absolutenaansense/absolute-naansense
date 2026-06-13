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
        olive: {
          50:  '#F5F7EC',
          100: '#E8ECD2',
          200: '#D3DBAB',
          300: '#B8C47E',
          400: '#9DAC5A',
          500: '#7F8F42',  // admin primary
          600: '#687634',
          700: '#515C29',
          800: '#3B431E',
          900: '#262C13',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
