import { useState } from 'react'

export default function ErrorWidget({ error, parseError, rawResponse, onRetry, onSwitchMode }) {
  const [showDebug, setShowDebug] = useState(false)

  return (
    <div className="space-y-4">
      {/* Error Header */}
      <div className="flex items-center gap-2">
        <span className="text-red-400 text-xl">⚠</span>
        <span className="text-red-400 text-sm font-medium" style={{ fontFamily: 'var(--font-display)' }}>
          PARSE ERROR
        </span>
      </div>

      {/* Error Message */}
      <div className="bg-red-950/20 border border-red-900/50 p-3 rounded">
        <p className="text-red-400 text-xs">
          {error || parseError || 'Failed to parse AI response'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onRetry}
          className="text-xs px-3 py-2 border border-accent text-accent rounded hover:bg-accent hover:text-bg transition-colors"
        >
          ⟳ Retry
        </button>
        <button
          onClick={onSwitchMode}
          className="text-xs px-3 py-2 border border-muted text-dim rounded hover:border-text hover:text-text transition-colors"
        >
          Switch to Text Mode
        </button>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs px-3 py-2 border border-muted text-dim rounded hover:border-text hover:text-text transition-colors"
        >
          {showDebug ? '− Hide Debug' : '+ Show Debug'}
        </button>
      </div>

      {/* Debug Info */}
      {showDebug && (
        <div className="animate-fade-in">
          <div className="text-dim text-[10px] uppercase tracking-wider mb-2">Raw Response</div>
          <pre className="text-xs text-dim bg-bg p-3 rounded border border-muted overflow-x-auto whitespace-pre-wrap max-h-48">
            {rawResponse || 'No raw response available'}
          </pre>
        </div>
      )}
    </div>
  )
}