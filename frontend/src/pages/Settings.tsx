import { useState } from 'react'
import { Check } from 'lucide-react'
import { THEMES, useTheme } from '../theme'
import { api } from '../api'
import { AnimatedButton, AnimatedCard } from '../components/ui'

export default function Settings() {
  const { theme, setTheme } = useTheme(); const [msg, setMsg] = useState('')
  const [prefs, setPrefs] = useState(() => JSON.parse(localStorage.getItem('cs-prefs') || '{"lang":"en","mode":"all"}'))
  const upd = (p: object) => { const n = { ...prefs, ...p }; setPrefs(n); localStorage.setItem('cs-prefs', JSON.stringify(n)) }
  const sel = 'rounded-xl border border-line bg-surface px-3 py-2 text-sm'
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Settings</h1>
      <AnimatedCard title="Theme"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{THEMES.map(t => (
        <button key={t.id} onClick={() => setTheme(t.id)} aria-pressed={theme === t.id} className={`relative rounded-xl border-2 p-3 text-left transition ${theme === t.id ? 'border-primary' : 'border-line hover:border-primary/50'}`}>
          <div className="h-14 rounded-lg border border-line p-2" style={{ background: t.bg }}><div className="h-full w-2/3 rounded-md" style={{ background: t.card }}><div className="m-1.5 h-1.5 w-8 rounded" style={{ background: t.accent }} /></div></div>
          <span className="mt-2 block text-sm font-medium">{t.name}</span>{theme === t.id && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}</button>))}</div></AnimatedCard>
      <AnimatedCard title="Analysis preferences"><div className="flex flex-wrap gap-4 text-sm">
        <label className="grid gap-1">Language<select className={sel} value={prefs.lang} onChange={e => upd({ lang: e.target.value })}><option value="en">English (analysis supports English only)</option></select></label>
        <label className="grid gap-1">Default analysis mode<select className={sel} value={prefs.mode} onChange={e => { upd({ mode: e.target.value }); location.hash = `#/analyze/${e.target.value}` }}>{['all', 'context', 'intent', 'sentiment', 'entities', 'relations', 'ambiguity'].map(m => <option key={m}>{m}</option>)}</select></label></div></AnimatedCard>
      <AnimatedCard title="Data"><div className="flex flex-wrap gap-2">
        <AnimatedButton variant="ghost" onClick={async () => { if (confirm('Delete all saved analyses?')) { const r = await api.clear(); setMsg(`Deleted ${r.deleted} analyses.`) } }}>Clear history</AnimatedButton>
        <AnimatedButton variant="ghost" onClick={() => { localStorage.removeItem('cs-prefs'); setTheme('system'); setPrefs({ lang: 'en', mode: 'all' }); setMsg('Preferences reset.') }}>Reset preferences</AnimatedButton></div>
        {msg && <p role="status" className="mt-3 text-sm text-ok">{msg}</p>}</AnimatedCard>
    </div>)
}
