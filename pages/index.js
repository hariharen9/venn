import { useState, useCallback } from 'react'
import Head from 'next/head'
import { useTopics } from '../lib/useTopics'
import { useSettings } from '../lib/useSettings'
import TopicCard from '../components/TopicCard'
import AddTopicForm from '../components/AddTopicForm'
import SettingsPanel from '../components/SettingsPanel'
import ConfirmDialog from '../components/ConfirmDialog'

const API_ENDPOINT = '/api/refresh'
const CACHE_TTL_MS = 4 * 60 * 60 * 1000

export default function Dashboard() {
  const { topics, addTopic, removeTopic, setCacheEntry, getCacheEntry } = useTopics()
  const { settings, updateSettings } = useSettings()
  const [loadingIds, setLoadingIds] = useState(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)

  // Confirmation state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
  })

  const closeConfirm = () => setConfirmModal({ ...confirmModal, isOpen: false })

  const fetchTopic = useCallback(
    async (topic, force = false) => {
      // Check if fresh (< 4h) and not forced
      if (!force) {
        const entry = getCacheEntry(topic.id)
        if (entry && entry.cachedAt && (Date.now() - entry.cachedAt < CACHE_TTL_MS)) {
          setConfirmModal({
            isOpen: true,
            message: `"${topic.topic}" was updated recently. Sync anyway?`,
            onConfirm: () => {
              closeConfirm()
              fetchTopic(topic, true)
            },
          })
          return
        }
      }

      setLoadingIds((prev) => new Set([...prev, topic.id]))
      try {
        const res = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topic.topic,
            query: topic.query,
            aiMode: settings.aiMode,
            ollamaModel: settings.ollamaModel,
            ollamaUrl: settings.ollamaUrl,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setCacheEntry(topic.id, { error: data.error || 'Unknown error', sources: [] })
        } else {
          setCacheEntry(topic.id, data)
        }
      } catch (err) {
        setCacheEntry(topic.id, { error: `Network error: ${err.message}`, sources: [] })
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev)
          next.delete(topic.id)
          return next
        })
      }
    },
    [setCacheEntry, getCacheEntry, settings]
  )

  const handleSyncAll = async (force = false) => {
    if (topics.length === 0) return

    // Check if any are fresh
    if (!force) {
      const freshCount = topics.filter((t) => {
        const entry = getCacheEntry(t.id)
        return entry && entry.cachedAt && Date.now() - entry.cachedAt < CACHE_TTL_MS
      }).length

      if (freshCount > 0) {
        setConfirmModal({
          isOpen: true,
          message: `${freshCount} of your topics are still fresh. Sync everything anyway?`,
          onConfirm: () => {
            closeConfirm()
            handleSyncAll(true)
          },
        })
        return
      }
    }

    setSyncingAll(true)
    await Promise.all(topics.map((t) => fetchTopic(t, true)))
    setSyncingAll(false)
  }

  const handleAddTopic = (topic, query) => {
    addTopic(topic, query)
  }

  const totalLoading = loadingIds.size
  const hasTopics = topics.length > 0

  const providerBadge = settings.aiMode === 'ollama'
    ? { label: `ollama · ${settings.ollamaModel}`, color: '#4ade80' }
    : { label: 'openrouter · gemma3', color: '#e8f429' }

  return (
    <>
      <Head>
        <title>Venn — personal intel dashboard</title>
        <meta name="description" content="Personal AI-powered intelligence dashboard" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
      </Head>

      <div className="min-h-screen bg-bg" style={{ fontFamily: 'var(--font-mono)' }}>
        <ConfirmDialog
          isOpen={confirmModal.isOpen}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirm}
        />
        {/* Header */}
        <header className="border-b border-border sticky top-0 bg-bg z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-accent text-lg tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
                VENN
              </h1>
              {/* Provider badge */}
              <button
                onClick={() => { setShowSettings(!showSettings); setShowAdd(false) }}
                className="hidden sm:flex items-center gap-1.5 text-xs border border-muted px-2 py-1 hover:border-accent transition-colors"
                title="AI settings"
              >
                <span className="status-dot" style={{ background: providerBadge.color }} />
                <span className="text-dim">{providerBadge.label}</span>
              </button>
              {totalLoading > 0 && (
                <span className="text-xs text-accent animate-pulse">
                  syncing {totalLoading}...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile settings button */}
              <button
                onClick={() => { setShowSettings(!showSettings); setShowAdd(false) }}
                className="sm:hidden text-xs text-dim hover:text-accent border border-muted px-2 py-1.5 transition-colors"
              >
                AI
              </button>

              {hasTopics && (
                <button
                  onClick={() => handleSyncAll()}
                  disabled={syncingAll || totalLoading > 0}
                  className="text-xs text-dim hover:text-accent border border-muted hover:border-accent px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {syncingAll ? 'syncing...' : 'sync all'}
                </button>
              )}

              <button
                onClick={() => { setShowAdd(!showAdd); setShowSettings(false) }}
                className="text-xs px-3 py-1.5 border transition-colors"
                style={{
                  borderColor: showAdd ? '#e8f429' : '#2a2a2a',
                  color: showAdd ? '#e8f429' : '#e8e8e8',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {showAdd ? '− CANCEL' : '+ ADD'}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">

          {/* Settings panel */}
          {showSettings && (
            <div className="mb-6">
              <SettingsPanel
                settings={settings}
                onUpdate={updateSettings}
                onClose={() => setShowSettings(false)}
              />
            </div>
          )}

          {/* Add form */}
          {showAdd && (
            <div className="mb-6">
              <AddTopicForm
                onAdd={handleAddTopic}
                onClose={() => setShowAdd(false)}
              />
            </div>
          )}

          {/* Empty state */}
          {!hasTopics && !showAdd && !showSettings && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="text-4xl text-accent mb-4" style={{ fontFamily: 'var(--font-display)' }}>_</div>
              <p className="text-text text-sm mb-2">no topics yet</p>
              <p className="text-dim text-xs mb-6 max-w-xs">
                add anything you want to track — movies, news topics, people, subreddits, stock prices, whatever.
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="text-xs px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-bg transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                + ADD YOUR FIRST TOPIC
              </button>
            </div>
          )}

          {/* Topic grid */}
          {hasTopics && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-dim text-xs">
                  {topics.length} topic{topics.length !== 1 ? 's' : ''}
                </span>
                <div className="flex-1 border-t border-border" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {topics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    cacheEntry={getCacheEntry(topic.id)}
                    onSync={fetchTopic}
                    onRemove={removeTopic}
                    isLoading={loadingIds.has(topic.id)}
                  />
                ))}
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-12">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <span className="text-dim text-xs">tavily search + {settings.aiMode === 'ollama' ? `ollama (${settings.ollamaModel})` : 'openrouter'}</span>
            <span className="text-dim text-xs">4h cache · manual sync only</span>
          </div>
        </footer>
      </div>
    </>
  )
}
