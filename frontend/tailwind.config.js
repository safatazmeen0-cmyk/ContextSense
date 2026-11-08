const v = (n) => `rgb(var(--${n}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { bg: v('bg'), surface: v('surface'), ink: v('text'), muted: v('muted'), line: v('border'), primary: v('primary'), secondary: v('secondary'), ok: v('ok'), warn: v('warn'), bad: v('bad') },
    fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'], display: ['"Fraunces"', 'Georgia', 'serif'] } } }
}
