import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Send, RotateCcw, Link2 } from 'lucide-react'
import { api, R } from '../api'
import { AnimatedButton, AnimatedCard, Tag, Empty } from '../components/ui'

export default function Conversation() {
  const [msgs, setMsgs] = useState<R[]>([]); const [inp, setInp] = useState(''); const [cid, setCid] = useState<string>(); const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(''); const [summary, setSummary] = useState(''); const box = useRef<HTMLDivElement>(null)
  useEffect(() => { const b = box.current; if (b && b.scrollHeight - b.scrollTop - b.clientHeight < 140) b.scrollTo({ top: b.scrollHeight, behavior: 'smooth' }) }, [msgs, busy])
  const send = async () => {
    const m = inp.trim(); if (!m || busy) return
    setInp(''); setErr(''); setBusy(true); setMsgs(x => [...x, { role: 'user', text: m }])
    try {
      const r = await api.conversation(m, cid); setCid(r.conversation_id); setSummary(r.summary)
      setMsgs(x => { const y = [...x]; y[y.length - 1] = { role: 'user', text: m, refs: r.references, intent: r.intent, sentiment: r.sentiment }; return [...y, { role: 'bot', text: r.reply }] })
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const render = (m: R) => {
    if (!m.refs?.length) return m.text
    const out: any[] = []; let i = 0
    m.refs.forEach((r: R, k: number) => { out.push(m.text.slice(i, r.start)); out.push(<mark key={k} title={r.resolved_to ? `→ ${r.resolved_to}` : 'unresolved'} className={`rounded px-1 ${r.resolved_to ? 'bg-ok/25' : 'bg-warn/25'} text-inherit`}>{r.pronoun}</mark>); i = r.end })
    return [...out, m.text.slice(i)]
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="font-display text-3xl">Conversation analyzer</h1>
        <AnimatedButton variant="ghost" onClick={() => { setMsgs([]); setCid(undefined); setSummary('') }}><RotateCcw className="h-4 w-4" />New conversation</AnimatedButton></div>
      <AnimatedCard className="!p-0">
        <div ref={box} className="h-[26rem] space-y-3 overflow-y-auto p-4" aria-live="polite">
          {!msgs.length && <Empty title="Start talking" hint="Try: “Sarah purchased a new phone.” then “It has an excellent camera.”" />}
          {msgs.map((m, i) => <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-gradient-to-r from-primary to-secondary text-white' : 'border border-line bg-bg/60'}`}>
              <p>{m.role === 'user' ? render(m) : m.text}</p>
              {m.refs?.filter((r: R) => r.resolved_to).map((r: R) => <p key={r.start} className="mt-1 flex items-center gap-1 text-xs opacity-90"><Link2 className="h-3 w-3" />“{r.pronoun}” → {r.resolved_to}</p>)}
              {m.intent && <div className="mt-1.5 flex gap-1.5 text-[11px] opacity-90"><span>{m.intent}</span>·<span>{m.sentiment}</span></div>}</div></motion.div>)}
          {busy && <div className="flex gap-1 px-2">{[0, 1, 2].map(i => <motion.i key={i} className="h-2 w-2 rounded-full bg-muted" animate={{ opacity: [.2, 1, .2] }} transition={{ duration: 1, repeat: Infinity, delay: i * .2 }} />)}</div>}
        </div>
        <div className="flex gap-2 border-t border-line p-3">
          <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} aria-label="Message" placeholder="Type a message…" className="flex-1 rounded-xl border border-line bg-bg/60 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
          <AnimatedButton onClick={send} loading={busy} disabled={!inp.trim()} aria-label="Send"><Send className="h-4 w-4" /></AnimatedButton></div>
      </AnimatedCard>
      {err && <div role="alert" className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-bad">{err}</div>}
      {summary && <AnimatedCard title="Conversation summary"><p className="text-sm">{summary}</p></AnimatedCard>}
    </div>)
}
