import { useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Target, Heart, AlertTriangle, Network, MessagesSquare } from 'lucide-react'
import { api, R } from '../api'
import { AnimatedButton, AnimatedSection, Loading, ease } from '../components/ui'

const FEATURES = [
  [Brain, 'Contextual understanding', 'Compare a sentence with and without the text that came before it.'], [Target, 'Intent detection', 'Request, question, command or complaint – with alternatives.'],
  [Heart, 'Sentiment intelligence', 'Negation, contrast and sarcasm cues, not just word counts.'], [AlertTriangle, 'Ambiguity resolution', 'Competing readings ranked by context, or flagged as unclear.'],
  [Network, 'Semantic relationships', 'A graph built from the dependency structure of your text.'], [MessagesSquare, 'Conversational reasoning', 'Resolves “it”, “they” and “she” across messages.']] as const
const CTX = [['Genuine interest', 'Ananya has been reading about quantum computing all evening and keeps asking questions.'], ['Sarcasm', 'Ravi spent forty minutes explaining his spreadsheet formatting rules to the whole team.']]
const TECH = ['React + Vite + TypeScript', 'Tailwind CSS', 'Framer Motion', 'FastAPI', 'spaCy', 'Sentence Transformers', 'Hugging Face Transformers', 'SQLite + SQLAlchemy']

export default function Home({ go }: { go: (h: string) => void }) {
  const [i, setI] = useState<number | null>(null); const [r, setR] = useState<R>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const demo = async (k: number) => { setI(k); setBusy(true); setErr(''); try { setR(await api.context('That is interesting.', CTX[k][1])) } catch (e: any) { setErr(e.message); setR(null) } finally { setBusy(false) } }
  const up = (d: number) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: .55, delay: d, ease } })
  return (
    <div className="space-y-24 pb-8">
      <section className="pt-10 text-center md:pt-20">
        <motion.h1 {...up(0)} className="mx-auto max-w-3xl font-display text-5xl leading-tight md:text-7xl">Understand language beyond words.</motion.h1>
        <motion.p {...up(.15)} className="mx-auto mt-5 max-w-2xl text-muted md:text-lg">ContextSense is an intelligent natural language understanding platform that explores meaning, intent, sentiment, and context to reveal what language truly communicates.</motion.p>
        <motion.div {...up(.3)} className="mt-8 flex flex-wrap justify-center gap-3"><AnimatedButton onClick={() => go('#/analyze/all')}>Start Analyzing</AnimatedButton>
          <AnimatedButton variant="ghost" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Explore Features</AnimatedButton></motion.div>
      </section>
      <section id="features"><motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" initial="h" whileInView="s" viewport={{ once: true, margin: '-60px' }} transition={{ staggerChildren: .08 }}>
        {FEATURES.map(([Icon, t, d]) => <motion.div key={t} variants={{ h: { opacity: 0, y: 20 }, s: { opacity: 1, y: 0 } }} whileHover={{ y: -3 }} className="group rounded-2xl border border-line bg-surface p-5 transition hover:border-primary/50 hover:shadow-md">
          <Icon className="h-6 w-6 text-primary transition group-hover:translate-x-0.5" /><h3 className="mt-3 font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></motion.div>)}</motion.div></section>
      <AnimatedSection className="glass rounded-3xl border border-line p-6 md:p-8">
        <h2 className="font-display text-3xl">Same sentence, different meaning</h2>
        <p className="mt-2 text-muted">The sentence is always <b className="text-ink">“That is interesting.”</b> Pick a context and the live analysis changes.</p>
        <div className="mt-4 flex flex-wrap gap-2">{CTX.map(([n], k) => <AnimatedButton key={n} variant={i === k ? 'primary' : 'ghost'} onClick={() => demo(k)}>{n}</AnimatedButton>)}</div>
        {i !== null && <p className="mt-3 text-sm text-muted">Context: {CTX[i][1]}</p>}
        {busy && <div className="mt-3"><Loading /></div>}{err && <p role="alert" className="mt-3 text-sm text-bad">{err}</p>}
        {r && !busy && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-xl bg-primary/10 p-4 text-sm"><p>{r.contextual_interpretation}</p><ul className="mt-2 list-disc pl-5">{r.differences.map((d: string) => <li key={d}>{d}</li>)}</ul>
          <p className="mt-2 text-xs text-muted">The system only detects what its rules and models can support; sarcasm in particular often needs human judgement.</p></motion.div>}
      </AnimatedSection>
      <AnimatedSection id="about" className="grid gap-6 md:grid-cols-2"><div><h2 className="font-display text-3xl">About ContextSense</h2><p className="mt-2 text-muted">A 3rd-year Computer Engineering project exploring how context changes the interpretation of language. Every score shown comes from a real computation, and the app says so when it cannot decide.</p></div>
        <div className="flex flex-wrap content-start gap-2">{TECH.map(t => <span key={t} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">{t}</span>)}</div></AnimatedSection>
      <footer className="border-t border-line pt-6 text-sm text-muted"><div className="flex flex-wrap justify-between gap-4"><span>ContextSense · Context-Aware NLU System</span><span>Features · Technology Stack · Contact · Project Information</span></div></footer>
    </div>)
}
