/** @type {import('tailwindcss').Config} */
// Klarfix Eye Calm palette (70% background, 20% card, 10% primary).
// Loaded from src/app/globals.css via @config (Tailwind v4).
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      background: '#DDEDE3',
      card: '#FFFFFF',
      primary: '#1B4332',
      primaryHover: '#2D5A4C',
      'primary-hover': '#2D5A4C',
      text: '#1B4332',
      // Only for destructive actions (delete buttons/icons).
      danger: '#B42318',
      'danger-hover': '#912018',
    },
  },
}
