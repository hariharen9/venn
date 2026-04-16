import { useState, useMemo } from 'react'
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

// Highlight keywords in text
function highlightKeywords(text, keywords) {
  if (!keywords || keywords.length === 0) return text
  const regex = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part)
      ? <span key={i} style={{ background: '#e8f42940', color: '#e8f429', fontWeight: 'bold', padding: '0 2px', borderRadius: '2px' }}>{part}</span>
      : part
  )
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
  const [expandedPost, setExpandedPost] = useState(null)
  const [activeFlair, setActiveFlair] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showSubSettings, setShowSubSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summaryData, setSummaryData] = useState(null)
  const [isSummarizing, setIsSummarizing] = useState(false)

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
  const showThumbnails = subreddit.showThumbnails !== undefined ? subreddit.showThumbnails : (settings?.redditThumbnails !== false)
  const showNsfw = subreddit.showNsfw !== undefined ? subreddit.showNsfw : (settings?.redditNsfw === true)
  const isCompact = subreddit.isCompact !== undefined ? subreddit.isCompact : (settings?.redditCompact === true)
  const keywords = settings?.redditKeywords || []

  // Filter NSFW
  const safePosts = showNsfw ? posts : posts.filter(p => !p.isNsfw)

  // Flair filter
  const displayPosts = activeFlair
    ? safePosts.filter(p => p.flair === activeFlair)
    : safePosts

  // Use search results if active
  const visiblePosts = searchResults ? searchResults : displayPosts

  // Extract unique flairs for filter chips
  const availableFlairs = useMemo(() => {
    const flairSet = new Map()
    safePosts.forEach(p => {
      if (p.flair && !flairSet.has(p.flair)) {
        flairSet.set(p.flair, { text: p.flair, color: p.flairColor, count: 1 })
      } else if (p.flair) {
        flairSet.get(p.flair).count++
      }
    })
    return Array.from(flairSet.values())
  }, [safePosts])

  // Check if any post matches keywords
  const hasKeywordMatch = useMemo(() => {
    if (!keywords.length) return false
    const regex = new RegExp(keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
    return posts.some(p => regex.test(p.title) || regex.test(p.selftext))
  }, [posts, keywords])

  const handleSortChange = (newSort) => {
    onUpdateConfig(subreddit.id, { sort: newSort })
    setSearchResults(null)
    setSearchQuery('')
    setShowSearch(false)
    setTimeout(() => onSync({ ...subreddit, sort: newSort }, true), 100)
  }

  const handleTimeChange = (newTime) => {
    onUpdateConfig(subreddit.id, { timeRange: newTime })
    setTimeout(() => onSync({ ...subreddit, timeRange: newTime }, true), 100)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return }
    setIsSearching(true)
    try {
      const res = await fetch('/api/reddit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit: subreddit.name, action: 'search', query: searchQuery.trim(), limit: 15 }),
      })
      const data = await res.json()
      if (data.posts) setSearchResults(data.posts)
    } catch (e) {
      console.error('Search failed:', e)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSummarize = async () => {
    if (isSummarizing) return
    if (summaryData) { setShowSummary(!showSummary); return }
    setIsSummarizing(true)
    setShowSummary(true)
    try {
      const res = await fetch('/api/reddit-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subredditName: subreddit.name,
          posts: safePosts.slice(0, 20),
          aiMode: settings?.aiMode || 'auto',
          ollamaModel: settings?.ollamaModel,
          ollamaUrl: settings?.ollamaUrl,
          openrouterModel: 'google/gemma-4-26b-a4b-it'
        }),
      })
      const data = await res.json()
      if (data.error) {
        setSummaryData({ headline: 'Error', summary: data.error, themes: [], sentiment: 'neutral', notable: [] })
      } else {
        setSummaryData(data)
      }
    } catch (e) {
      setSummaryData({ headline: 'Error', summary: e.message, themes: [], sentiment: 'neutral', notable: [] })
    } finally {
      setIsSummarizing(false)
    }
  }

  const sentimentColor = (s) => {
    switch (s) {
      case 'positive': return '#4ade80'
      case 'negative': return '#f87171'
      case 'mixed': return '#f59e0b'
      default: return '#888'
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`card-hover relative border bg-surface rounded-none overflow-hidden transition-[border-color,opacity] duration-300 flex-1 min-w-full md:min-w-[45%] lg:min-w-[45%] ${isLoading ? 'opacity-70' : 'opacity-100'} ${isDragging ? 'shadow-2xl border-accent' : ''}`}
      style={{
        fontFamily: 'var(--font-mono)',
        borderColor: isDragging ? '#e8f429' : hasKeywordMatch ? '#f59e0b' : isLoading ? '#e8f42940' : '#1e1e1e',
        ...dndStyle,
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span {...attributes} {...listeners} className="text-dim/50 hover:text-text cursor-grab active:cursor-grabbing text-xs select-none pr-1">⠿</span>
          <span
            className="status-dot flex-shrink-0"
            style={{
              background: isLoading ? '#e8f429' : isError ? '#ff4444' : neverFetched ? '#3a3a3a' : isStale ? '#f59e0b' : '#4ade80',
              boxShadow: isLoading ? '0 0 6px rgba(232,244,41,0.6)' : 'none',
              animation: isLoading ? 'pulse 1s ease-in-out infinite' : 'none',
            }}
          />
          <span className="text-text text-sm font-medium truncate" style={{ fontFamily: 'var(--font-display)' }} title={`r/${subreddit.name}`}>
            r/{subreddit.name}
          </span>
          <span className="text-[10px] text-orange-400 border border-orange-400/30 px-1.5 py-0.5 rounded flex-shrink-0">REDDIT</span>
          {hasKeywordMatch && <span className="text-[9px] text-yellow-400 animate-pulse" title="Keyword match found">🔔</span>}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {/* AI Summarize Button */}
          {hasData && (
            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="text-[10px] px-1.5 py-0.5 border rounded transition-colors"
              style={{
                borderColor: showSummary ? '#a78bfa' : '#333',
                color: isSummarizing ? '#a78bfa' : showSummary ? '#a78bfa' : '#555',
                animation: isSummarizing ? 'pulse 1s ease-in-out infinite' : 'none',
              }}
              title="AI-powered subreddit digest"
            >
              {isSummarizing ? '◎' : '✦'} AI
            </button>
          )}

          {/* Search Toggle */}
          <button
            onClick={() => { setShowSearch(!showSearch); if (!showSearch) { setShowSubSettings(false); setShowSummary(false); } else { setSearchResults(null); setSearchQuery('') } }}
            className="text-[10px] px-1.5 py-0.5 border rounded transition-colors"
            style={{ borderColor: showSearch ? '#e8f429' : '#333', color: showSearch ? '#e8f429' : '#555' }}
            title="Search subreddit"
          >
            🔍
          </button>

          {/* Settings Toggle */}
          <button
            onClick={() => { setShowSubSettings(!showSubSettings); if (!showSubSettings) { setShowSearch(false); setShowSummary(false); } }}
            className="text-[10px] px-1.5 py-0.5 border rounded transition-colors"
            style={{ borderColor: showSubSettings ? '#e8f429' : '#333', color: showSubSettings ? '#e8f429' : '#555' }}
            title="Subreddit Settings"
          >
            ⚙️
          </button>

          {cacheEntry?.cachedAt && !isLoading && (
            <span className="text-xs tabular-nums" style={{ color: isStale ? '#f59e0b' : '#555' }} title={isStale ? 'Cache stale' : 'Cache fresh'}>
              {isStale ? '⚠ ' : ''}{cacheAge(cacheEntry.cachedAt)}
            </span>
          )}

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onRemove(subreddit.id)} className="text-xs text-red-400 hover:text-red-300 px-1">rm</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-dim hover:text-text px-1">esc</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-dim hover:text-red-400 transition-colors text-xs px-1" title="Remove subreddit">×</button>
          )}
        </div>
      </div>

      {/* ── AI Summary Modal ── */}
      {showSummary && (
        <div className="px-4 py-3 border-b border-purple-500/20 bg-purple-500/[0.03] animate-slide-up">
          {isSummarizing ? (
            <div className="space-y-2">
              <div className="skeleton h-4 rounded w-3/4" />
              <div className="skeleton h-3 rounded w-full" />
              <div className="skeleton h-3 rounded w-5/6" />
            </div>
          ) : summaryData ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-300 font-medium">{summaryData.headline}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded border" style={{ color: sentimentColor(summaryData.sentiment), borderColor: `${sentimentColor(summaryData.sentiment)}40` }}>
                  {summaryData.sentiment?.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-dim leading-relaxed">{summaryData.summary}</p>
              {summaryData.themes?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {summaryData.themes.map((t, i) => (
                    <span key={i} className="text-[9px] text-purple-400/80 border border-purple-400/20 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              )}
              {summaryData.notable?.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {summaryData.notable.map((n, i) => (
                    <p key={i} className="text-[10px] text-accent/70">★ {n}</p>
                  ))}
                </div>
              )}
              <button onClick={() => { setShowSummary(false); setSummaryData(null) }} className="text-[9px] text-dim hover:text-text mt-1">↻ regenerate</button>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Subreddit Settings Modal ── */}
      {showSubSettings && (
        <div className="px-4 py-3 border-b border-border bg-black/20 animate-slide-up space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-accent font-bold tracking-widest">SUBREDDIT CONFIG</span>
            <button onClick={() => setShowSubSettings(false)} className="text-[10px] text-dim hover:text-text">✕</button>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 pb-1 max-w-sm">
            <div>
              <label className="text-[9px] text-dim block mb-1">DEFAULT SORT</label>
              <select 
                value={currentSort}
                onChange={(e) => {
                  onUpdateConfig(subreddit.id, { sort: e.target.value })
                  setTimeout(() => onSync({ ...subreddit, sort: e.target.value }, true), 100)
                }}
                className="w-full bg-surface border border-muted text-xs p-1 outline-none focus:border-accent text-text"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-[9px] text-dim block mb-1">TIME RANGE (TOP)</label>
              <select 
                value={currentTime}
                onChange={(e) => {
                  onUpdateConfig(subreddit.id, { timeRange: e.target.value })
                  if (currentSort === 'top') {
                    setTimeout(() => onSync({ ...subreddit, timeRange: e.target.value }, true), 100)
                  }
                }}
                disabled={currentSort !== 'top'}
                className="w-full bg-surface border border-muted text-xs p-1 outline-none focus:border-accent disabled:opacity-30 text-text"
              >
                {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[9px] text-dim block mb-1">FETCH LIMIT</label>
              <select 
                value={subreddit.limit || settings?.redditPostCount || 15}
                onChange={(e) => {
                  onUpdateConfig(subreddit.id, { limit: parseInt(e.target.value) })
                  setTimeout(() => onSync({ ...subreddit, limit: parseInt(e.target.value) }, true), 100)
                }}
                className="w-full bg-surface border border-muted text-xs p-1 outline-none focus:border-accent text-text"
              >
                <option value={5}>5 Posts</option>
                <option value={10}>10 Posts</option>
                <option value={15}>15 Posts</option>
                <option value={20}>20 Posts</option>
                <option value={25}>25 Posts</option>
                <option value={50}>50 Posts</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5 justify-center mt-3">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={isCompact}
                   onChange={(e) => onUpdateConfig(subreddit.id, { isCompact: e.target.checked })}
                   className="accent-accent"
                 />
                 <span className="text-[9px] text-dim">COMPACT VIEW</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={showThumbnails}
                   onChange={(e) => onUpdateConfig(subreddit.id, { showThumbnails: e.target.checked })}
                   className="accent-accent"
                 />
                 <span className="text-[9px] text-dim">SHOW THUMBNAILS</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={showNsfw}
                   onChange={(e) => onUpdateConfig(subreddit.id, { showNsfw: e.target.checked })}
                   className="accent-accent"
                 />
                 <span className="text-[9px] text-dim">ALLOW NSFW</span>
               </label>
            </div>
          </div>
        </div>
      )}

      {/* ── Search Bar ── */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-border/50 bg-white/[0.01] flex gap-2 animate-slide-up">
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={`Search r/${subreddit.name}...`}
            className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-muted"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="text-[10px] text-dim hover:text-accent transition-colors disabled:opacity-40"
          >
            {isSearching ? '...' : 'GO'}
          </button>
          {searchResults && (
            <button
              onClick={() => { setSearchResults(null); setSearchQuery('') }}
              className="text-[10px] text-dim hover:text-text"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* ── Subreddit Intel Bar ── */}
      {hasData && meta.subscribers > 0 && (
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/50 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-dim">SUBSCRIBERS: <span className="text-text">{formatSubscribers(meta.subscribers)}</span></span>
            {meta.activeUsers > 0 && <span className="text-[9px] text-dim">ACTIVE: <span className="text-green-400">{formatSubscribers(meta.activeUsers)}</span></span>}
          </div>
          {meta.isNsfw && <span className="text-[8px] text-red-400 border border-red-400/30 px-1 rounded">NSFW</span>}
        </div>
      )}

      {/* ── Sort / Time Controls ── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border/30 overflow-x-auto">
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

        {currentSort === 'top' && (
          <>
            <span className="text-[8px] text-dim/30 mx-1">│</span>
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
          </>
        )}
      </div>

      {/* ── Flair Filter Chips ── */}
      {availableFlairs.length > 1 && !searchResults && (
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border/20 overflow-x-auto">
          <button
            onClick={() => setActiveFlair(null)}
            className="text-[8px] px-1.5 py-0.5 rounded transition-colors flex-shrink-0"
            style={{
              color: !activeFlair ? '#e8f429' : '#555',
              background: !activeFlair ? 'rgba(232,244,41,0.06)' : 'transparent',
              border: `1px solid ${!activeFlair ? '#e8f42930' : 'transparent'}`,
            }}
          >
            ALL
          </button>
          {availableFlairs.map(f => (
            <button
              key={f.text}
              onClick={() => setActiveFlair(activeFlair === f.text ? null : f.text)}
              className="text-[8px] px-1.5 py-0.5 rounded transition-colors flex-shrink-0"
              style={{
                color: activeFlair === f.text ? '#fff' : (f.color || '#888'),
                background: activeFlair === f.text ? (f.color || '#444') : 'transparent',
                border: `1px solid ${activeFlair === f.text ? (f.color || '#444') : '#2a2a2a'}`,
                opacity: activeFlair && activeFlair !== f.text ? 0.5 : 1,
              }}
            >
              {f.text} ({f.count})
            </button>
          ))}
        </div>
      )}

      {/* ── Search Results Label ── */}
      {searchResults && (
        <div className="px-4 py-1.5 border-b border-accent/20 bg-accent/[0.03]">
          <span className="text-[9px] text-accent">🔍 {searchResults.length} results for &quot;{searchQuery}&quot;</span>
        </div>
      )}

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
        ) : hasData || searchResults ? (
          <div className={isCompact ? 'space-y-2' : 'space-y-4'}>
            {visiblePosts.length === 0 ? (
              <p className="text-xs text-dim italic">{searchResults ? 'No search results found.' : activeFlair ? 'No posts with this flair.' : 'No posts found.'}</p>
            ) : (
              visiblePosts.map((post) => {
                const isExpanded = expandedPost === post.id
                const matchesKeyword = keywords.length > 0 && new RegExp(keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i').test(post.title + ' ' + post.selftext)

                return (
                  <div
                    key={post.id}
                    className="group flex gap-2"
                    style={{
                      borderLeft: matchesKeyword ? '2px solid #f59e0b' : 'none',
                      paddingLeft: matchesKeyword ? '8px' : '0',
                    }}
                  >
                    {/* Score */}
                    <div className="flex flex-col items-center justify-start pt-0.5 min-w-[36px] flex-shrink-0">
                      <span className="text-[11px] font-bold tabular-nums leading-none" style={{ color: scoreColor(post.score) }} title={`${post.score} upvotes (${Math.round(post.upvoteRatio * 100)}% ratio)`}>
                        {formatScore(post.score)}
                      </span>
                      <span className="text-[8px] text-dim mt-0.5">{post.numComments > 0 ? formatScore(post.numComments) : '0'}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5">
                        {!isCompact && <span className="text-[10px] mt-0.5 flex-shrink-0" title={post.postType}>{postTypeIcon(post.postType)}</span>}

                        {/* Clickable Title */}
                        <button
                          onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                          className={`text-left text-text group-hover:text-accent transition-colors leading-snug ${isCompact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'}`}
                          title="Click to expand"
                        >
                          {post.isStickied && <span className="text-green-500 mr-1">📌</span>}
                          {matchesKeyword ? highlightKeywords(post.title, keywords) : post.title}
                        </button>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {post.flair && (
                          <button
                            onClick={() => setActiveFlair(activeFlair === post.flair ? null : post.flair)}
                            className="text-[9px] px-1.5 py-0.5 rounded cursor-pointer hover:opacity-100 transition-opacity"
                            style={{ color: post.flairColor ? '#fff' : '#aaa', background: post.flairColor || '#2a2a2a', opacity: 0.8 }}
                          >
                            {post.flair}
                          </button>
                        )}
                        <span className="text-[9px] text-dim truncate max-w-[100px]">u/{post.author}</span>
                        <span className="text-[9px] text-accent/50">{timeAgo(post.createdUtc)}</span>
                        {post.totalAwards > 0 && <span className="text-[9px] text-yellow-500" title={`${post.totalAwards} awards`}>🏅{post.totalAwards}</span>}
                        {post.isCrosspost && <span className="text-[8px] text-dim border border-muted px-1 rounded">XPOST</span>}
                        {post.isNsfw && <span className="text-[8px] text-red-400 border border-red-400/30 px-1 rounded">NSFW</span>}
                        {post.isSpoiler && <span className="text-[8px] text-yellow-400 border border-yellow-400/30 px-1 rounded">SPOILER</span>}
                        {matchesKeyword && <span className="text-[8px] text-yellow-400">🔔 MATCH</span>}
                      </div>

                      {/* Expandable Preview */}
                      {isExpanded && (
                        <div className="mt-2 pl-2 border-l-2 border-accent/20 animate-slide-up">
                          {showThumbnails && post.postType === 'image' && post.url && (
                             <div className="mb-2">
                               <img src={post.url} alt="Post media" className="max-w-full max-h-80 object-contain rounded border border-border/50" loading="lazy" />
                             </div>
                          )}
                          {post.selftext ? (
                            <p className="text-[11px] text-dim/80 leading-relaxed whitespace-pre-line">
                              {matchesKeyword ? highlightKeywords(post.selftext, keywords) : post.selftext}
                            </p>
                          ) : (
                            showThumbnails && post.postType === 'image' ? null : <p className="text-[10px] text-dim italic">No text content — this is a {post.postType} post.</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent hover:underline">
                              open on reddit ↗
                            </a>
                            {post.url && post.url !== post.permalink && (
                              <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-dim hover:text-text">
                                source link ↗
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Compact selftext (non-expanded, only in expanded mode) */}
                      {!isCompact && !isExpanded && post.selftext && (
                        <p className="text-[11px] text-dim/70 line-clamp-2 mt-1 leading-relaxed cursor-pointer" onClick={() => setExpandedPost(post.id)}>
                          {post.selftext.slice(0, 150)}...
                        </p>
                      )}

                      {/* Inline Image Preview */}
                      {showThumbnails && !isCompact && !isExpanded && post.postType === 'image' && post.url && (
                        <div className="mt-2" onClick={() => setExpandedPost(post.id)}>
                          <img 
                            src={post.url} 
                            alt="Preview" 
                            loading="lazy" 
                            className="w-full max-h-32 object-cover rounded border border-border/50 cursor-pointer hover:opacity-90 transition-opacity" 
                          />
                        </div>
                      )}
                    </div>

                    {/* Thumbnail */}
                    {showThumbnails && !isCompact && post.thumbnail && !isExpanded && post.postType !== 'image' && (
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
                )
              })
            )}
          </div>
        ) : (
          <p className="text-xs text-dim italic">No data yet — hit Sync to fetch.</p>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => onSync(subreddit)}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: isLoading ? '#e8f429' : isStale && hasData ? '#f59e0b' : '#555' }}
          onMouseEnter={e => { if (!isLoading) e.currentTarget.style.color = '#e8f429' }}
          onMouseLeave={e => { if (!isLoading) e.currentTarget.style.color = isStale && hasData ? '#f59e0b' : '#555' }}
        >
          <span style={{ display: 'inline-block', animation: isLoading ? 'spin 1s linear infinite' : 'none' }}>⟳</span>
          {isLoading ? 'Fetching...' : 'sync'}
        </button>
        <span className="text-xs text-dim flex items-center gap-2">
          {!isLoading && (isStale && hasData ? <span style={{ color: '#f59e0b' }}>stale</span> : hasData ? 'fresh' : '')}
          <a href={`https://www.reddit.com/r/${subreddit.name}`} target="_blank" rel="noreferrer" title="Open on Reddit" className="text-dim hover:text-orange-400 transition-colors text-[10px]">↗</a>
        </span>
      </div>

      {/* Loading bar */}
      {isLoading && <div className="absolute bottom-0 left-0 h-0.5" style={{ background: '#e8f429', animation: 'loadbar 2s ease-in-out infinite' }} />}

      <style jsx>{`
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e8f429; }
        .animate-slide-up { animation: slideUp 0.2s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes loadbar { 0% { width: 0%; left: 0; } 50% { width: 70%; left: 15%; } 100% { width: 0%; left: 100%; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
