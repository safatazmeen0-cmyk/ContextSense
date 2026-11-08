import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
export const THEMES = [
  { id: 'light', name: 'Light', bg: '#F7F8FC', card: '#fff', accent: '#5B5FEF' },
  { id: 'dark', name: 'Dark', bg: '#12141C', card: '#1B1E2B', accent: '#818CF8' },
  { id: 'midnight', name: 'Midnight', bg: '#081126', card: '#0E1C3A', accent: '#22D3EE' },
  { id: 'lavender', name: 'Lavender', bg: '#F5F1FF', card: '#fff', accent: '#7C4DFF' },
  { id: 'emerald', name: 'Emerald', bg: '#F0F9F5', card: '#fff', accent: '#059669' },
  { id: 'system', name: 'System', bg: 'linear-gradient(90deg,#F7F8FC 50%,#12141C 50%)', card: '#fff', accent: '#5B5FEF' },
]
type Ctx = { theme: string; resolved: string; setTheme: (t: string) => void }
const C = createContext<Ctx>({ theme: 'system', resolved: 'light', setTheme: () => {} })
export const useTheme = () => useContext(C)
const resolve = (t: string) => (t === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t)
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, set] = useState(() => localStorage.getItem('cs-theme') || 'system')
  const [resolved, setResolved] = useState(resolve(theme))
  const apply = (t: string) => { const r = resolve(t); setResolved(r); document.documentElement.dataset.theme = r }
  useEffect(() => {
    apply(theme)
    const mq = matchMedia('(prefers-color-scheme: dark)'); const f = () => theme === 'system' && apply('system')
    mq.addEventListener('change', f); return () => mq.removeEventListener('change', f)
  }, [theme])
  const setTheme = (t: string) => {
    const h = document.documentElement; h.classList.add('theme-fade'); setTimeout(() => h.classList.remove('theme-fade'), 400)
    localStorage.setItem('cs-theme', t); set(t)
  }
  return <C.Provider value={{ theme, resolved, setTheme }}>{children}</C.Provider>
}
