import { useState } from 'react'

const CACHE_TTL_MS = 4 * 60 * 60 * 1000

const PLATFORM_CONFIG = {
  pypi: { label: 'PyPI', color: '#3776ab', icon: '🐍' },
  npm: { label: 'npm', color: '#cb3837', icon: '📦' },
  vscode: { label: 'VS Code', color: '#007acc', icon: '💎' },
}

function formatNumber(num) {
  if (num === null || num === undefined) return '—'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

function timeAgo(cachedAt) {
  if (!cachedAt) return null
  const diff = Date.now() - cachedAt
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function PackageCard({ pkg, cacheEntry, onSync, onRemove, isLoading }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const config = PLATFORM_CONFIG[pkg.platform] || { label: pkg.platform, color: '#666', icon: '📦' }

  const hasData = cacheEntry && cacheEntry.downloads
  const isError = cacheEntry && cacheEntry.error
  const isStale = cacheEntry ? (Date.now() - cacheEntry.cachedAt > CACHE_TTL_MS) : true
  const neverFetched = !cacheEntry

  const downloads = cacheEntry?.downloads || {}

  // Check what kind of stats we have
  const hasPeriodStats = downloads.daily !== null || downloads.weekly !== null || downloads.monthly !== null
  const hasYearly = downloads.yearly !== null && downloads.yearly !== undefined
  const hasTotal = downloads.total !== null && downloads.total !== undefined

  // Build the period columns array dynamically
  const periodColumns = []
  if (downloads.daily !== null && downloads.daily !== undefined) periodColumns.push({ label: 'Day', value: downloads.daily, accent: true })
  if (downloads.weekly !== null && downloads.weekly !== undefined) periodColumns.push({ label: 'Week', value: downloads.weekly })
  if (downloads.monthly !== null && downloads.monthly !== undefined) periodColumns.push({ label: 'Month', value: downloads.monthly })
  if (hasYearly) periodColumns.push({ label: 'Year', value: downloads.yearly })

  return (
    <div
      className={`card-hover relative border bg-surface rounded-none overflow-hidden transition-all duration-300 ${isLoading ? 'opacity-70' : 'opacity-100'}`}
      style={{
        fontFamily: 'var(--font-mono)',
        borderColor: isLoading ? `${config.color}40` : '#1e1e1e',
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {/* Status dot */}
          <span
            className="status-dot flex-shrink-0"
            style={{
              background: isLoading
                ? config.color
                : isError
                  ? '#ff4444'
                  : neverFetched
                    ? '#3a3a3a'
                    : isStale
                      ? '#f59e0b'
                      : '#4ade80',
              boxShadow: isLoading ? `0 0 6px ${config.color}99` : 'none',
              animation: isLoading ? 'pulse 1s ease-in-out infinite' : 'none',
            }}
          />
          <span
            className="text-text text-sm font-medium truncate"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {pkg.name}
          </span>
          {/* Platform badge */}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 border"
            style={{
              color: config.color,
              borderColor: `${config.color}40`,
              background: `${config.color}10`,
            }}
          >
            {config.label}
          </span>
        </div>

        {/* Right side: age + delete */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
          {cacheEntry?.cachedAt && !isLoading && (
            <span
              className="text-xs tabular-nums"
              style={{ color: isStale ? '#f59e0b' : '#555' }}
            >
              {isStale ? '⚠ ' : ''}{timeAgo(cacheEntry.cachedAt)}
            </span>
          )}

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onRemove(pkg.id)} className="text-xs text-red-400 hover:text-red-300 px-1">rm</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-dim hover:text-text px-1">esc</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-dim hover:text-red-400 transition-colors text-xs px-1"
              title="Remove package"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Identifier tag */}
      <div className="px-4 pt-2">
        <span className="text-xs text-dim border border-muted px-2 py-0.5">
          {pkg.identifier}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="skeleton h-3 rounded w-full" />
            <div className="skeleton h-3 rounded w-4/5" />
          </div>
        ) : isError ? (
          <p className="text-xs text-red-400 leading-relaxed">{cacheEntry.error}</p>
        ) : hasData ? (
          <div className="space-y-3">
            {/* Period download stats grid (PyPI, npm) */}
            {periodColumns.length > 0 && (
              <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${periodColumns.length}, 1fr)` }}>
                {periodColumns.map((col, i) => (
                  <div key={col.label} className="bg-bg border border-border p-2 rounded text-center">
                    <div className="text-dim text-[10px] uppercase tracking-wider">{col.label}</div>
                    <div className={`text-sm font-medium ${i === 0 ? 'text-accent' : 'text-text'}`}>
                      {formatNumber(col.value)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total installs / Lifetime downloads */}
            {hasTotal && (
              <div className="bg-bg border border-border p-3 rounded text-center">
                <div className="text-dim text-[10px] uppercase tracking-wider">Lifetime Downloads</div>
                <div className="text-accent text-lg font-medium">{formatNumber(downloads.total)}</div>
              </div>
            )}

            {/* VS Code secondary stats row */}
            {(cacheEntry.totalDownloads || cacheEntry.updateCount) && (
              <div className="grid grid-cols-2 gap-2">
                {cacheEntry.totalDownloads && (
                  <div className="bg-bg border border-border p-2 rounded text-center">
                    <div className="text-dim text-[10px] uppercase tracking-wider">Downloads</div>
                    <div className="text-text text-sm">{formatNumber(cacheEntry.totalDownloads)}</div>
                  </div>
                )}
                {cacheEntry.updateCount && (
                  <div className="bg-bg border border-border p-2 rounded text-center">
                    <div className="text-dim text-[10px] uppercase tracking-wider">Updates</div>
                    <div className="text-text text-sm">{formatNumber(cacheEntry.updateCount)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Metadata badges */}
            <div className="flex flex-wrap items-center gap-2">
              {cacheEntry.version && (
                <span className="text-xs text-dim border border-muted px-1.5 py-0.5 rounded">
                  v{cacheEntry.version}
                </span>
              )}
              {cacheEntry.rating && (
                <span className="text-xs text-yellow-400 border border-yellow-400/20 px-1.5 py-0.5 rounded">
                  ★ {cacheEntry.rating}{cacheEntry.ratingCount ? ` (${formatNumber(cacheEntry.ratingCount)})` : ''}
                </span>
              )}
              {cacheEntry.license && (
                <span className="text-xs text-blue-400 border border-blue-400/20 px-1.5 py-0.5 rounded">
                  {cacheEntry.license}
                </span>
              )}
              {cacheEntry.requiresPython && (
                <span className="text-xs text-green-400 border border-green-400/20 px-1.5 py-0.5 rounded">
                  py {cacheEntry.requiresPython}
                </span>
              )}
              {cacheEntry.releaseCount && (
                <span className="text-xs text-dim border border-muted px-1.5 py-0.5 rounded">
                  {cacheEntry.releaseCount} releases
                </span>
              )}
              {cacheEntry.publisher && (
                <span className="text-xs text-dim border border-muted px-1.5 py-0.5 rounded">
                  by {cacheEntry.publisher}
                </span>
              )}
            </div>

            {/* Description */}
            {cacheEntry.description && (
              <p className="text-xs text-dim/70 line-clamp-2">{cacheEntry.description}</p>
            )}

            {/* Author (PyPI) */}
            {cacheEntry.author && (
              <p className="text-xs text-dim">by {cacheEntry.author}</p>
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
          onClick={() => onSync(pkg)}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: isLoading ? config.color : isStale && hasData ? '#f59e0b' : '#555',
          }}
          onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.color = config.color }}
          onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.color = isStale && hasData ? '#f59e0b' : '#555' }}
        >
          <span style={{ display: 'inline-block', animation: isLoading ? 'spin 1s linear infinite' : 'none' }}>
            ⟳
          </span>
          {isLoading ? 'Fetching...' : 'sync'}
        </button>

        <span className="text-xs text-dim">
          {isLoading ? '' : isStale && hasData ? <span style={{ color: '#f59e0b' }}>stale</span> : hasData ? 'fresh' : ''}
        </span>
      </div>

      {/* Loading progress bar */}
      {isLoading && (
        <div className="absolute bottom-0 left-0 h-0.5" style={{ background: config.color, animation: 'loadbar 2s ease-in-out infinite' }} />
      )}

      <style jsx>{`
        @keyframes loadbar {
          0% { width: 0%; left: 0; }
          50% { width: 70%; left: 15%; }
          100% { width: 0%; left: 100%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
