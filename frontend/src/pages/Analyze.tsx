import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Sparkles, Eraser, Target, Heart, Layers, Tags, Network, Languages, Lightbulb, AlertTriangle } from 'lucide-react'
import { api, R } from '../api'
import { AnimatedButton, AnimatedCard, Meter, Loading, EntityHighlighter, Tag, Empty } from '../components/ui'
import KnowledgeGraph from '../components/KnowledgeGraph'

const EX = ['I am feeling cold.', 'Can you open the window?', 'That was just great. Now my computer has crashed again.', 'I saw the man with a telescope.',
  'Microsoft announced a new AI research center in Hyderabad on Monday.', 'Ravi developed a mobile application using Flutter.']
const TITLES: Record<string, string> = { all: 'Text analysis', context: 'Context analysis', intent: 'Intent detection', sentiment: 'Sentiment analysis', entities: 'Entity recognition', relations: 'Semantic relationships', ambiguity: 'Ambiguity detection' }
const Chart = ({ data, x, y }: { data: R[]; x: string; y: string }) => (
  <div className="h-44"><ResponsiveContainer><BarChart data={data} layout="vertical" margin={{ left: 20 }}>
    <XAxis type="number" domain={[0, 1]} hide /><YAxis type="category" dataKey={x} width={110} tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }} axisLine={false} tickLine={false} />
    <Tooltip contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--border))', borderRadius: 12 }} />
    <Bar dataKey={y} radius={6} isAnimationActive>{data.map((_, i) => <Cell key={i} fill={i === 0 ? 'rgb(var(--primary))' : 'rgb(var(--secondary) / .45)'} />)}</Bar></BarChart></ResponsiveContainer></div>)

function Ambiguity({ a }: { a: R }) {
  if (!a.ambiguity_summary.items.length) return <p className="text-sm text-muted">{a.ambiguity_summary.message}</p>
  return <div className="space-y-3">
    <p className={`flex items-center gap-2 text-sm font-medium ${a.ambiguity_summary.confident ? 'text-ok' : 'text-warn'}`}><AlertTriangle className="h-4 w-4" />{a.ambiguity_summary.message}</p>
    {a.ambiguity.map((x: R, i: number) => <div key={i} className="rounded-xl border border-line p-3">
      <div className="mb-2 flex items-center gap-2"><Tag>{x.type}</Tag><mark className="rounded bg-warn/25 px-1.5 text-sm text-ink">{x.span}</mark></div>
      <p className="mb-2 text-sm text-muted">{x.explanation}</p>
      <div className="grid gap-2 sm:grid-cols-2">{x.interpretations.map((it: R, j: number) => <div key={j} className={`rounded-lg border p-2.5 text-sm ${j === 0 ? 'border-primary/50 bg-primary/5' : 'border-line'}`}>{it.meaning}<div className="mt-1 text-xs text-muted">likelihood {Math.round(it.score * 100)}%</div></div>)}</div></div>)}</div>
}

export default function Analyze({ tab }: { tab: string }) {
  const [text, setText] = useState(() => sessionStorage.getItem('cs-reanalyze') || ''); const [ctx, setCtx] = useState(''); const [s2, setS2] = useState('')
  const [res, setRes] = useState<R>(null); const [sim, setSim] = useState<R>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  useEffect(() => { sessionStorage.removeItem('cs-reanalyze') }, [])
  useEffect(() => { setRes(null); setSim(null); setErr('') }, [tab])
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const run = async () => {
    setBusy(true); setErr('')
    try {
      if (tab === 'context') setRes(await api.context(text, ctx))
      else { setRes(await api.analyze(text, tab === 'all' ? ctx : '')); if (tab === 'relations' && s2.trim()) setSim(await api.similarity(text, s2)); else setSim(null) }
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const clear = () => { setText(''); setCtx(''); setS2(''); setRes(null); setSim(null); setErr('') }
  const a = tab === 'context' ? res?.analysis : res
  const show = (k: string) => tab === 'all' || tab === k
  return (
    <div className="space-y-5">
      <div><h1 className="font-display text-3xl">{TITLES[tab] ?? 'Text analysis'}</h1></div>
      <AnimatedCard>
        <label htmlFor="inp" className="sr-only">Text to analyse</label>
        <textarea id="inp" value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={5000} placeholder={tab === 'context' ? 'Current sentence…' : 'Enter a sentence or paragraph to understand its meaning...'}
          className="w-full resize-y rounded-xl border border-line bg-bg/60 p-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
        {(tab === 'context' || tab === 'all') && <textarea value={ctx} onChange={e => setCtx(e.target.value)} rows={2} aria-label="Previous context" placeholder={tab === 'context' ? 'Previous context (required)…' : 'Previous context (optional)…'}
          className="mt-3 w-full resize-y rounded-xl border border-line bg-bg/60 p-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />}
        {tab === 'relations' && <input value={s2} onChange={e => setS2(e.target.value)} aria-label="Second sentence" placeholder="Optional: second sentence to compare meaning…"
          className="mt-3 w-full rounded-xl border border-line bg-bg/60 p-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AnimatedButton onClick={run} loading={busy} disabled={!text.trim() || (tab === 'context' && !ctx.trim())}><Sparkles className="h-4 w-4" />{busy ? 'Analysing' : 'Analyze'}</AnimatedButton>
          <AnimatedButton variant="ghost" onClick={clear}><Eraser className="h-4 w-4" />Clear</AnimatedButton>
          <span className="ml-auto text-xs text-muted">{text.length} chars · {words} words</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{EX.map(e => <button key={e} onClick={() => setText(e)} className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-primary hover:text-primary">{e.length > 38 ? e.slice(0, 36) + '…' : e}</button>)}</div>
      </AnimatedCard>
      {err && <div role="alert" className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-bad">{err}</div>}
      {busy && <Loading />}
      {!res && !busy && !err && <Empty title="No analysis yet" hint="Type or pick an example, then press Analyze." />}
      <AnimatePresence>{res && a && !busy && (
        <motion.div key={res.analysis_id ?? text} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <AnimatedCard className="!border-primary/30">
            <div className="flex flex-wrap items-center gap-5">
              <Meter value={tab === 'context' ? res.confidence : a.confidence} label="confidence" />
              <div className="min-w-0 flex-1"><p className="text-xs text-muted">Overall interpretation</p>
                <p className="mt-1 text-lg font-medium">{tab === 'context' ? res.contextual_interpretation : a.interpretation}</p>
                <div className="mt-2 flex flex-wrap gap-2"><Tag>Intent: {a.intent}</Tag><Tag>Sentiment: {a.sentiment}</Tag></div></div></div>
            <p className="mt-3 text-xs text-muted">{a.disclaimer}</p>
          </AnimatedCard>
          {tab === 'context' && <AnimatedCard title="Context vs. no context" icon={<Layers className="h-4 w-4" />}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-line p-3"><p className="text-xs text-muted">Without context · {Math.round(res.independent_confidence * 100)}%</p><p className="mt-1 text-sm">{res.independent_interpretation}</p></div>
              <div className="rounded-xl border border-primary/50 bg-primary/5 p-3"><p className="text-xs text-muted">With context · {Math.round(res.confidence * 100)}%</p><p className="mt-1 text-sm">{res.contextual_interpretation}</p></div></div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{res.differences.map((d: string) => <li key={d}>{d}</li>)}</ul>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="text-muted">Contextual keywords:</span>{res.keywords.length ? res.keywords.map((k: string) => <Tag key={k}>{k}</Tag>) : <span className="text-muted">none found</span>}
              <span className="ml-auto text-xs text-muted">relatedness {Math.round(res.relatedness * 100)}% · {res.relatedness_method}</span></div></AnimatedCard>}
          {tab === 'all' && <AnimatedCard title="Key insights" icon={<Lightbulb className="h-4 w-4" />} delay={.05}><ul className="grid gap-2 sm:grid-cols-2">{a.insights.map((i: string) => <li key={i} className="rounded-lg bg-primary/5 p-2.5 text-sm">{i}</li>)}</ul><p className="mt-3 text-sm text-muted">{a.contextual_meaning}</p></AnimatedCard>}
          <div className="grid gap-4 lg:grid-cols-2">
            {show('intent') && <AnimatedCard title="Intent detection" icon={<Target className="h-4 w-4" />}>
              <p className="text-xl font-semibold">{a.intent_detail.label} <span className="text-sm font-normal text-muted">{Math.round(a.intent_detail.confidence * 100)}%</span></p>
              <p className="mb-2 mt-1 text-sm text-muted">{a.intent_detail.explanation}</p>
              <Chart data={a.intent_detail.distribution.slice(0, 5)} x="label" y="value" />
              <p className="text-xs text-muted">Alternatives: {a.intent_detail.alternatives.map((x: R) => `${x.label} ${Math.round(x.confidence * 100)}%`).join(', ')}</p></AnimatedCard>}
            {show('sentiment') && <AnimatedCard title="Contextual sentiment" icon={<Heart className="h-4 w-4" />}>
              <p className="text-xl font-semibold">{a.sentiment_detail.label} <span className="text-sm font-normal text-muted">score {a.sentiment_detail.score}</span></p>
              <p className="my-1 text-sm text-muted">{a.sentiment_detail.explanation}</p>
              {a.sentiment_detail.emotions.length ? <Chart data={a.sentiment_detail.emotions} x="emotion" y="score" /> : <p className="text-sm text-muted">No specific emotion detected.</p>}
              <div className="mt-1 flex flex-wrap gap-2">{a.sentiment_detail.keywords.map((k: R) => <Tag key={k.word}>{k.word}: {k.effect}</Tag>)}</div></AnimatedCard>}
            {(show('ambiguity')) && <AnimatedCard title="Ambiguity" icon={<AlertTriangle className="h-4 w-4" />} className="lg:col-span-2"><Ambiguity a={a} /></AnimatedCard>}
            {show('entities') && <AnimatedCard title="Entities" icon={<Tags className="h-4 w-4" />} className="lg:col-span-2"><EntityHighlighter text={a.original_text} entities={a.entities} /></AnimatedCard>}
            {(show('relations')) && <AnimatedCard title="Semantic relationships" icon={<Network className="h-4 w-4" />} className="lg:col-span-2"><KnowledgeGraph graph={a.graph} /></AnimatedCard>}
            {tab === 'relations' && sim && <AnimatedCard title="Semantic similarity" icon={<Layers className="h-4 w-4" />} className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-5"><Meter value={sim.score} label="similar" /><div className="text-sm"><p className="font-semibold capitalize">{sim.relationship}</p>
                <p className="text-muted">Shared: {sim.shared_concepts.join(', ') || 'none'}</p><p className="text-muted">Only in first: {sim.only_in_first.join(', ') || '—'} · Only in second: {sim.only_in_second.join(', ') || '—'}</p>
                <p className="mt-1 text-xs text-muted">Method: {sim.method}</p></div></div></AnimatedCard>}
            {show('all') && tab === 'all' && <AnimatedCard title="Linguistic analysis" icon={<Languages className="h-4 w-4" />} className="lg:col-span-2">
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">{[['Sentence type', a.linguistic.sentence_type], ['Subject', a.linguistic.subject], ['Predicate', a.linguistic.predicate], ['Object', a.linguistic.object], ['Structure', a.linguistic.structure], ['Keywords', a.keywords.join(', ')]].map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd>{v || <span className="text-muted">not identified</span>}</dd></div>)}</dl>
              {a.linguistic.note && <p className="mt-2 text-xs text-warn">{a.linguistic.note}</p>}</AnimatedCard>}
          </div></motion.div>)}</AnimatePresence>
    </div>)
}
