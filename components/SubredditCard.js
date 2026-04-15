import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

const SORT_OPTIONS = [
  { value: 'hot', label: 'HOT' },
  { value: 'new', label: 'NEW' },
  { value: 'top', label: 'TOP' },
  { value: 'rising', label: 'RIZE' },
]

const TIME_OPTIONS = [
  { value: 'hour', label: '1H' },
  { value: 'day', label: '1D' },
  { value: 'week', label: '1W' },
  { value: 'month', label: '1M' },
  { value: 'year', label: '1Y' },
  { value: 'all', label: 'ALL' },
]

function timeAgo(utcSeconds) {
  if (!utcSeconds) return null
  const diff = Date.now() - utcSeconds * 1000
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}

function cacheAge(cachedAt) {
  if (!cachedAt) return null
  const diff = Date.now() - cachedAt
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${hours}h ago`
}

function formatScore(score) {
  if (score >= 100000) return `${(score / 1000).toFixed(0)}k`
  if (score >= 10000) return `${(score / 1000).toFixed(1)}k`
  if (score >= 1000) return `${(score / 1000).toFixed(1)}k`
  return score.toString()
}

function scoreColor(score) {
  if (score >= 10000) return '#4ade80'
  if (score >= 1000) return '#a3e635'
  if (score >= 500) return '#e8f429'
  if (score >= 100) return '#f59e0b'
  return '#666'
}

function postTypeIcon(type) {
  switch (type) {
    case 'text': return '📜'
    case 'image': return '🖼️'
    case 'video': return '🎥'
    default: return '🔗'
  }
}

function formatSubscribers(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

export default function SubredditCard({
  subreddit,
  cacheEntry,
  onSync,
  onRemove,
  onUpdateConfig,
  isLoading,
  settings,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showTimeFilter, setShowTimeFilter] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subreddit.id })

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  }

  const hasData = cacheEntry && cacheEntry.posts
  const isError = cacheEntry && cacheEntry.error
  const isStale = cacheEntry ? (Date.now() - cacheEntry.cachedAt > CACHE_TTL_MS) : true
  const neverFetched = !cacheEntry

  const meta = cacheEntry?.meta || {}
  const posts = cacheEntry?.posts || []
  const currentSort = subreddit.sort || 'hot'
  const currentTime = subreddit.timeRange || 'week'
  const showThumbnails = settings?.redditThumbnails !== false
  const showNsfw = settings?.redditNsfw === true
  const isCompact = settings?.redditCompact === true

  // Filter out NSFW if not enabled
  const filteredPosts = showNsfw ? posts : posts.filter(p => !p.isNsfw)

  const handleSortChange = (newSort) => {
    onUpdateConfig(subreddit.id, { sort: newSort })
    // Trigger re-fetch with new sort
    setTimeout(() => onSync({ ...subreddit, sort: newSort }, true), 100)
  }

  const handleTimeChange = (newTime) => {
    onUpdateConfig(subreddit.id, { timeRange: newTime })
    setShowTimeFilter(false)
    setTimeout(() => onSync({ ...subreddit, timeRange: newTime }, true), 100)
  }

  return (
    <div
      ref={setNodeRef}
      className={`card-hover relative border bg-surface rounded-none overflow-hidden transition-[border-color,opacity] duration-300 flex-1 min-w-full md:min-w-[45%] lg:min-w-[30%] ${isLoading ? 'opacity-70' : 'opacity-100'} ${isDragging ? 'shadow-2xl border-accent' : ''}`}
      style={{
        fontFamily: 'var(--font-mono)',
        borderColor: isDragging ? '#e8f429' : isLoading ? '#e8f42940' : '#1e1e1e',
        ...dndStyle,
      }}
    >
      {/* ── Header ── */}
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
              boxShadow: isLoading ? '0 0 6px rgba(232,244,41,0.6)' : 'none',
              animation: isLoading ? 'pulse 1s ease-in-out infinite' : 'none',
            }}
          />
          <span
            className="text-text text-sm font-medium truncate"
            style={{ fontFamily: 'var(--font-display)' }}
            title={`r/${subreddit.name}`}
          >
            r/{subreddit.name}
          </span>
          {/* Reddit badge */}
          <span className="text-[10px] text-orange-400 border border-orange-400/30 px-1.5 py-0.5 rounded flex-shrink-0">
            REDDIT
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
              {isStale ? '⚠ ' : ''}{cacheAge(cacheEntry.cachedAt)}
            </span>
          )}

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onRemove(subreddit.id)} className="text-xs text-red-400 hover:text-red-300 px-1">rm</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-dim hover:text-text px-1">esc</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-dim hover:text-red-400 transition-colors text-xs px-1"
              title="Remove subreddit"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Subreddit Intel Bar ── */}
      {hasData && meta.subscribers > 0 && (
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/50 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-dim">
              SUBSCRIBERS: <span className="text-text">{formatSubscribers(meta.subscribers)}</span>
            </span>
            {meta.activeUsers > 0 && (
              <span className="text-[9px] text-dim">
                ACTIVE: <span className="text-green-400">{formatSubscribers(meta.activeUsers)}</span>
              </span>
            )}
          </div>
          {meta.isNsfw && (
            <span className="text-[8px] text-red-400 border border-red-400/30 px-1 rounded">NSFW</span>
          )}
        </div>
      )}

      {/* ── Sort / Time Controls ── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border/30 overflow-x-auto">
        {/* Sort buttons */}
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleSortChange(opt.value)}
              className="text-[9px] px-2 py-1 transition-colors rounded"
              style={{
                color: currentSort === opt.value ? '#e8f429' : '#555',
                background: currentSort === opt.value ? 'rgba(232,244,41,0.08)' : 'transparent',
                border: `1px solid ${currentSort === opt.value ? '#e8f42940' : 'transparent'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Time filter (only for 'top' sort) */}
        {currentSort === 'top' && (
          <>
            <span className="text-[8px] text-dim/30 mx-1">│</span>
            <div className="flex items-center gap-1">
              {TIME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleTimeChange(opt.value)}
                  className="text-[9px] px-1.5 py-1 transition-colors rounded"
                  style={{
                    color: currentTime === opt.value ? '#f59e0b' : '#444',
                    background: currentTime === opt.value ? 'rgba(245,158,11,0.08)' : 'transparent',
                    border: `1px solid ${currentTime === opt.value ? '#f59e0b40' : 'transparent'}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Post List ── */}
      <div className={`px-4 py-3 overflow-y-auto custom-scrollbar ${isCompact ? 'max-h-[280px]' : 'max-h-[400px]'}`}>
        {isLoading && !hasData ? (
          <div className="space-y-4">
            <div className="skeleton h-3 rounded w-full" />
            <div className="skeleton h-3 rounded w-4/5" />
            <div className="skeleton h-3 rounded w-full" />
            <div className="skeleton h-3 rounded w-3/5" />
            <div className="skeleton h-3 rounded w-full" />
          </div>
        ) : isError ? (
          <p className="text-xs text-red-400 leading-relaxed">{cacheEntry.error}</p>
        ) : hasData ? (
          <div className={isCompact ? 'space-y-2' : 'space-y-4'}>
            {filteredPosts.length === 0 ? (
              <p className="text-xs text-dim italic">No posts found.</p>
            ) : (
              filteredPosts.map((post) => (
                <div key={post.id} className="group flex gap-2">
                  {/* Score Column */}
                  <div className="flex flex-col items-center justify-start pt-0.5 min-w-[36px] flex-shrink-0">
                    <span
                      className="text-[11px] font-bold tabular-nums leading-none"
                      style={{ color: scoreColor(post.score) }}
                      title={`${post.score} upvotes (${Math.round(post.upvoteRatio * 100)}% ratio)`}
                    >
                      {formatScore(post.score)}
                    </span>
                    <span className="text-[8px] text-dim mt-0.5">
                      {post.numComments > 0 ? `${formatScore(post.numComments)}` : '0'}
                    </span>
                  </div>

                  {/* Content Column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1.5">
                      {/* Post type icon */}
                      {!isCompact && (
                        <span className="text-[10px] mt-0.5 flex-shrink-0" title={post.postType}>
                          {postTypeIcon(post.postType)}
                        </span>
                      )}

                      {/* Title */}
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-text group-hover:text-accent transition-colors leading-snug ${isCompact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'}`}
                      >
                        {post.isStickied && <span className="text-green-500 mr-1">📌</span>}
                        {post.title}
                      </a>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {/* Flair */}
                      {post.flair && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{
                            color: post.flairColor ? '#fff' : '#aaa',
                            background: post.flairColor || '#2a2a2a',
                            opacity: 0.8,
                          }}
                        >
                          {post.flair}
                        </span>
                      )}

                      {/* Author */}
                      <span className="text-[9px] text-dim truncate max-w-[100px]">
                        u/{post.author}
                      </span>

                      {/* Time */}
                      <span className="text-[9px] text-accent/50">
                        {timeAgo(post.createdUtc)}
                      </span>

                      {/* Awards */}
                      {post.totalAwards > 0 && (
                        <span className="text-[9px] text-yellow-500" title={`${post.totalAwards} awards`}>
                          🏅{post.totalAwards}
                        </span>
                      )}

                      {/* Cross-post */}
                      {post.isCrosspost && (
                        <span className="text-[8px] text-dim border border-muted px-1 rounded">XPOST</span>
                      )}

                      {/* NSFW */}
                      {post.isNsfw && (
                        <span className="text-[8px] text-red-400 border border-red-400/30 px-1 rounded">NSFW</span>
                      )}

                      {/* Spoiler */}
                      {post.isSpoiler && (
                        <span className="text-[8px] text-yellow-400 border border-yellow-400/30 px-1 rounded">SPOILER</span>
                      )}
                    </div>

                    {/* Selftext preview (expanded mode only) */}
                    {!isCompact && post.selftext && (
                      <p className="text-[11px] text-dim/70 line-clamp-2 mt-1 leading-relaxed">
                        {post.selftext}
                      </p>
                    )}
                  </div>

                  {/* Thumbnail */}
                  {showThumbnails && !isCompact && post.thumbnail && (
                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                      <img
                        src={post.thumbnail}
                        alt=""
                        className="w-14 h-14 object-cover border border-border/50 opacity-70 group-hover:opacity-100 transition-opacity"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <p className="text-xs text-dim italic">
            No data yet — hit Sync to fetch.
          </p>
        )}
      </div>

      {/* ── Footer: Sync + Status ── */}
      <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => onSync(subreddit)}
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
          {!isLoading && (isStale && hasData ? <span style={{ color: '#f59e0b' }}>stale</span> : hasData ? 'fresh' : '')}
          <a
            href={`https://www.reddit.com/r/${subreddit.name}`}
            target="_blank"
            rel="noreferrer"
            title="Open on Reddit"
            className="text-dim hover:text-orange-400 transition-colors text-[10px]"
          >
            ↗
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
