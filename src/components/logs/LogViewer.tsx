'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, Terminal, RotateCcw } from 'lucide-react'
import type { OpenClawInstance } from '@/types'

export function LogViewer({ instance }: { instance: OpenClawInstance }) {
  const [logs, setLogs] = useState('')
  const [stats, setStats] = useState('')
  const [lines, setLines] = useState(200)
  const [tab, setTab] = useState<'logs' | 'stats'>('logs')
  const [loading, setLoading] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [restartMsg, setRestartMsg] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ssh/${instance.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logs', args: { lines } }),
      })
      const data = await res.json()
      setLogs(data.logs ?? data.error ?? 'No output')
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50)
    } finally { setLoading(false) }
  }, [instance.id, lines])

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ssh/${instance.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stats' }),
      })
      const data = await res.json()
      setStats(data.stats ?? data.error ?? 'No output')
    } finally { setLoading(false) }
  }, [instance.id])

  useEffect(() => { tab === 'logs' ? loadLogs() : loadStats() }, [tab, loadLogs, loadStats])

  async function restart() {
    if (!confirm(`Restart OpenClaw gateway on ${instance.name}?`)) return
    setRestarting(true); setRestartMsg('')
    try {
      const res = await fetch(`/api/ssh/${instance.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart' }),
      })
      const data = await res.json()
      setRestartMsg(data.code === 0 ? 'Gateway restarted successfully.' : `Exit ${data.code}: ${data.stderr}`)
      setTimeout(loadLogs, 3000)
    } catch (e) { setRestartMsg(e instanceof Error ? e.message : 'error') }
    finally { setRestarting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Terminal size={14} style={{ color: 'var(--accent)' }} />
          <div style={{ display: 'flex', gap: 2 }}>
            {(['logs', 'stats'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: tab === t ? 500 : 400, background: tab === t ? 'var(--surface2)' : 'transparent', color: tab === t ? 'var(--text)' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
              >
                {t === 'logs' ? 'Gateway Logs' : 'System Stats'}
              </button>
            ))}
          </div>
          {tab === 'logs' && (
            <select
              value={lines}
              onChange={e => setLines(Number(e.target.value))}
              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)', width: 'auto' }}
            >
              {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n} lines</option>)}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={restart} disabled={restarting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, fontSize: 12, background: 'var(--error-dim)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}
          >
            <RotateCcw size={11} style={{ animation: restarting ? 'spin 1s linear infinite' : 'none' }} />
            Restart Gateway
          </button>
          <button
            onClick={() => tab === 'logs' ? loadLogs() : loadStats()} disabled={loading}
            style={{ padding: 7, borderRadius: 7, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {restartMsg && (
        <div style={{ padding: '8px 16px', fontSize: 12, background: 'var(--surface2)', color: restartMsg.includes('success') ? 'var(--success)' : 'var(--error)', flexShrink: 0 }}>
          {restartMsg}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: 16, background: '#0a0c10' }}>
        <pre style={{ fontSize: 12, lineHeight: 1.65, whiteSpace: 'pre-wrap', fontFamily: "'SF Mono','Fira Code',monospace", color: '#a3e635', margin: 0 }}>
          {tab === 'logs'
            ? (logs || (loading ? 'Loading…' : 'No logs'))
            : (stats || (loading ? 'Loading…' : 'No data'))}
        </pre>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
