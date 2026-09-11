import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Classes used in src/context (FeedbackContext modal) that may not otherwise be scanned.
    // bg-red-600 is only ever used as a hover variant elsewhere, so the base utility must be safelisted.
    'bg-red-600',
    'hover:bg-red-700',
    'bg-campus-primary',
  ],
  theme: {
    extend: {
      colors: {
        campus: {
          primary: '#1A3F75',    // deep blue
          secondary: '#4E6A9C',  // steel blue
          accent: '#4E6A9C',     // steel blue accent
          dark: '#00002A',       // darkest navy
          light: '#EAF2FA',      // ice blue
          success: '#2E8B77',
          warning: '#C9A227',
          danger: '#B4463C',
          blue: '#A9C4DE',       // light steel blue
          pink: '#4E6A9C',
          orange: '#4E6A9C',
          green: '#2E8B77',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 2s infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
