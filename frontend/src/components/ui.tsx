import { motion, useReducedMotion } from 'framer-motion'
import { ReactNode, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { R } from '../api'

export const ease = [0.22, 1, 0.36, 1] as const
export const ENT_COLORS: Record<string, string> = { Person: '#6366f1', Organization: '#0ea5e9', Location: '#10b981', Date: '#f59e0b', Time: '#f97316', Money: '#84cc16', Product: '#ec4899', Event: '#a855f7', Technology: '#14b8a6', Other: '#94a3b8' }

export function AmbientBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-bg">
      <div className="orb" style={{ width: 520, height: 520, left: '-8%', top: '-10%', background: 'rgb(var(--orb1))' }} />
      <div className="orb" style={{ width: 460, height: 460, right: '-6%', top: '35%', background: 'rgb(var(--orb2))', animationDelay: '-12s' }} />
      <div className="orb" style={{ width: 400, height: 400, left: '30%', bottom: '-15%', background: 'rgb(var(--orb1))', animationDelay: '-24s', opacity: .14 }} />
    </div>
  )
}

export function AnimatedButton({ children, variant = 'primary', loading, className = '', ...p }: R) {
  const base = variant === 'primary' ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30'
    : 'bg-surface border border-line text-ink hover:border-primary/60'
  return (
    <motion.button whileHover={{ y: -1 }} whileTap={{ scale: .97 }} transition={{ duration: .18 }} disabled={loading || p.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-shadow disabled:opacity-50 disabled:cursor-not-allowed ${base} ${className}`} {...p}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}{children}
    </motion.button>)
}

export function AnimatedCard({ children, title, icon, className = '', delay = 0 }: { children: ReactNode; title?: string; icon?: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35, delay, ease }}
      whileHover={{ y: -2 }} className={`rounded-2xl border border-line bg-surface p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-[box-shadow,border-color] duration-300 ${className}`}>
      {title && <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink"><span className="text-primary">{icon}</span>{title}</h3>}
      {children}
    </motion.section>)
}

export function AnimatedSection({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  const reduce = useReducedMotion()
  return <motion.div id={id} initial={{ opacity: 0, y: reduce ? 0 : 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: .5, ease }} className={className}>{children}</motion.div>
}

export function Meter({ value, size = 96, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 7, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value))
  const col = v >= .7 ? 'rgb(var(--ok))' : v >= .4 ? 'rgb(var(--warn))' : 'rgb(var(--bad))'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label ?? 'Score'} ${Math.round(v * 100)} percent`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--border))" strokeWidth="7" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v) }} transition={{ duration: .9, ease }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-lg font-bold leading-none">{Math.round(v * 100)}%</div>{label && <div className="mt-1 text-[10px] text-muted">{label}</div>}</div></div>
    </div>)
}

export function Loading({ text = 'Analysing…' }: { text?: string }) {
  return <div className="flex items-center gap-3 text-sm text-muted" role="status">
    <span className="flex gap-1">{[0, 1, 2].map(i => <motion.span key={i} className="h-2 w-2 rounded-full bg-primary" animate={{ opacity: [.25, 1, .25], y: [0, -3, 0] }} transition={{ duration: .9, repeat: Infinity, delay: i * .15 }} />)}</span>{text}</div>
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{children}</span>
}

export function Empty({ title, hint }: { title: string; hint: string }) {
  return <div className="rounded-2xl border border-dashed border-line p-10 text-center"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted">{hint}</p></div>
}

export function EntityHighlighter({ text, entities }: { text: string; entities: R[] }) {
  const [sel, setSel] = useState<R | null>(null)
  const parts: ReactNode[] = []; let i = 0
  entities.forEach((e, k) => {
    if (e.start > i) parts.push(text.slice(i, e.start))
    const c = ENT_COLORS[e.label] ?? ENT_COLORS.Other
    parts.push(<mark key={k} className="ent" tabIndex={0} role="button" onClick={() => setSel(e)} onKeyDown={x => x.key === 'Enter' && setSel(e)}
      style={{ background: c + '26', color: 'inherit', boxShadow: `inset 0 -2px 0 ${c}` }}>{e.text}<sup className="ml-1 text-[10px] font-semibold" style={{ color: c }}>{e.label}</sup></mark>)
    i = e.end
  })
  parts.push(text.slice(i))
  const used = [...new Set(entities.map(e => e.label))]
  return (
    <div>
      <p className="leading-8">{parts}</p>
      {used.length > 0 && <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">{used.map(l => <span key={l} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: ENT_COLORS[l] ?? ENT_COLORS.Other }} />{l}</span>)}</div>}
      {sel && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-xl bg-primary/10 p-3 text-sm"><b>{sel.text}</b> → {sel.label}. {sel.explanation}</motion.p>}
      {!entities.length && <p className="text-sm text-muted">No entities detected.</p>}
    </div>)
}
