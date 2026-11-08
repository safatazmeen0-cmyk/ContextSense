import { lazy, Suspense, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sun, Moon, Settings as Cog, Menu, FileText, Layers, Target, Heart, Tags, Network, MessagesSquare, History as Hist, ChevronLeft, AlertTriangle, Palette } from 'lucide-react'
import { THEMES, useTheme } from './theme'
import { AmbientBackground, Loading } from './components/ui'
const Home = lazy(() => import('./pages/Home')); const Analyze = lazy(() => import('./pages/Analyze')); const Conversation = lazy(() => import('./pages/Conversation'))
const History = lazy(() => import('./pages/History')); const Settings = lazy(() => import('./pages/Settings'))

const SIDE = [['#/analyze/all', 'Text analysis', FileText], ['#/analyze/context', 'Context analysis', Layers], ['#/analyze/intent', 'Intent detection', Target], ['#/analyze/sentiment', 'Sentiment analysis', Heart],
  ['#/analyze/ambiguity', 'Ambiguity detection', AlertTriangle], ['#/analyze/entities', 'Entity recognition', Tags], ['#/analyze/relations', 'Semantic relationships', Network], ['#/conversation', 'Conversation analyzer', MessagesSquare],
  ['#/history', 'Analysis history', Hist], ['#/settings', 'Settings', Cog]] as const
const NAV = [['#/', 'Home'], ['#/analyze/all', 'Analyze Text'], ['#/conversation', 'Conversation'], ['#/history', 'History'], ['#/about', 'About']]

export default function App() {
  const [hash, setHash] = useState(location.hash || '#/'); const [scrolled, setScrolled] = useState(false); const [side, setSide] = useState(true); const [mob, setMob] = useState(false); const [tm, setTm] = useState(false)
  const { theme, resolved, setTheme } = useTheme()
  useEffect(() => { const h = () => { setHash(location.hash || '#/'); setMob(false) }; const s = () => setScrolled(scrollY > 8); addEventListener('hashchange', h); addEventListener('scroll', s, { passive: true }); return () => { removeEventListener('hashchange', h); removeEventListener('scroll', s) } }, [])
  const go = (h: string) => { location.hash = h }
  const [, route, arg] = hash.split('/'); const home = !route || route === 'about'
  useEffect(() => { if (route === 'about') setTimeout(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }), 300) }, [route])
  const page = route === 'analyze' ? <Analyze tab={arg || 'all'} /> : route === 'conversation' ? <Conversation /> : route === 'history' ? <History go={go} /> : route === 'settings' ? <Settings /> : <Home go={go} />
  return (
    <>
      <AmbientBackground />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-2">Skip to content</a>
      <header className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300 ${scrolled ? 'glass border-line' : 'border-transparent bg-transparent'}`}>
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          {!home && <button className="md:hidden" aria-label="Menu" onClick={() => setMob(!mob)}><Menu className="h-5 w-5" /></button>}
          <motion.a href="#/" whileHover={{ rotate: -3, scale: 1.03 }} className="flex items-center gap-2 font-display text-lg font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white"><Brain className="h-4 w-4" /></span>ContextSense</motion.a>
          <nav className="ml-4 hidden gap-1 md:flex" aria-label="Main">{NAV.map(([h, n]) => { const on = (h === '#/' && home && route !== 'about') || (h !== '#/' && hash.startsWith(h.split('/').slice(0, 2).join('/'))); return (
            <a key={n} href={h} className="relative rounded-lg px-3 py-1.5 text-sm text-muted transition hover:text-ink">{on && <motion.span layoutId="nav" className="absolute inset-0 rounded-lg bg-primary/10" />}<span className={`relative ${on ? 'font-semibold text-primary' : ''}`}>{n}</span></a>) })}</nav>
          <div className="ml-auto flex items-center gap-1">
            <div className="relative"><button onClick={() => setTm(!tm)} aria-label="Theme" aria-expanded={tm} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-primary/10 hover:text-primary">{resolved === 'dark' || resolved === 'midnight' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button>
              <AnimatePresence>{tm && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .18 }} className="glass absolute right-0 mt-2 w-44 rounded-xl border border-line p-1.5 shadow-lg">
                {THEMES.map(t => <button key={t.id} onClick={() => { setTheme(t.id); setTm(false) }} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition hover:bg-primary/10 ${theme === t.id ? 'font-semibold text-primary' : ''}`}><Palette className="h-3.5 w-3.5" style={{ color: t.accent }} />{t.name}</button>)}</motion.div>}</AnimatePresence></div>
            <a href="#/settings" aria-label="Settings" className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-primary/10 hover:text-primary"><Cog className="h-4 w-4" /></a></div></div>
        {home && <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">{NAV.map(([h, n]) => <a key={n} href={h} className="whitespace-nowrap rounded-lg px-3 py-1 text-sm text-muted">{n}</a>)}</nav>}
      </header>
      <div className={`mx-auto flex max-w-7xl gap-6 px-4 ${home ? 'pt-24 md:pt-16' : 'pt-20'}`}>
        {!home && <>
          <aside className={`${mob ? 'fixed inset-y-0 left-0 z-30 w-64 pt-16' : 'hidden'} glass shrink-0 border-r border-line md:sticky md:top-20 md:block md:h-[calc(100vh-6rem)] md:rounded-2xl md:border md:pt-0 ${side ? 'md:w-60' : 'md:w-16'} transition-[width] duration-300`}>
            <button onClick={() => setSide(!side)} aria-label="Collapse sidebar" className="m-2 hidden h-8 w-8 place-items-center rounded-lg text-muted hover:bg-primary/10 md:grid"><ChevronLeft className={`h-4 w-4 transition ${side ? '' : 'rotate-180'}`} /></button>
            <nav className="space-y-0.5 p-2" aria-label="Sections">{SIDE.map(([h, n, Icon]) => { const on = hash === h || (h === '#/analyze/all' && hash === '#/analyze'); return (
              <a key={h} href={h} title={n} aria-current={on ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${on ? 'bg-primary/10 font-semibold text-primary' : 'text-muted hover:bg-primary/5 hover:text-ink'}`}><Icon className="h-4 w-4 shrink-0" /><span className={side ? '' : 'md:hidden'}>{n}</span></a>) })}</nav></aside>
          {mob && <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setMob(false)} />}</>}
        <main id="main" className="min-w-0 flex-1 pb-16">
          <Suspense fallback={<Loading text="Loading…" />}><AnimatePresence mode="wait"><motion.div key={route + (arg || '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .3 }}>{page}</motion.div></AnimatePresence></Suspense></main>
      </div>
    </>)
}
