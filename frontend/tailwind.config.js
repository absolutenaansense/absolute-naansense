/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#F5F7EC',
          100: '#E8ECD2',
          200: '#D3DBAB',
          300: '#B8C47E',
          400: '#9DAC5A',
          500: '#7F8F42',  // primary (olive green — shared by customer + admin)
          600: '#687634',
          700: '#515C29',
          800: '#3B431E',
          900: '#262C13',
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
