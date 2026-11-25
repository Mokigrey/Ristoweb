import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        selfweb: {
          canvas: '#eef4f1',
          rail: '#102b2b',
          hero: '#173c37',
          border: '#dce9e2',
          ink: '#142a29',
          action: '#17665c',
          accent: '#ccfbf1',
        },
      },
    },
  },
  plugins: [],
};
export default config;
