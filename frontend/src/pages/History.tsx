import { useEffect, useState } from 'react'
import { Search, Trash2, RefreshCw, X } from 'lucide-react'
import { api, R } from '../api'
import { AnimatedButton, AnimatedCard, Empty, Loading, Tag } from '../components/ui'

export default function History({ go }: { go: (h: string) => void }) {
  const [items, setItems] = useState<R[]>([]); const [q, setQ] = useState(''); const [kind, setKind] = useState(''); const [sort, setSort] = useState('newest')
  const [busy, setBusy] = useState(true); const [err, setErr] = useState(''); const [open, setOpen] = useState<number | null>(null); const [confirm, setConfirm] = useState(false)
  const load = async () => { setBusy(true); try { setItems((await api.history(q, kind, sort)).items); setErr('') } catch (e: any) { setErr(e.message) } finally { setBusy(false) } }
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t) }, [q, kind, sort])
  const sel = 'rounded-xl border border-line bg-surface px-3 py-2 text-sm'
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Analysis history</h1>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" /><input value={q} onChange={e => setQ(e.target.value)} aria-label="Search history" placeholder="Search text…" className={`${sel} w-full pl-9`} /></div>
        <select value={kind} onChange={e => setKind(e.target.value)} className={sel} aria-label="Filter by type"><option value="">All types</option><option value="analyze">Text analysis</option><option value="context">Context</option><option value="similarity">Similarity</option></select>
        <select value={sort} onChange={e => setSort(e.target.value)} className={sel} aria-label="Sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
        <AnimatedButton variant="ghost" onClick={() => setConfirm(true)} disabled={!items.length}><Trash2 className="h-4 w-4" />Clear all</AnimatedButton></div>
      {err && <div role="alert" className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-bad">{err}</div>}
      {busy ? <Loading text="Loading history…" /> : !items.length ? <Empty title="Nothing here yet" hint="Analyses you run are saved automatically." /> :
        <div className="space-y-3">{items.map(it => <AnimatedCard key={it.id}>
          <div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><p className="truncate font-medium">{it.text}</p>
            <p className="mt-1 text-sm text-muted">{it.interpretation}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2"><Tag>{it.kind}</Tag>{it.intent !== '-' && <Tag>{it.intent}</Tag>}{it.sentiment !== '-' && <Tag>{it.sentiment}</Tag>}<span className="text-xs text-muted">{Math.round(it.confidence * 100)}% · {new Date(it.created).toLocaleString()}</span></div></div>
            <div className="flex gap-1">
              <AnimatedButton variant="ghost" onClick={() => setOpen(open === it.id ? null : it.id)}>{open === it.id ? 'Hide' : 'View'}</AnimatedButton>
              <AnimatedButton variant="ghost" aria-label="Reanalyze" disabled={it.kind === 'similarity'} onClick={() => { sessionStorage.setItem('cs-reanalyze', it.text); go('#/analyze/all') }}><RefreshCw className="h-4 w-4" /></AnimatedButton>
              <AnimatedButton variant="ghost" aria-label="Delete" onClick={async () => { await api.del(it.id); load() }}><Trash2 className="h-4 w-4" /></AnimatedButton></div></div>
          {open === it.id && <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">{it.context && <p><b>Context:</b> {it.context}</p>}<p><b>Interpretation:</b> {it.interpretation}</p>{it.result.insights && <ul className="list-disc pl-5">{it.result.insights.map((x: string) => <li key={x}>{x}</li>)}</ul>}</div>}
        </AnimatedCard>)}</div>}
      {confirm && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-xl"><div className="flex justify-between"><h2 className="font-semibold">Delete all history?</h2><button onClick={() => setConfirm(false)} aria-label="Close"><X className="h-4 w-4" /></button></div>
          <p className="mt-2 text-sm text-muted">This permanently removes all {items.length} saved analyses.</p>
          <div className="mt-4 flex justify-end gap-2"><AnimatedButton variant="ghost" onClick={() => setConfirm(false)}>Cancel</AnimatedButton><AnimatedButton onClick={async () => { await api.clear(); setConfirm(false); load() }}>Delete all</AnimatedButton></div></div></div>}
    </div>)
}
