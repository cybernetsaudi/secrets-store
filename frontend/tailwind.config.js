/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          red: '#DC143C',
          blue: '#003366',
          white: '#FFFFFF',
          green: '#228B22',
        },
        gufc: {
          red: '#DC143C',
          blue: '#003366',
          white: '#FFFFFF',
          green: '#228B22',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gufc': '0 10px 25px -5px rgba(220, 20, 60, 0.1), 0 10px 10px -5px rgba(220, 20, 60, 0.04)',
        'gufc-lg': '0 20px 50px -12px rgba(220, 20, 60, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}


