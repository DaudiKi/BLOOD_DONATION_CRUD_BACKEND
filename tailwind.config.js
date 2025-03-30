/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js}",
    "./public/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF0000',
        secondary: '#0066CC',
        accent: '#FF4D4D',
      },
    },
  },
  plugins: [
    require("daisyui")
  ],
  // DaisyUI config
  daisyui: {
    themes: [
      {
        bloodlink: {
          "primary": "#FF0000",
          "primary-focus": "#CC0000",
          "primary-content": "#ffffff",
          "secondary": "#0066CC",
          "secondary-focus": "#004C99",
          "secondary-content": "#ffffff",
          "accent": "#FF4D4D",
          "accent-focus": "#FF1A1A",
          "accent-content": "#ffffff",
          "neutral": "#3d4451",
          "base-100": "#ffffff",
          "base-200": "#f9fafb",
          "base-300": "#d1d5db",
          "base-content": "#1f2937",
          "info": "#2094f3",
          "success": "#009485",
          "warning": "#ff9900",
          "error": "#ff5724",
        },
      },
      "light",
    ],
  },
} 