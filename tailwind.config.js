// For PostCSS 7 compatibility
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  // Enable JIT for better performance
  mode: 'jit',
  // Configure PurgeCSS to remove unused styles in production
  purge: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    extend: {
      screens: {
        'sm': '640px',    // 2 columns
        'lg': '960px',    // 3 columns
        '2xl': '1280px',
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  variants: {
    extend: {
      opacity: ['disabled'],
      backgroundColor: ['active', 'disabled'],
      textColor: ['active', 'disabled'],
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    function({ addBase }) {
      addBase({
        '*': { 
          borderWidth: '0 !important',
          borderStyle: 'none !important',
          '--tw-border-opacity': '0 !important',
        },
        'div, p, span, a, button, input, textarea, select, label, h1, h2, h3, h4, h5, h6': {
          borderWidth: '0 !important',
          borderStyle: 'none !important',
          '--tw-border-opacity': '0 !important',
        },
      });
    },
  ],
}
