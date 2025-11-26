/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html"], // Olha para o seu arquivo HTML
  darkMode: 'class',         // Ativa o modo escuro manual
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Define a fonte Inter como padrão
      }
    },
  },
  plugins: [],
}