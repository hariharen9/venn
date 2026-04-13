import { useState, useCallback, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useTopics } from '../lib/useTopics'
import { useSettings } from '../lib/useSettings'
import TopicCard from '../components/TopicCard'
import AddTopicForm from '../components/AddTopicForm'
import SettingsPanel from '../components/SettingsPanel'
import ConfirmDialog from '../components/ConfirmDialog'
import ToastContainer, { showToast } from '../components/Toast'

const API_ENDPOINT = '/api/refresh'
const CACHE_TTL_MS = 4 * 60 * 60 * 1000

export default function Dashboard() {
  const router = useRouter()
  const { topics, addTopic, removeTopic, setCacheEntry, getCacheEntry } = useTopics()
  const { settings, updateSettings, checkOllamaAndAutoSelect, getActiveModel } = useSettings()
  const [loadingIds, setLoadingIds] = useState(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)
  const [toastShown, setToastShown] = useState(false)
  const [activeProvider, setActiveProvider] = useState({ provider: 'openrouter', model: 'gemma-4-26b-a4b-it' })

  useEffect(() => {
    const session = localStorage.getItem('venn_session')
    if (!session) {
      router.push('/login')
      return
    }
    try {
      const { expiresAt } = JSON.parse(session)
      if (expiresAt <= Date.now()) {
        localStorage.removeItem('venn_session')
        router.push('/login')
      }
    } catch {
      router.push('/login')
    }
  }, [router])

  // Check Ollama and show toast on mount
  useEffect(() => {
    if (toastShown) return
    
    const initAI = async () => {
      const result = await checkOllamaAndAutoSelect()
      
      if (result.online) {
        setActiveProvider({ provider: 'ollama', model: result.model })
        showToast(`🤖 Using Ollama: ${result.model}`, 'success', 4000)
      } else {
        setActiveProvider({ provider: 'openrouter', model: 'gemma-4-26b-a4b-it' })
        showToast(`☁️ Using OpenRouter: gemma-4-26b-a4b-it`, 'warning', 4000)
      }
      setToastShown(true)
    }
    
    initAI()
  }, [])

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
            topicType: topic.topicType || 'auto',
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

  const handleAddTopic = async (topic, query, topicType) => {
    const newTopic = addTopic(topic, query, topicType)
    // Auto-sync newly added topic
    setTimeout(() => {
      const topicObj = { id: newTopic, topic, query, topicType }
      fetchTopic(topicObj, true)
    }, 100)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' })
    } catch {}
    localStorage.removeItem('venn_session')
    router.push('/login')
  }

  const totalLoading = loadingIds.size
  const hasTopics = topics.length > 0

  const providerBadge = activeProvider.provider === 'ollama'
    ? { label: `ollama · ${activeProvider.model}`, color: '#4ade80' }
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
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4">
              <h1 className="text-accent text-base sm:text-lg tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
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

            <div className="flex items-center gap-1.5 sm:gap-2">
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
                  className="text-xs text-dim hover:text-accent border border-muted hover:border-accent px-2 sm:px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {syncingAll ? 'syncing...' : 'sync'}
                </button>
              )}

              <button
                onClick={() => { setShowAdd(!showAdd); setShowSettings(false) }}
                className="text-xs px-2 sm:px-3 py-1.5 border transition-colors"
                style={{
                  borderColor: showAdd ? '#e8f429' : '#2a2a2a',
                  color: showAdd ? '#e8f429' : '#e8e8e8',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {showAdd ? '−' : '+'}
              </button>

              <button
                onClick={handleLogout}
                className="text-xs text-dim hover:text-red-400 border border-muted hover:border-red-400/50 px-2 sm:px-3 py-1.5 transition-colors"
                title="Lock dashboard"
              >
                × EXIT
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
            <div className="flex flex-col items-center justify-center py-20 sm:py-32 text-center px-4">
              <div className="text-4xl text-accent mb-4" style={{ fontFamily: 'var(--font-display)' }}>_</div>
              <p className="text-text text-sm mb-2">no topics yet</p>
              <p className="text-dim text-xs mb-6 max-w-xs">
                add anything you want to track — movies, news topics, people, subreddits, stock prices, whatever.
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="text-sm px-6 py-3 border border-accent text-accent hover:bg-accent hover:text-bg transition-colors rounded"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                + ADD YOUR FIRST TOPIC
              </button>
            </div>
          )}

          {/* Topic grid */}
          {hasTopics && (
            <>
              <div className="flex items-center gap-3 mb-4 px-2">
                <span className="text-dim text-xs">
                  {topics.length} topic{topics.length !== 1 ? 's' : ''}
                </span>
                <div className="flex-1 border-t border-border" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-2">
                {topics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    cacheEntry={getCacheEntry(topic.id)}
                    onSync={fetchTopic}
                    onRemove={removeTopic}
                    isLoading={loadingIds.has(topic.id)}
                    settings={settings}
                  />
                ))}
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-8 sm:mt-12">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <span className="text-dim text-xs">tavily search + {settings.aiMode === 'ollama' ? `ollama (${settings.ollamaModel})` : 'openrouter'}</span>
            <span className="text-dim text-xs">4h cache · manual sync only</span>
          </div>
        </footer>
      </div>

      <ToastContainer />
    </>
  )
}
