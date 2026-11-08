export type R = any
async function call(path: string, method = 'GET', body?: unknown): Promise<R> {
  let res: Response
  try { res = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }) }
  catch { throw new Error('Cannot reach the backend. Start it with: uvicorn app.main:app --reload (in /backend).') }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : data.message || (data.detail?.[0]?.msg ?? `Request failed (${res.status})`))
  return data
}
export const api = {
  analyze: (text: string, context = '') => call('/analyze', 'POST', { text, context }),
  context: (text: string, context: string) => call('/context-analyze', 'POST', { text, context }),
  similarity: (sentence1: string, sentence2: string) => call('/similarity', 'POST', { sentence1, sentence2 }),
  conversation: (message: string, conversation_id?: string) => call('/conversation', 'POST', { message, conversation_id }),
  history: (q = '', kind = '', sort = 'newest') => call(`/history?q=${encodeURIComponent(q)}&kind=${kind}&sort=${sort}`),
  del: (id: number) => call(`/history/${id}`, 'DELETE'),
  clear: () => call('/history', 'DELETE'),
  health: () => call('/health'),
}
