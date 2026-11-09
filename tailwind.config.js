/** @type {import('tailwindcss').Config} */
export default {
  // The Harbor kit ships as .js/.jsx, so those extensions have to be scanned or
  // Tailwind never generates the classes those components ask for — and a class
  // it does not generate fails silently, with no error anywhere.
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      // Harbor palette, from IT Asset Management (see UI-KIT-SETUP.md).
      // The names do not describe the colours: `clay` is navy, `olive` is
      // sea green. That is deliberate — the theme can be re-toned without
      // touching class names in a thousand places.
      colors: {
        // navy (กรมท่า) — the brand colour (buttons / highlights / sidebar), base #1E4E8C
        clay: {
          50: '#EEF3FA',
          100: '#DCE6F4',
          200: '#C2D3EB',
          300: '#98B3DA',
          400: '#6A8EC4',
          500: '#3F6BA8',
          600: '#1E4E8C',  // white text on this = 8.3:1, passes WCAG AA
          700: '#183F72',
          800: '#13325A',
          900: '#0F2742',  // darkest — sidebar background
        },
        // surfaces — cool light greys
        sand: {
          50: '#F7F9FA',   // page background
          100: '#F2F2F2',
          200: '#E6EAEC',
          300: '#D3DADE',
        },
        // ochre — "in progress" status (muted amber, reads clearly against navy)
        ochre: {
          50: '#FBF3E4',
          100: '#F5E7C6',
          200: '#EBD6A8',
          500: '#C99542',
          600: '#A87A2C',
          700: '#8A6520',
        },
        // olive — "done / available" status, base #52AB98.
        // 500 gives white text only 2.75:1, so it must not be a button
        // background; 600/700 are the shades to put text on.
        olive: {
          50: '#EAF5F2',
          100: '#D6EDE7',
          200: '#B3DCD2',
          300: '#8ACABB',
          400: '#6BBBA9',
          500: '#52AB98',
          600: '#3D8072',  // white text = 4.64:1, passes AA
          700: '#2C5D53',
          800: '#234A42',
        },
        // brick — solid danger buttons
        brick: {
          500: '#CC5A50',
          600: '#B0453C',  // white text = 5.58:1
          700: '#8F372F',
        },
        // rose — soft warning badges. Overrides Tailwind's own rose so it sits
        // in the same cool family; nothing in this app used rose before.
        rose: {
          50: '#FBEAE8',
          100: '#F6D5D1',
          200: '#EBB0A9',
          500: '#CC5A50',
          600: '#B0453C',
          700: '#8F372F',
        },
        // stone — overrides Tailwind's warm grey with a cool one, so every
        // text-stone-* / border-stone-* in the kit matches navy without edits.
        stone: {
          50: '#F7F9FA',
          100: '#EFF3F5',
          200: '#E1E8EB',
          300: '#CBD6DB',
          400: '#82959E',  // secondary labels — 3.15:1, better than stock 2.54:1
          500: '#64757D',
          600: '#4A5A61',
          700: '#374449',
          800: '#263034',
          900: '#162024',
        },
      },
    },
  },
  plugins: [],
}
