import { useState, useEffect } from 'react'

const OLLAMA_COMMON_MODELS = ['gemma3', 'gemma3:12b', 'llama3.2', 'llama3.1', 'mistral', 'phi4', 'deepseek-r1']

export default function SettingsPanel({ settings, onUpdate, onClose }) {
  const [ollamaStatus, setOllamaStatus] = useState('idle') // idle | checking | online | offline
  const [availableModels, setAvailableModels] = useState([])
  const [weatherQuery, setWeatherQuery] = useState(settings.manualLocation || '')
  const [isSearchingWeather, setIsSearchingWeather] = useState(false)

  const handleExport = () => {
    const data = {
      settings: localStorage.getItem('venn_settings'),
      topics: localStorage.getItem('venn_topics'),
      packages: localStorage.getItem('venn_packages')
    }
    navigator.clipboard.writeText(JSON.stringify(data))
    alert('Dashboard data copied to clipboard!\n\nOpen Venn on your destination site (or phone), open settings, and click IMPORT DATA to paste this.')
  }

  const handleImport = () => {
    const input = prompt('Paste your exported dashboard JSON data here:')
    if (!input) return
    try {
      const data = JSON.parse(input)
      if (data.settings) localStorage.setItem('venn_settings', data.settings)
      if (data.topics) localStorage.setItem('venn_topics', data.topics)
      if (data.packages) localStorage.setItem('venn_packages', data.packages)

      // Notify the dashboard to read the new data and simultaneously push it to the remote cloud
      window.dispatchEvent(new Event('venn_sync_updated'))
      window.dispatchEvent(new Event('venn_needs_sync'))
      alert('Data imported and fully synced with the Cloud Backend!')
    } catch (err) {
      alert('Invalid data format. Import failed.')
    }
  }

  const searchCity = async () => {
    if (!weatherQuery.trim()) return
    setIsSearchingWeather(true)
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherQuery)}&count=1&language=en&format=json`)
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        onUpdate({
          weatherMode: 'manual',
          manualLocation: result.name,
          manualLat: result.latitude,
          manualLon: result.longitude
        })
        setWeatherQuery(result.name)
      } else {
        alert('City not found. Try a different name.')
      }
    } catch (err) {
      alert('Search failed. Check your connection.')
    } finally {
      setIsSearchingWeather(false)
    }
  }

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
        <span className="text-xs text-accent" style={{ fontFamily: 'var(--font-display)' }}>Settings</span>
        <button onClick={onClose} className="text-dim hover:text-text text-xs">× close</button>
      </div>

      <div className="p-4 space-y-5">

        {/* AI Settings Section */}
        <div className="space-y-4">
          <p className="text-dim text-sm" style={{ fontFamily: 'var(--font-display)' }}>AI_SETTINGS</p>
          <div>
            <p className="text-dim text-[10px] mb-2 uppercase tracking-tighter">ai provider</p>
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

        {/* Widget Settings */}
        <div className="border-t border-border pt-4 space-y-4">
          <p className="text-dim text-sm" style={{ fontFamily: 'var(--font-display)' }}>WIDGET_SETTINGS</p>

          {/* Default Topic Type */}
          <div>
            <p className="text-dim text-xs mb-2">default topic type</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'auto', label: 'Auto' },
                { value: 'cinema', label: 'Cinema' },
                { value: 'briefing', label: 'Briefing' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate({ defaultTopicType: opt.value })}
                  className="text-xs px-3 py-1.5 border rounded transition-colors"
                  style={{
                    borderColor: settings.defaultTopicType === opt.value ? '#e8f429' : '#2a2a2a',
                    color: settings.defaultTopicType === opt.value ? '#e8f429' : '#666',
                    background: settings.defaultTopicType === opt.value ? 'rgba(232,244,41,0.05)' : 'transparent',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-dim text-xs">show type badge on cards</span>
              <input
                type="checkbox"
                checked={settings.showTypeBadge}
                onChange={(e) => onUpdate({ showTypeBadge: e.target.checked })}
                className="accent-accent"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-dim text-xs">show confidence score</span>
              <input
                type="checkbox"
                checked={settings.showConfidence}
                onChange={(e) => onUpdate({ showConfidence: e.target.checked })}
                className="accent-accent"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-dim text-xs">show raw JSON (debug)</span>
              <input
                type="checkbox"
                checked={settings.showRawJson}
                onChange={(e) => onUpdate({ showRawJson: e.target.checked })}
                className="accent-accent"
              />
            </label>
          </div>
        </div>

        {/* Chat Settings */}
        <div className="border-t border-border pt-4 space-y-4">
          <p className="text-dim text-sm" style={{ fontFamily: 'var(--font-display)' }}>CHAT_SETTINGS</p>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-dim text-xs">enable chat on widgets</span>
              <input
                type="checkbox"
                checked={settings.enableChat}
                onChange={(e) => onUpdate({ enableChat: e.target.checked })}
                className="accent-accent"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-dim text-xs">clear chat history on sync</span>
              <input
                type="checkbox"
                checked={settings.clearChatOnSync}
                onChange={(e) => onUpdate({ clearChatOnSync: e.target.checked })}
                className="accent-accent"
              />
            </label>
          </div>
        </div>

        {/* Weather Settings */}
        <div className="border-t border-border pt-4 space-y-4">
          <p className="text-dim text-sm" style={{ fontFamily: 'var(--font-display)' }}>WEATHER_SETTINGS</p>

          <div className="flex gap-2">
            {['auto', 'manual'].map((mode) => (
              <button
                key={mode}
                onClick={() => onUpdate({ weatherMode: mode })}
                className="flex-1 py-1.5 text-[10px] border transition-colors rounded uppercase tracking-widest"
                style={{
                  borderColor: settings.weatherMode === mode ? '#e8f429' : '#1e1e1e',
                  color: settings.weatherMode === mode ? '#e8f429' : '#666',
                  background: settings.weatherMode === mode ? 'rgba(232,244,41,0.05)' : 'transparent',
                }}
              >
                {mode === 'auto' ? 'Live Geolocation' : 'Manual City'}
              </button>
            ))}
          </div>

          {settings.weatherMode === 'manual' && (
            <div className="flex gap-2 animate-in fade-in duration-300">
              <input
                type="text"
                value={weatherQuery}
                placeholder="Enter city (e.g. London)"
                onChange={(e) => setWeatherQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchCity()}
                className="flex-1 bg-surface border border-muted px-3 py-2 text-xs outline-none focus:border-accent text-text"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <button
                onClick={searchCity}
                disabled={isSearchingWeather}
                className="px-3 border border-muted hover:border-accent text-[10px] text-dim hover:text-accent transition-colors disabled:opacity-50"
              >
                {isSearchingWeather ? '...' : 'SET'}
              </button>
            </div>
          )}
          <p className="text-[9px] text-dim italic">
            {settings.weatherMode === 'auto'
              ? '› Requests browser location permission on load.'
              : `› Locked to ${settings.manualLocation || 'nothing set'}.`}
          </p>
        </div>

        {/* Data Management */}
        <div className="border-t border-border pt-4 mt-4 space-y-4 pb-2">
          <p className="text-dim text-sm" style={{ fontFamily: 'var(--font-display)' }}>DATA_MANAGEMENT</p>
          <p className="text-xs text-dim">
            Transfer your dashboard data manually between isolated domains (e.g., from localhost to production 😉).
          </p>
          <div className="flex gap-2">
            <button onClick={handleExport} className="flex-1 text-xs px-3 py-2 border border-muted hover:border-accent text-dim hover:text-accent transition-colors rounded">
              [ EXPORT TO CLIPBOARD ]
            </button>
            <button onClick={handleImport} className="flex-1 text-xs px-3 py-2 border border-muted hover:border-accent text-dim hover:text-accent transition-colors rounded">
              [ IMPORT FROM CLIPBOARD ]
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
