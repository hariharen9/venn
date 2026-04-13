import { useState, useEffect } from 'react'
import { getWidgetComponent } from '../lib/widgetRegistry'
import ChatModal from './ChatModal'

const CACHE_TTL_MS = 4 * 60 * 60 * 1000

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

export default function TopicCard({ topic, cacheEntry, onSync, onRemove, isLoading, chatHistory = [], onSendChat, settings }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [localChatHistory, setLocalChatHistory] = useState(() => chatHistory || [])
  const [showChatModal, setShowChatModal] = useState(false)

  const hasData = cacheEntry && (cacheEntry.summary || cacheEntry.data)
  const isError = cacheEntry && cacheEntry.error
  const isParseError = cacheEntry && cacheEntry.parseError
  const isStale = cacheEntry ? (Date.now() - cacheEntry.cachedAt > CACHE_TTL_MS) : true
  const neverFetched = !cacheEntry

  const widgetType = cacheEntry?.type || 'briefing'
  const WidgetComponent = getWidgetComponent(isParseError ? 'error' : widgetType)

  const handleOpenChat = () => {
    if (settings?.enableChat === false) return
    setShowChatModal(true)
  }

  const handleChatMessage = (msg, callback, newHistory, isFromAI) => {
    setLocalChatHistory(newHistory)
    if (onSendChat) {
      onSendChat(topic.id, msg, newHistory, isFromAI)
    }
  }

  return (
    <>
      <div
        className={`card-hover relative border bg-surface rounded-none overflow-hidden transition-all duration-300 ${isLoading ? 'opacity-70' : 'opacity-100'}`}
        style={{
          fontFamily: 'var(--font-mono)',
          borderColor: isLoading ? '#e8f42940' : '#1e1e1e',
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
                  ? '#e8f429'
                  : isError || isParseError
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
            >
              {topic.topic}
            </span>
            {/* Type badge */}
            {!neverFetched && settings?.showTypeBadge !== false && (
              <span className="text-[10px] text-dim border border-muted px-1.5 py-0.5 rounded flex-shrink-0">
                {widgetType}
              </span>
            )}
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
                <button onClick={() => onRemove(topic.id)} className="text-xs text-red-400 hover:text-red-300 px-1">rm</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-dim hover:text-text px-1">esc</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-dim hover:text-red-400 transition-colors text-xs px-1"
                title="Remove topic"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Query tag */}
        {topic.query && (
          <div className="px-4 pt-2">
            <span className="text-xs text-dim border border-muted px-2 py-0.5">
              query: {topic.query}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="space-y-2">
              <div className="skeleton h-3 rounded w-full" />
              <div className="skeleton h-3 rounded w-4/5" />
              <div className="skeleton h-3 rounded w-3/5" />
            </div>
          ) : isParseError ? (
            <WidgetComponent
              error={cacheEntry.error}
              parseError={cacheEntry.parseError}
              rawResponse={cacheEntry.rawResponse}
              onRetry={() => onSync(topic)}
              onSwitchMode={() => {}}
            />
          ) : isError ? (
            <p className="text-xs text-red-400 leading-relaxed">{cacheEntry.error}</p>
          ) : hasData ? (
            <WidgetComponent
              data={cacheEntry.data || { title: topic.topic, summary: cacheEntry.summary }}
              sources={cacheEntry.sources}
              chatHistory={localChatHistory}
              onChat={handleChatMessage}
              settings={settings}
              onOpenChat={handleOpenChat}
            />
          ) : (
            <p className="text-xs text-dim italic">
              No data yet — hit Sync to fetch.
            </p>
          )}
        </div>

        {/* Sync button — always visible at bottom */}
        <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
          <button
            onClick={() => onSync(topic)}
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

          <span className="text-xs text-dim">
            {isLoading ? '' : isStale && hasData ? <span style={{ color: '#f59e0b' }}>stale</span> : hasData ? 'fresh' : ''}
            {cacheEntry?.usedProvider && !isLoading && (
              <span className="ml-2 opacity-50">{cacheEntry.usedProvider}</span>
            )}
          </span>
        </div>

        {/* Loading progress bar */}
        {isLoading && (
          <div className="absolute bottom-0 left-0 h-0.5 bg-accent" style={{ animation: 'loadbar 2s ease-in-out infinite' }} />
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
        `}</style>
      </div>

      <ChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        topic={topic.topic}
        history={localChatHistory}
        onSendMessage={handleChatMessage}
        settings={settings}
      />
    </>
  )
}