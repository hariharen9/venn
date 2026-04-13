import { useState } from 'react'

function formatCurrency(value) {
  if (!value) return null
  const num = value.replace(/[^0-9.]/g, '')
  if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  return value
}

function formatDate(dateStr) {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function calculateDaysUntil(dateStr) {
  if (!dateStr) return null
  try {
    const target = new Date(dateStr)
    const now = new Date()
    const diff = target - now
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

function getSentimentColor(sentiment) {
  switch (sentiment) {
    case 'positive': return '#4ade80'
    case 'negative': return '#f87171'
    case 'mixed': return '#f59e0b'
    default: return '#666'
  }
}

export default function CinemaWidget({ data, sources, onChat, chatHistory, isLoading, settings, onOpenChat }) {
  const [expanded, setExpanded] = useState(false)

  const { title, stats, highlights = [], milestones = [], cast = [], news = [] } = data

  const daysUntil = stats?.release_date ? calculateDaysUntil(stats.release_date) : null
  const isReleased = daysUntil !== null && daysUntil <= 0

  const progressPercent = daysUntil !== null ? Math.min(100, ((365 - daysUntil) / 365) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-text text-lg font-medium" style={{ fontFamily: 'var(--font-display)' }}>
          {title || 'Unknown Title'}
        </h3>
        {stats?.genre && (
          <span className="text-xs text-accent border border-accent/30 px-2 py-0.5 inline-block mt-1">
            {stats.genre}
          </span>
        )}
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stats.ww_gross && (
            <div className="bg-bg border border-border p-2 rounded">
              <div className="text-dim text-[10px] uppercase tracking-wider">Box Office</div>
              <div className="text-accent text-sm font-medium">{formatCurrency(stats.ww_gross)}</div>
            </div>
          )}
          {stats.budget && (
            <div className="bg-bg border border-border p-2 rounded">
              <div className="text-dim text-[10px] uppercase tracking-wider">Budget</div>
              <div className="text-text text-sm">{formatCurrency(stats.budget)}</div>
            </div>
          )}
          {stats.rating && (
            <div className="bg-bg border border-border p-2 rounded">
              <div className="text-dim text-[10px] uppercase tracking-wider">Rating</div>
              <div className="text-text text-sm">{stats.rating}</div>
            </div>
          )}
          {stats.runtime && (
            <div className="bg-bg border border-border p-2 rounded">
              <div className="text-dim text-[10px] uppercase tracking-wider">Runtime</div>
              <div className="text-text text-sm">{stats.runtime}</div>
            </div>
          )}
        </div>
      )}

      {/* Release Status / Countdown */}
      {stats?.release_date && (
        <div className="bg-bg border border-border p-3 rounded">
          <div className="flex items-center justify-between">
            <span className="text-dim text-xs">Release: {formatDate(stats.release_date)}</span>
            {daysUntil !== null && (
              <span className={`text-xs px-2 py-0.5 rounded ${isReleased ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                {isReleased ? 'RELEASED' : `${daysUntil} days`}
              </span>
            )}
          </div>
          {!isReleased && (
            <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Director */}
      {stats?.director && (
        <div className="text-dim text-xs">
          Directed by <span className="text-text">{stats.director}</span>
        </div>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <div>
          <div className="text-dim text-[10px] uppercase tracking-wider mb-1">Highlights</div>
          <ul className="space-y-1">
            {highlights.map((h, i) => (
              <li key={i} className="text-text text-xs flex items-start gap-2">
                <span className="text-accent">▸</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <div>
          <div className="text-dim text-[10px] uppercase tracking-wider mb-1">Milestones</div>
          <div className="flex flex-wrap gap-1">
            {milestones.map((m, i) => (
              <span key={i} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cast */}
      {cast.length > 0 && (
        <div>
          <div className="text-dim text-[10px] uppercase tracking-wider mb-1">Cast</div>
          <div className="flex flex-wrap gap-1">
            {cast.slice(0, 6).map((c, i) => (
              <span key={i} className="text-xs text-text border border-muted px-2 py-0.5 rounded">
                {c}
              </span>
            ))}
            {cast.length > 6 && (
              <span className="text-xs text-dim">+{cast.length - 6} more</span>
            )}
          </div>
        </div>
      )}

      {/* News */}
      {news.length > 0 && (
        <div>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-dim text-xs hover:text-text flex items-center gap-1"
          >
            <span>{expanded ? '−' : '+'}</span>
            News ({news.length})
          </button>
          {expanded && (
            <div className="mt-2 space-y-2">
              {news.map((n, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span 
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: getSentimentColor(n.sentiment) }}
                  />
                  <span className="text-text">{n.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Button */}
      <div className="border-t border-border pt-3">
        <button
          onClick={onOpenChat}
          className="text-xs text-dim hover:text-accent flex items-center gap-1"
        >
          <span>+</span>
          Ask follow-up
        </button>
      </div>
    </div>
  )
}