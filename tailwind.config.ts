import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent, #2563eb)',
        'accent-secondary': 'var(--accent-secondary, #0ea5e9)',
      },
    },
  },
  plugins: [],
};

export default config;
