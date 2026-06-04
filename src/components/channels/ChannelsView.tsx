'use client'
import { useState, useEffect, useCallback } from 'react'
import { Radio, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import type { OpenClawInstance } from '@/types'

interface Channel { type: string; enabled: boolean }

const CHANNEL_ICONS: Record<string, string> = {
  slack: '💬', discord: '🎮', telegram: '✈️', whatsapp: '📱',
  teams: '🏢', gmail: '📧', browser: '🌐', anthropic: '🤖',
}

export function ChannelsView({ instance }: { instance: OpenClawInstance }) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawConfig, setRawConfig] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/ssh/${instance.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exec', args: { command: `cat "${instance.workspacePath}/openclaw.json" 2>/dev/null || cat ~/.openclaw/openclaw.json 2>/dev/null || echo "{}"` } }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const raw = data.stdout?.trim() || '{}'
      setRawConfig(raw)
      try {
        const config = JSON.parse(raw)
        const plugins: Channel[] = (config.plugins || []).map((p: string | { name?: string; enabled?: boolean }) => {
          if (typeof p === 'string') return { type: p, enabled: true }
          return { type: p.name ?? String(p), enabled: p.enabled !== false }
        })
        setChannels(plugins)
      } catch { setChannels([]) }
    } catch (e) { setError(e instanceof Error ? e.message : 'failed') }
    finally { setLoading(false) }
  }, [instance.id, instance.workspacePath])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Radio size={15} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Channels & Plugins</h1>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{instance.name}</span>
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

        {!loading && channels.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 28 }}>
            {channels.map(ch => (
              <div key={ch.type} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 22 }}>{CHANNEL_ICONS[ch.type] ?? '🔌'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, textTransform: 'capitalize' }}>{ch.type}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>plugin</div>
                </div>
                {ch.enabled
                  ? <CheckCircle size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  : <XCircle size={15} style={{ color: 'var(--error)', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        )}

        {!loading && channels.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', marginBottom: 28 }}>
            <Radio size={36} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
            <p style={{ fontSize: 14 }}>No plugins found in openclaw.json</p>
          </div>
        )}

        {rawConfig && rawConfig !== '{}' && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>RAW CONFIG</p>
            <pre style={{ fontSize: 12, fontFamily: "'SF Mono','Fira Code',monospace", lineHeight: 1.6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, overflowX: 'auto', color: '#a3e635', maxHeight: 400 }}>
              {rawConfig}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
