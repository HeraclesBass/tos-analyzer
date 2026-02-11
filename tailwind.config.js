/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/tailwind-safelist.txt', // Ensures all dynamic classes are generated
  ],
  safelist: [
    // TOSCard 2025 - Gradients
    'from-red-500/20', 'via-red-600/10',
    'from-amber-500/20', 'via-amber-600/10',
    'from-emerald-500/20', 'via-emerald-600/10',
    'from-red-500', 'to-rose-600',
    'from-amber-500', 'to-orange-500',
    'from-emerald-500', 'to-teal-500',
    // TOSCard 2025 - Borders
    'border-red-500/30', 'hover:border-red-400/50',
    'border-amber-500/30', 'hover:border-amber-400/50',
    'border-emerald-500/30', 'hover:border-emerald-400/50',
    // TOSCard 2025 - Backgrounds
    'bg-red-500/20', 'bg-amber-500/20', 'bg-emerald-500/20',
    // TOSCard 2025 - Text
    'text-red-400', 'text-amber-400', 'text-emerald-400',
    'text-emerald-300', 'text-orange-400',
    // TOSCard 2025 - Rings
    'ring-red-500/20', 'ring-amber-500/20', 'ring-emerald-500/20',
    // RiskBadge gradients (legacy)
    'from-emerald-500', 'to-emerald-600',
    'from-amber-500', 'to-amber-600',
    'from-red-500', 'to-red-600',
    'from-slate-600', 'to-slate-700',
    // RiskBadge shadows (legacy)
    'shadow-emerald', 'shadow-amber', 'shadow-red', 'shadow-slate',
    'hover:shadow-emerald-xl', 'hover:shadow-amber-xl',
    'hover:shadow-red-xl', 'hover:shadow-slate-xl',
    'hover:scale-105',
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme backgrounds
        background: {
          DEFAULT: '#0f172a', // slate-900
          light: '#1e293b',   // slate-800
          card: '#1e293b',    // slate-800
          panel: '#334155',   // slate-700
        },
        // Primary colors (keep blue/cyan for accents)
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#3b82f6',  // blue-500
          600: '#2563eb',  // blue-600
          700: '#1d4ed8',  // blue-700
        },
        // Risk badge colors (high contrast for dark backgrounds)
        safe: {
          300: '#6ee7b7',  // emerald-300
          400: '#34d399',  // emerald-400
          500: '#10b981',  // emerald-500
          600: '#059669',  // emerald-600
          700: '#047857',  // emerald-700
          800: '#065f46',  // emerald-800
          900: '#064e3b',  // emerald-900
          950: '#022c22',  // emerald-950
          bg: '#064e3b',   // dark emerald for backgrounds
        },
        concerning: {
          300: '#fcd34d',  // amber-300
          400: '#fbbf24',  // amber-400
          500: '#f59e0b',  // amber-500
          600: '#d97706',  // amber-600
          700: '#b45309',  // amber-700
          800: '#92400e',  // amber-800
          900: '#78350f',  // amber-900
          950: '#451a03',  // amber-950
          bg: '#78350f',   // dark amber for backgrounds
        },
        critical: {
          300: '#fca5a5',  // red-300
          400: '#f87171',  // red-400
          500: '#ef4444',  // red-500
          600: '#dc2626',  // red-600
          700: '#b91c1c',  // red-700
          800: '#991b1b',  // red-800
          900: '#7f1d1d',  // red-900
          950: '#450a0a',  // red-950
          bg: '#7f1d1d',   // dark red for backgrounds
        },
        // Text colors
        text: {
          primary: '#f8fafc',   // slate-50
          secondary: '#cbd5e1', // slate-300
          muted: '#94a3b8',     // slate-400
        },
        // Border colors
        border: {
          DEFAULT: '#334155',   // slate-700
          light: '#475569',     // slate-600
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
