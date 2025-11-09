import twAnimate from 'tw-animate-css'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{html,js,svelte,ts}',
    './app/**/*.{ts,tsx}',
  './components/**/*.{ts,tsx}',
  './app/globals.css',
,
  ],
  theme: {
    extend: {
      colors: {
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.141 0.005 285.823)',
        primary: 'oklch(0.21 0.006 285.885)',
        accent: 'oklch(0.967 0.001 286.375)',
        muted: 'oklch(0.967 0.001 286.375)',
        destructive: 'oklch(0.577 0.245 27.325)',
      },
      borderRadius: {
        sm: 'calc(0.625rem - 4px)',
        md: 'calc(0.625rem - 2px)',
        lg: '0.625rem',
        xl: 'calc(0.625rem + 4px)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [twAnimate],
}