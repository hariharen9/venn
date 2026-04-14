import { useState } from 'react'

function getSentimentBadge(sentiment) {
  switch (sentiment) {
    case 'positive':
      return { label: 'POSITIVE', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)' }
    case 'negative':
      return { label: 'NEGATIVE', color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' }
    case 'mixed':
      return { label: 'MIXED', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' }
    default:
      return { label: 'NEUTRAL', color: '#666', bg: 'rgba(102, 102, 102, 0.1)' }
  }
}

export default function BriefingWidget({ data, sources, onChat, chatHistory, isLoading, settings, onOpenChat }) {
  const [expanded, setExpanded] = useState(false)

  const { title, summary, key_points = [], sentiment } = data

  const sentimentBadge = getSentimentBadge(sentiment)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-text text-base font-medium" style={{ fontFamily: 'var(--font-display)' }}>
          {title || 'Unknown Topic'}
        </h3>
        <span 
          className="text-[10px] px-2 py-0.5 rounded flex-shrink-0"
          style={{ color: sentimentBadge.color, background: sentimentBadge.bg, border: `1px solid ${sentimentBadge.color}30` }}
        >
          {sentimentBadge.label}
        </span>
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-text text-sm leading-relaxed">
          {summary}
        </p>
      )}

      {/* Key Points */}
      {key_points.length > 0 && (
        <div className="space-y-2">
          {key_points.map((point, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-accent text-sm mt-0.5">▸</span>
              <span className="text-text text-sm">{point}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sources */}
      {sources && sources.length > 0 && (
        <div>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-dim text-xs hover:text-text flex items-center gap-1"
          >
            <span>{expanded ? '−' : '+'}</span>
            Sources ({sources.length})
          </button>
          
          {expanded && (
            <div className="mt-2 space-y-2 animate-fade-in">
              {sources.map((s, i) => (
                <a 
                  key={i} 
                  href={s.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-dim text-xs mt-0.5 flex-shrink-0">[{i + 1}]</span>
                    <div className="min-w-0">
                      <p className="text-xs text-text group-hover:text-accent transition-colors truncate">
                        {s.title || s.url}
                      </p>
                      <p className="text-xs text-dim/60 truncate">{s.url}</p>
                    </div>
                  </div>
                </a>
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