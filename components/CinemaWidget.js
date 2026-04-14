import { useState } from 'react'

// Sentinel values the AI returns when data is unavailable
const EMPTY_VALUES = ['not available', 'n/a', 'unknown', 'tba', 'tbd', 'none', 'null', 'undefined', '-', '—', '']

/** Returns true only if the value contains meaningful data */
function hasValue(val) {
  if (!val) return false
  if (typeof val !== 'string') return true
  return !EMPTY_VALUES.includes(val.trim().toLowerCase())
}

function formatCurrency(value) {
  if (!hasValue(value)) return null
  const num = parseFloat(value.replace(/[^0-9.]/g, ''))
  if (isNaN(num) || num === 0) return null
  if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  return `$${num.toLocaleString()}`
}

function formatDate(dateStr) {
  if (!hasValue(dateStr)) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function calculateDaysUntil(dateStr) {
  if (!hasValue(dateStr)) return null
  const target = new Date(dateStr)
  if (isNaN(target.getTime())) return null
  const now = new Date()
  const diff = target - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
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

  // Filter out sentinel values from arrays
  const validCast = cast.filter(hasValue)
  const validHighlights = highlights.filter(hasValue)
  const validMilestones = milestones.filter(hasValue)

  const daysUntil = hasValue(stats?.release_date) ? calculateDaysUntil(stats.release_date) : null
  const isReleased = daysUntil !== null && !isNaN(daysUntil) && daysUntil <= 0

  const progressPercent = (daysUntil !== null && !isNaN(daysUntil)) ? Math.max(0, Math.min(100, ((365 - daysUntil) / 365) * 100)) : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-text text-lg font-medium" style={{ fontFamily: 'var(--font-display)' }}>
          {title || 'Unknown Title'}
        </h3>
        {hasValue(stats?.genre) && (
          <span className="text-xs text-accent border border-accent/30 px-2 py-0.5 inline-block mt-1">
            {stats.genre}
          </span>
        )}
      </div>

      {/* Stats Grid */}
      {stats && (hasValue(stats.ww_gross) || hasValue(stats.budget) || hasValue(stats.rating) || hasValue(stats.runtime)) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {formatCurrency(stats.ww_gross) && (
            <div className="bg-bg border border-border p-2 rounded">
              <div className="text-dim text-[10px] uppercase tracking-wider">Box Office</div>
              <div className="text-accent text-sm font-medium">{formatCurrency(stats.ww_gross)}</div>
            </div>
          )}
          {formatCurrency(stats.budget) && (
            <div className="bg-bg border border-border p-2 rounded">
              <div className="text-dim text-[10px] uppercase tracking-wider">Budget</div>
              <div className="text-text text-sm">{formatCurrency(stats.budget)}</div>
            </div>
          )}
          {hasValue(stats.rating) && (
            <div className="bg-bg border border-border p-2 rounded">
              <div className="text-dim text-[10px] uppercase tracking-wider">Rating</div>
              <div className="text-text text-sm">{stats.rating}</div>
            </div>
          )}
          {hasValue(stats.runtime) && (
            <div className="bg-bg border border-border p-2 rounded">
              <div className="text-dim text-[10px] uppercase tracking-wider">Runtime</div>
              <div className="text-text text-sm">{stats.runtime}</div>
            </div>
          )}
        </div>
      )}

      {/* Release Status / Countdown */}
      {formatDate(stats?.release_date) && (
        <div className="bg-bg border border-border p-3 rounded">
          <div className="flex items-center justify-between">
            <span className="text-dim text-xs">Release: {formatDate(stats.release_date)}</span>
            {daysUntil !== null && !isNaN(daysUntil) && (
              <span className={`text-xs px-2 py-0.5 rounded ${isReleased ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                {isReleased ? 'RELEASED' : `${daysUntil} days`}
              </span>
            )}
          </div>
          {!isReleased && daysUntil !== null && !isNaN(daysUntil) && (
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
      {hasValue(stats?.director) && (
        <div className="text-dim text-xs">
          Directed by <span className="text-text">{stats.director}</span>
        </div>
      )}

      {/* Highlights */}
      {validHighlights.length > 0 && (
        <div>
          <div className="text-dim text-[10px] uppercase tracking-wider mb-1">Highlights</div>
          <ul className="space-y-1">
            {validHighlights.map((h, i) => (
              <li key={i} className="text-text text-xs flex items-start gap-2">
                <span className="text-accent">▸</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Milestones */}
      {validMilestones.length > 0 && (
        <div>
          <div className="text-dim text-[10px] uppercase tracking-wider mb-1">Milestones</div>
          <div className="flex flex-wrap gap-1">
            {validMilestones.map((m, i) => (
              <span key={i} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cast */}
      {validCast.length > 0 && (
        <div>
          <div className="text-dim text-[10px] uppercase tracking-wider mb-1">Cast</div>
          <div className="flex flex-wrap gap-1">
            {validCast.slice(0, 6).map((c, i) => (
              <span key={i} className="text-xs text-text border border-muted px-2 py-0.5 rounded">
                {c}
              </span>
            ))}
            {validCast.length > 6 && (
              <span className="text-xs text-dim">+{validCast.length - 6} more</span>
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