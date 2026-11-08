import { useMemo, useState, useEffect, useCallback } from 'react'
import { ReactFlow, ReactFlowProvider, Background, Controls, useNodesState, useEdgesState, useReactFlow, MarkerType } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { RotateCcw } from 'lucide-react'
import { ENT_COLORS } from './ui'
import type { R } from '../api'

function Inner({ graph }: { graph: R }) {
  const [sel, setSel] = useState<string | null>(null)
  const { fitView } = useReactFlow()
  const layout = useMemo(() => graph.nodes.map((n: R, i: number, a: R[]) => {
    const ang = (2 * Math.PI * i) / a.length, rad = 60 + a.length * 28
    return { id: n.id, position: { x: a.length === 1 ? 0 : Math.cos(ang) * rad * 1.5, y: a.length === 1 ? 0 : Math.sin(ang) * rad }, data: { label: n.label, type: n.type } }
  }), [graph])
  const [nodes, setNodes, onNodesChange] = useNodesState<any>(layout)
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([])
  const near = useCallback((id: string | null) => new Set(id ? graph.edges.flatMap((e: R) => (e.source === id || e.target === id ? [e.source, e.target] : [])).concat(id) : []), [graph])
  useEffect(() => {
    const nb = near(sel)
    setNodes(layout.map((n: R) => {
      const c = ENT_COLORS[n.data.type] ?? 'rgb(var(--primary))', on = !sel || nb.has(n.id)
      return { ...n, style: { background: 'rgb(var(--surface))', color: 'rgb(var(--text))', border: `2px solid ${c}`, borderRadius: 12, padding: '6px 12px', fontSize: 13, fontWeight: 600, opacity: on ? 1 : .25, transition: 'opacity .25s', boxShadow: sel === n.id ? `0 0 0 4px ${c}44` : undefined }, title: `${n.data.label} · ${n.data.type}` }
    }))
    setEdges(graph.edges.map((e: R, i: number) => {
      const on = !sel || e.source === sel || e.target === sel
      return { id: `e${i}`, source: e.source, target: e.target, label: e.label, animated: !!sel && on, markerEnd: { type: MarkerType.ArrowClosed, color: 'rgb(var(--primary))' },
        style: { stroke: 'rgb(var(--primary))', strokeWidth: sel && on ? 2.5 : 1.5, opacity: on ? 1 : .15, transition: 'opacity .25s' },
        labelStyle: { fill: 'rgb(var(--text))', fontSize: 11, fontWeight: 600 }, labelBgStyle: { fill: 'rgb(var(--surface))' } }
    }))
  }, [sel, layout, graph])
  useEffect(() => { setTimeout(() => fitView({ padding: .3, duration: 400 }), 50) }, [layout])
  const reset = () => { setSel(null); setNodes(layout); fitView({ padding: .3, duration: 400 }) }
  return (
    <div className="relative h-80 overflow-hidden rounded-xl border border-line">
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={(_, n) => setSel(n.id)} onPaneClick={() => setSel(null)} fitView minZoom={.3} maxZoom={2.5} proOptions={{ hideAttribution: true }}>
        <Background color="rgb(var(--border))" /><Controls showInteractive={false} />
      </ReactFlow>
      <button onClick={reset} className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium hover:border-primary"><RotateCcw className="h-3 w-3" />Reset</button>
    </div>)
}
export default function KnowledgeGraph({ graph }: { graph: R }) {
  if (!graph?.nodes?.length) return <p className="text-sm text-muted">Not enough structure to build a graph for this text.</p>
  return <div><ReactFlowProvider><Inner key={JSON.stringify(graph)} graph={graph} /></ReactFlowProvider>
    {graph.note && <p className="mt-2 text-xs text-muted">{graph.note}</p>}
    <p className="mt-1 text-xs text-muted">Drag nodes, scroll to zoom, click a node to highlight its relations.</p></div>
}
