'use client'
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, DollarSign, TrendingUp, Zap, Database } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { OpenClawInstance } from '@/types'

interface CostEntry {
  date: string
  inputTokens: number
  outputTokens: number
  cacheTokens: number
  model: string
}

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3,   output: 15 },
  'claude-opus-4-8':   { input: 15,  output: 75 },
  'claude-haiku-4-5':  { input: 0.8, output: 4  },
}

function calcCost(e: CostEntry) {
  const r = MODEL_RATES[e.model] ?? MODEL_RATES['claude-sonnet-4-6']
  return (e.inputTokens * r.input + e.outputTokens * r.output) / 1_000_000
}

export function CostDashboard({ instance }: { instance: OpenClawInstance }) {
  const [entries, setEntries] = useState<CostEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const scanRes = await fetch(`/api/ssh/${instance.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exec', args: { command: `ls -1 "${instance.workspacePath}/logs/" 2>/dev/null | grep -E "^[0-9]{4}-[0-9]{2}-[0-9]{2}" | tail -14` } }),
      })
      const scanData = await scanRes.json()
      if (scanData.error) throw new Error(scanData.error)
      const logFiles = (scanData.stdout || '').trim().split('\n').filter(Boolean)
      const parsed: CostEntry[] = []
      for (const f of logFiles.slice(-14)) {
        const catRes = await fetch(`/api/ssh/${instance.id}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'exec', args: { command: `cat "${instance.workspacePath}/logs/${f}" 2>/dev/null | tail -500` } }),
        })
        const catData = await catRes.json()
        const lines = (catData.stdout || '').trim().split('\n').filter(Boolean)
        let dayIn = 0, dayOut = 0, dayCache = 0, dayModel = 'claude-sonnet-4-6'
        for (const line of lines) {
          try {
            const obj = JSON.parse(line)
            if (obj.inputTokens)  dayIn    += obj.inputTokens
            if (obj.outputTokens) dayOut   += obj.outputTokens
            if (obj.cacheTokens)  dayCache += obj.cacheTokens
            if (obj.model)        dayModel  = obj.model
          } catch { /* skip */ }
        }
        if (dayIn + dayOut > 0) {
          parsed.push({ date: f.replace('.jsonl', '').slice(0, 10), inputTokens: dayIn, outputTokens: dayOut, cacheTokens: dayCache, model: dayModel })
        }
      }
      setEntries(parsed)
    } catch (e) { setError(e instanceof Error ? e.message : 'failed') }
    finally { setLoading(false) }
  }, [instance.id, instance.workspacePath])

  useEffect(() => { load() }, [load])

  const totalCost  = entries.reduce((s, e) => s + calcCost(e), 0)
  const totalTok   = entries.reduce((s, e) => s + e.inputTokens + e.outputTokens, 0)
  const totalCache = entries.reduce((s, e) => s + e.cacheTokens, 0)
  const avgDaily   = entries.length > 0 ? totalCost / entries.length : 0
  const chartData  = entries.map(e => ({ date: e.date.slice(5), cost: parseFloat(calcCost(e).toFixed(4)) }))

  const stats = [
    { icon: DollarSign, label: 'Total Cost',   value: `$${totalCost.toFixed(4)}`,           sub: `~$${avgDaily.toFixed(4)}/day` },
    { icon: Zap,        label: 'Total Tokens',  value: (totalTok / 1000).toFixed(1) + 'K',  sub: undefined },
    { icon: Database,   label: 'Cache Tokens',  value: (totalCache / 1000).toFixed(1) + 'K', sub: 'saved from billing' },
    { icon: TrendingUp, label: 'Days Tracked',  value: String(entries.length),               sub: undefined },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Cost Dashboard</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{instance.name} · last {entries.length} days</p>
        </div>
        <button
          onClick={load} disabled={loading}
          style={{ padding: 7, borderRadius: 7, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        {error && (
          <div style={{ fontSize: 13, color: 'var(--error)', background: 'var(--error-dim)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <s.icon size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{loading ? '—' : s.value}</div>
              {s.sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Daily Cost (USD)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={22}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toFixed(4)}`, 'cost']}
                />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill="var(--accent)" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {!loading && entries.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <DollarSign size={36} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
            <p style={{ fontSize: 14 }}>No cost data found.</p>
            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-dim)' }}>Usage logs appear in <code>~/.openclaw/logs/</code> as dated .jsonl files.</p>
          </div>
        )}
      </div>
    </div>
  )
}
