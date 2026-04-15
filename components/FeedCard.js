import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour for feeds 

function timeAgo(dateInput) {
  if (!dateInput) return null
  const cachedAt = new Date(dateInput).getTime()
  if (isNaN(cachedAt)) return null

  const diff = Date.now() - cachedAt
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function FeedCard({ feed, cacheEntry, onSync, onRemove, isLoading }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feed.id })

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  }

  const hasData = cacheEntry && cacheEntry.items
  const isError = cacheEntry && cacheEntry.error
  const isStale = cacheEntry ? (Date.now() - cacheEntry.cachedAt > CACHE_TTL_MS) : true
  const neverFetched = !cacheEntry

  return (
    <div
      ref={setNodeRef}
      className={`card-hover relative border bg-surface rounded-none overflow-hidden transition-[border-color,opacity] duration-300 ${isLoading ? 'opacity-70' : 'opacity-100'} ${isDragging ? 'shadow-2xl border-accent' : ''}`}
      style={{
        fontFamily: 'var(--font-mono)',
        borderColor: isDragging ? '#e8f429' : isLoading ? `#e8f42940` : '#1e1e1e',
        ...dndStyle,
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {/* Grab Handle */}
          <span 
            {...attributes} 
            {...listeners} 
            className="text-dim/50 hover:text-text cursor-grab active:cursor-grabbing text-xs select-none pr-1"
          >
            ⠿
          </span>
          {/* Status dot */}
          <span
            className="status-dot flex-shrink-0"
            style={{
              background: isLoading
                ? '#e8f429'
                : isError
                  ? '#ff4444'
                  : neverFetched
                    ? '#3a3a3a'
                    : isStale
                      ? '#f59e0b'
                      : '#4ade80',
              boxShadow: isLoading ? `0 0 6px rgba(232,244,41,0.6)` : 'none',
              animation: isLoading ? 'pulse 1s ease-in-out infinite' : 'none',
            }}
          />
          <span
            className="text-text text-sm font-medium truncate"
            style={{ fontFamily: 'var(--font-display)' }}
            title={feed.name}
          >
            {feed.name}
          </span>
          {/* Feed badge */}
          <span className="text-[10px] text-dim border border-muted px-1.5 py-0.5 rounded flex-shrink-0">
            RSS
          </span>
        </div>

        {/* Right side: age + delete */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
          {cacheEntry?.cachedAt && !isLoading && (
            <span
              className="text-xs tabular-nums"
              style={{ color: isStale ? '#f59e0b' : '#555' }}
              title={isStale ? 'Cache is stale — hit Sync to refresh' : 'Cache is fresh'}
            >
              {isStale ? '⚠ ' : ''}{timeAgo(cacheEntry.cachedAt)}
            </span>
          )}

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onRemove(feed.id)} className="text-xs text-red-400 hover:text-red-300 px-1">rm</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-dim hover:text-text px-1">esc</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-dim hover:text-red-400 transition-colors text-xs px-1"
              title="Remove feed"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 max-h-[300px] overflow-y-auto custom-scrollbar">
        {isLoading && !hasData ? (
          <div className="space-y-4">
            <div className="skeleton h-3 rounded w-full" />
            <div className="skeleton h-3 rounded w-4/5" />
            <div className="skeleton h-3 rounded w-full" />
            <div className="skeleton h-3 rounded w-3/5" />
          </div>
        ) : isError ? (
          <p className="text-xs text-red-400 leading-relaxed">{cacheEntry.error}</p>
        ) : hasData ? (
          <div className="space-y-4">
            {cacheEntry.items.length === 0 ? (
               <p className="text-xs text-dim italic">No articles found in this feed.</p>
            ) : (
              cacheEntry.items.map((item, idx) => (
                <div key={item.id || idx} className="group flex flex-col gap-1">
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-text group-hover:text-accent group-hover:underline transition-colors leading-snug line-clamp-2"
                  >
                    {item.title}
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-accent/60 flex-shrink-0">
                      {timeAgo(item.pubDate) || 'unknown date'}
                    </span>
                    {item.author && (
                      <span className="text-[10px] text-dim truncate">
                        • {item.author}
                      </span>
                    )}
                  </div>
                  {item.snippet && (
                    <p className="text-[11px] text-dim line-clamp-2 mt-0.5">
                      {item.snippet}
                    </p>
                  )}
                </div>
              ))
            )}
            {/* Metadata Footer */}
            {cacheEntry.description && (
              <div className="pt-2 mt-2 border-t border-muted/50">
                 <p className="text-[10px] text-dim/50 italic line-clamp-1">{cacheEntry.description}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-dim italic">
            No data yet — hit Sync to fetch.
          </p>
        )}
      </div>

      {/* Sync button */}
      <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => onSync(feed)}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: isLoading ? '#e8f429' : isStale && hasData ? '#f59e0b' : '#555',
          }}
          onMouseEnter={e => { if (!isLoading) e.currentTarget.style.color = '#e8f429' }}
          onMouseLeave={e => { if (!isLoading) e.currentTarget.style.color = isStale && hasData ? '#f59e0b' : '#555' }}
        >
          <span style={{ display: 'inline-block', animation: isLoading ? 'spin 1s linear infinite' : 'none' }}>
            ⟳
          </span>
          {isLoading ? 'Fetching...' : 'sync'}
        </button>

        <span className="text-xs text-dim flex items-center gap-2">
          {isLoading ? '' : isStale && hasData ? <span style={{ color: '#f59e0b' }}>stale</span> : hasData ? 'fresh' : ''}
          <a href={feed.url} target="_blank" rel="noreferrer" title="Open RSS source URL" className="text-dim hover:text-accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
               <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M11 20a1 1 0 1 0-2 0 1 1 0 0 0 2 0z"/>
            </svg>
          </a>
        </span>
      </div>

      {/* Loading progress bar */}
      {isLoading && (
        <div className="absolute bottom-0 left-0 h-0.5" style={{ background: '#e8f429', animation: 'loadbar 2s ease-in-out infinite' }} />
      )}

      <style jsx>{`
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e8f429; }
        @keyframes loadbar {
          0% { width: 0%; left: 0; }
          50% { width: 70%; left: 15%; }
          100% { width: 0%; left: 100%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
