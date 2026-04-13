import { useState, useEffect } from 'react'

const OLLAMA_COMMON_MODELS = ['gemma3', 'gemma3:12b', 'llama3.2', 'llama3.1', 'mistral', 'phi4', 'deepseek-r1']

export default function SettingsPanel({ settings, onUpdate, onClose }) {
  const [ollamaStatus, setOllamaStatus] = useState('idle') // idle | checking | online | offline
  const [availableModels, setAvailableModels] = useState([])

  const checkOllama = async () => {
    setOllamaStatus('checking')
    try {
      const res = await fetch(`${settings.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json()
        const models = (data.models || []).map((m) => m.name)
        setAvailableModels(models)
        setOllamaStatus('online')
      } else {
        setOllamaStatus('offline')
      }
    } catch {
      setOllamaStatus('offline')
    }
  }

  useEffect(() => {
    if (settings.aiMode === 'ollama') checkOllama()
  }, [])

  const statusColor = { idle: '#555', checking: '#e8f429', online: '#4ade80', offline: '#ff4444' }
  const statusLabel = { idle: 'not checked', checking: 'checking...', online: 'online', offline: 'unreachable' }

  return (
    <div
      className="border border-border bg-surface animate-slide-up w-full max-w-lg mx-auto"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs text-accent" style={{ fontFamily: 'var(--font-display)' }}>AI_SETTINGS</span>
        <button onClick={onClose} className="text-dim hover:text-text text-xs">× close</button>
      </div>

      <div className="p-4 space-y-5">

        {/* Mode toggle */}
        <div>
          <p className="text-dim text-xs mb-2">ai provider</p>
          <div className="flex gap-2 flex-col sm:flex-row">
            {['ollama', 'openrouter'].map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  onUpdate({ aiMode: mode })
                  if (mode === 'ollama') setTimeout(checkOllama, 100)
                }}
                className="flex-1 py-3 sm:py-2 text-sm sm:text-xs border transition-colors rounded"
                style={{
                  borderColor: settings.aiMode === mode ? '#e8f429' : '#2a2a2a',
                  color: settings.aiMode === mode ? '#e8f429' : '#666',
                  background: settings.aiMode === mode ? 'rgba(232,244,41,0.05)' : 'transparent',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {mode === 'ollama' ? 'LOCAL (OLLAMA)' : 'CLOUD (OPENROUTER)'}
              </button>
            ))}
          </div>
          <p className="text-dim text-xs mt-2">
            {settings.aiMode === 'ollama'
              ? 'Uses your local Ollama instance. Falls back to OpenRouter if unavailable.'
              : 'Uses OpenRouter free tier (Gemma 3 27B). Subject to rate limits.'}
          </p>
        </div>

        {/* Ollama config */}
        {settings.aiMode === 'ollama' && (
          <div className="space-y-3 border-t border-border pt-4">

            {/* Ollama status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="status-dot" style={{ background: statusColor[ollamaStatus] }} />
                <span className="text-xs text-text">ollama {statusLabel[ollamaStatus]}</span>
              </div>
              <button
                onClick={checkOllama}
                disabled={ollamaStatus === 'checking'}
                className="text-xs text-dim hover:text-accent transition-colors disabled:opacity-40"
              >
                {ollamaStatus === 'checking' ? 'checking...' : 'check now'}
              </button>
            </div>

            {/* Ollama URL */}
            <div>
              <label className="text-dim text-sm block mb-2">ollama url</label>
              <div className="flex items-center border border-muted focus-within:border-accent transition-colors rounded">
                <span className="text-accent text-sm px-3 py-3">›</span>
                <input
                  type="text"
                  value={settings.ollamaUrl}
                  onChange={(e) => onUpdate({ ollamaUrl: e.target.value })}
                  className="flex-1 bg-transparent text-text text-base py-3 pr-3 outline-none"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>

            {/* Model picker */}
            <div>
              <label className="text-dim text-sm block mb-2">
                model
                {availableModels.length > 0 && (
                  <span className="text-accent ml-2">({availableModels.length} installed)</span>
                )}
              </label>

              {availableModels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableModels.map((m) => (
                    <button
                      key={m}
                      onClick={() => onUpdate({ ollamaModel: m })}
                      className="text-sm px-3 py-2 border transition-colors rounded"
                      style={{
                        borderColor: settings.ollamaModel === m ? '#e8f429' : '#2a2a2a',
                        color: settings.ollamaModel === m ? '#e8f429' : '#666',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="flex items-center border border-muted focus-within:border-accent transition-colors rounded mb-3">
                    <span className="text-accent text-sm px-3 py-3">›</span>
                    <input
                      type="text"
                      value={settings.ollamaModel}
                      onChange={(e) => onUpdate({ ollamaModel: e.target.value })}
                      placeholder="e.g. gemma3, llama3.2"
                      className="flex-1 bg-transparent text-text text-base py-3 pr-3 outline-none placeholder:text-muted"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {OLLAMA_COMMON_MODELS.map((m) => (
                      <button
                        key={m}
                        onClick={() => onUpdate({ ollamaModel: m })}
                        className="text-sm px-3 py-1.5 border border-muted text-dim hover:text-text hover:border-accent transition-colors rounded"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {ollamaStatus === 'offline' && (
              <div className="border border-red-900 bg-red-950 bg-opacity-20 p-4 text-sm text-red-400 space-y-2 rounded">
                <p>Ollama is not reachable at {settings.ollamaUrl}</p>
                <p className="text-dim">Make sure Ollama is running: <span className="text-text">ollama serve</span></p>
                <p className="text-dim">Syncing will automatically fall back to OpenRouter.</p>
              </div>
            )}
          </div>
        )}

        {/* OpenRouter note */}
        {settings.aiMode === 'openrouter' && (
          <div className="border border-muted p-4 text-sm text-dim space-y-2 rounded">
            <p>Model: <span className="text-text">google/gemma-4-26b-a4b-it</span></p>
            <p>If you hit 429 rate limits, switch to Ollama or wait a few minutes.</p>
          </div>
        )}

      </div>
    </div>
  )
}
