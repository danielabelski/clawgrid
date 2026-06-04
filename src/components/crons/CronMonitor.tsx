'use client'
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Play, Pause, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import type { OpenClawInstance } from '@/types'

interface CronEntry {
  id: string
  name: string
  schedule: string
  enabled: boolean
  lastRun?: string
  lastStatus?: 'ok' | 'error' | 'running'
  lastError?: string
  nextRun?: string
  runCount?: number
}

function StatusIcon({ status }: { status?: string }) {
  if (status === 'ok')      return <CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
  if (status === 'error')   return <AlertCircle size={14} style={{ color: 'var(--error)', flexShrink: 0 }} />
  if (status === 'running') return <RefreshCw size={14} style={{ color: 'var(--accent)', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
  return <Clock size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
}

export function CronMonitor({ instance }: { instance: OpenClawInstance }) {
  const [crons, setCrons] = useState<CronEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/ssh/${instance.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exec', args: { command: `cat "${instance.workspacePath}/crons.json" 2>/dev/null || echo "[]"` } }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const raw = data.stdout?.trim() || '[]'
      try {
        const parsed = JSON.parse(raw)
        setCrons(Array.isArray(parsed) ? parsed : (parsed.crons ?? []))
      } catch { setCrons([]) }
      setLastRefresh(new Date().toLocaleTimeString())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load')
    } finally { setLoading(false) }
  }, [instance.id, instance.workspacePath])

  useEffect(() => { load() }, [load])

  async function toggleCron(cron: CronEntry) {
    await fetch(`/api/ssh/${instance.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'exec', args: { command: `node -e "const fs=require('fs'),p='${instance.workspacePath}/crons.json',d=JSON.parse(fs.readFileSync(p,'utf8')),a=Array.isArray(d)?d:(d.crons??[]),i=a.findIndex(c=>c.id==='${cron.id}');if(i>=0)a[i].enabled=!a[i].enabled;if(Array.isArray(d))fs.writeFileSync(p,JSON.stringify(a,null,2));else{d.crons=a;fs.writeFileSync(p,JSON.stringify(d,null,2));}"` } }),
    })
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Cron Monitor</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {instance.name} · {crons.length} job{crons.length !== 1 ? 's' : ''}
            {lastRefresh && <span> · refreshed {lastRefresh}</span>}
          </p>
        </div>
        <button
          onClick={load} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        {error && (
          <div style={{ fontSize: 13, color: 'var(--error)', background: 'var(--error-dim)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading && crons.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 64, borderRadius: 10, background: 'var(--surface)', animation: 'pulse 2s cubic-bezier(.4,0,.6,1) infinite' }} />
            ))}
          </div>
        )}

        {!loading && crons.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <Clock size={36} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
            <p style={{ fontSize: 14 }}>No cron jobs found for this instance.</p>
            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-dim)' }}>Cron jobs are defined in <code>crons.json</code> in the workspace.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {crons.map(cron => (
            <div key={cron.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <StatusIcon status={cron.lastStatus} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{cron.name}</span>
                  {!cron.enabled && (
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text-dim)' }}>paused</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 3, fontSize: 12, color: 'var(--text-muted)' }}>
                  <code style={{ fontSize: 11 }}>{cron.schedule}</code>
                  {cron.lastRun && <span>last: {new Date(cron.lastRun).toLocaleString()}</span>}
                  {cron.nextRun && <span>next: {new Date(cron.nextRun).toLocaleString()}</span>}
                  {cron.runCount !== undefined && <span>{cron.runCount} runs</span>}
                </div>
                {cron.lastError && (
                  <p style={{ fontSize: 11, marginTop: 3, color: 'var(--error)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cron.lastError}</p>
                )}
              </div>
              <button
                onClick={() => toggleCron(cron)}
                style={{ padding: 7, borderRadius: 7, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
                title={cron.enabled ? 'Pause' : 'Resume'}
              >
                {cron.enabled ? <Pause size={12} /> : <Play size={12} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
