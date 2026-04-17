import { useState, useCallback, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useTopics } from '../lib/useTopics'
import { useSettings } from '../lib/useSettings'
import { usePackages } from '../lib/usePackages'
import { useFeeds } from '../lib/useFeeds'
import { useSubreddits } from '../lib/useSubreddits'
import TopicCard from '../components/TopicCard'
import AddTopicForm from '../components/AddTopicForm'
import PackageCard from '../components/PackageCard'
import AddPackageForm from '../components/AddPackageForm'
import FeedCard from '../components/FeedCard'
import AddFeedForm from '../components/AddFeedForm'
import SubredditCard from '../components/SubredditCard'
import AddSubredditForm from '../components/AddSubredditForm'
import SettingsPanel from '../components/SettingsPanel'
import ConfirmDialog from '../components/ConfirmDialog'
import ToastContainer, { showToast } from '../components/Toast'
import CloudSyncIndicator from '../components/CloudSyncIndicator'
import LeftSidebar from '../components/sidebars/LeftSidebar'
import RightSidebar from '../components/sidebars/RightSidebar'
import GlobalSearchModal from '../components/GlobalSearchModal'
import BottomNavBar from '../components/BottomNavBar'

const API_ENDPOINT = '/api/refresh'
const CACHE_TTL_MS = 4 * 60 * 60 * 1000

export default function Dashboard() {
  const router = useRouter()
  const { topics, cache: topicCache = {}, addTopic, removeTopic, reorderTopics, setCacheEntry, getCacheEntry } = useTopics()
  const { settings, updateSettings, checkOllamaAndAutoSelect, getActiveModel } = useSettings()
  const { packages, cache: pkgCache = {}, addPackage, removePackage, reorderPackages, setCacheEntry: setPkgCacheEntry, getCacheEntry: getPkgCacheEntry } = usePackages()
  const { feeds, cache: feedCache = {}, addFeed, removeFeed, reorderFeeds, setCacheEntry: setFeedCacheEntry, getCacheEntry: getFeedCacheEntry } = useFeeds()
  const { subreddits, cache: subCache = {}, addSubreddit, removeSubreddit, updateSubredditConfig, reorderSubreddits, setCacheEntry: setSubCacheEntry, getCacheEntry: getSubCacheEntry, isCacheFresh: isSubCacheFresh } = useSubreddits()
  const [loadingIds, setLoadingIds] = useState(new Set())
  const [showOmnibar, setShowOmnibar] = useState(false)
  const [pkgLoadingIds, setPkgLoadingIds] = useState(new Set())
  const [feedLoadingIds, setFeedLoadingIds] = useState(new Set())
  const [subLoadingIds, setSubLoadingIds] = useState(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [showAddPackage, setShowAddPackage] = useState(false)
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [showAddSubreddit, setShowAddSubreddit] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncingAllPkgs, setSyncingAllPkgs] = useState(false)
  const [syncingAllFeeds, setSyncingAllFeeds] = useState(false)
  const [syncingAllSubs, setSyncingAllSubs] = useState(false)
  const [toastShown, setToastShown] = useState(false)
  const [activeProvider, setActiveProvider] = useState({ provider: 'openrouter', model: 'gemma-4-26b-a4b-it' })
  const [activeTab, setActiveTab] = useState('topics')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEndTopics = (event) => {
    const { active, over } = event
    if (over && active.id !== over.id) reorderTopics(active.id, over.id)
  }

  const handleDragEndPackages = (event) => {
    const { active, over } = event
    if (over && active.id !== over.id) reorderPackages(active.id, over.id)
  }

  const handleDragEndFeeds = (event) => {
    const { active, over } = event
    if (over && active.id !== over.id) reorderFeeds(active.id, over.id)
  }

  const handleDragEndSubs = (event) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = subreddits.findIndex(s => s.id === active.id)
      const newIndex = subreddits.findIndex(s => s.id === over.id)
      const newOrder = [...subreddits]
      const [moved] = newOrder.splice(oldIndex, 1)
      newOrder.splice(newIndex, 0, moved)
      reorderSubreddits(newOrder)
    }
  }

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

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'electric')
  }, [settings.theme])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') e.target.blur()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowOmnibar(prev => !prev)
      } else if (e.key === '/') {
        e.preventDefault()
        setShowOmnibar(true)
      } else if (e.key === 'Escape') {
        setShowOmnibar(false)
        setShowSettings(false)
        setShowAdd(false)
        setShowAddSubreddit(false)
        setShowAddFeed(false)
        setShowAddPackage(false)
      } else if (e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        setShowSettings(prev => !prev)
      } else if (e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        const syncBtns = document.querySelectorAll('[title^="Sync"], [title^="Fetch"]')
        syncBtns.forEach(btn => btn.click())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showOmnibar])

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

  const closeConfirm = useCallback(() => setConfirmModal(prev => ({ ...prev, isOpen: false })), [])

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

  // ── Package tracking ──────────────────────────────────────────────────

  const fetchPackage = useCallback(
    async (pkg, force = false) => {
      if (!force) {
        const entry = getPkgCacheEntry(pkg.id)
        if (entry && entry.cachedAt && (Date.now() - entry.cachedAt < CACHE_TTL_MS)) {
          setConfirmModal({
            isOpen: true,
            message: `"${pkg.name}" was updated recently. Sync anyway?`,
            onConfirm: () => {
              closeConfirm()
              fetchPackage(pkg, true)
            },
          })
          return
        }
      }

      setPkgLoadingIds((prev) => new Set([...prev, pkg.id]))
      try {
        const res = await fetch('/api/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: pkg.platform, identifier: pkg.identifier }),
        })
        const data = await res.json()
        if (!res.ok) {
          setPkgCacheEntry(pkg.id, { error: data.error || 'Unknown error' })
        } else {
          setPkgCacheEntry(pkg.id, data)
        }
      } catch (err) {
        setPkgCacheEntry(pkg.id, { error: `Network error: ${err.message}` })
      } finally {
        setPkgLoadingIds((prev) => {
          const next = new Set(prev)
          next.delete(pkg.id)
          return next
        })
      }
    },
    [setPkgCacheEntry, getPkgCacheEntry, closeConfirm]
  )

  const handleSyncAllPkgs = async (force = false) => {
    if (packages.length === 0) return

    if (!force) {
      const freshCount = packages.filter((p) => {
        const entry = getPkgCacheEntry(p.id)
        return entry && entry.cachedAt && Date.now() - entry.cachedAt < CACHE_TTL_MS
      }).length

      if (freshCount > 0) {
        setConfirmModal({
          isOpen: true,
          message: `${freshCount} of your packages are still fresh. Sync everything anyway?`,
          onConfirm: () => {
            closeConfirm()
            handleSyncAllPkgs(true)
          },
        })
        return
      }
    }

    setSyncingAllPkgs(true)
    await Promise.all(packages.map((p) => fetchPackage(p, true)))
    setSyncingAllPkgs(false)
  }

  const handleAddPackage = async (name, platform, identifier) => {
    const newId = addPackage(name, platform, identifier)
    setTimeout(() => {
      fetchPackage({ id: newId, name, platform, identifier }, true)
    }, 100)
  }

  // ── Feed tracking ──────────────────────────────────────────────────

  const fetchFeed = useCallback(
    async (feed, force = false) => {
      if (!force) {
        const entry = getFeedCacheEntry(feed.id)
        if (entry && entry.cachedAt && (Date.now() - entry.cachedAt < CACHE_TTL_MS)) {
          setConfirmModal({
            isOpen: true,
            message: `"${feed.name}" was updated recently. Sync anyway?`,
            onConfirm: () => {
              closeConfirm()
              fetchFeed(feed, true)
            },
          })
          return
        }
      }

      setFeedLoadingIds((prev) => new Set([...prev, feed.id]))
      try {
        const res = await fetch('/api/rss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: feed.url }),
        })
        const data = await res.json()
        if (!res.ok) {
          setFeedCacheEntry(feed.id, { error: data.error || 'Unknown error' })
        } else {
          setFeedCacheEntry(feed.id, data)
        }
      } catch (err) {
        setFeedCacheEntry(feed.id, { error: `Network error: ${err.message}` })
      } finally {
        setFeedLoadingIds((prev) => {
          const next = new Set(prev)
          next.delete(feed.id)
          return next
        })
      }
    },
    [setFeedCacheEntry, getFeedCacheEntry, closeConfirm]
  )

  const handleSyncAllFeeds = async (force = false) => {
    if (feeds.length === 0) return

    if (!force) {
      const freshCount = feeds.filter((f) => {
        const entry = getFeedCacheEntry(f.id)
        return entry && entry.cachedAt && Date.now() - entry.cachedAt < CACHE_TTL_MS
      }).length

      if (freshCount > 0) {
        setConfirmModal({
          isOpen: true,
          message: `${freshCount} of your feeds are still fresh. Sync everything anyway?`,
          onConfirm: () => {
            closeConfirm()
            handleSyncAllFeeds(true)
          },
        })
        return
      }
    }

    setSyncingAllFeeds(true)
    await Promise.all(feeds.map((f) => fetchFeed(f, true)))
    setSyncingAllFeeds(false)
  }

  const handleAddFeed = async (name, url) => {
    const newId = addFeed(name, url)
    setTimeout(() => {
      fetchFeed({ id: newId, name, url }, true)
    }, 100)
  }

  // ── Subreddit tracking ──────────────────────────────────────────────

  const REDDIT_CACHE_TTL = 60 * 60 * 1000 // 1 hour

  const fetchSubreddit = useCallback(
    async (sub, force = false) => {
      if (!force) {
        const entry = getSubCacheEntry(sub.id)
        if (entry && entry.cachedAt && (Date.now() - entry.cachedAt < REDDIT_CACHE_TTL)) {
          setConfirmModal({
            isOpen: true,
            message: `${sub.type === 'user' ? 'u' : 'r'}/${sub.name} was updated recently. Sync anyway?`,
            onConfirm: () => {
              closeConfirm()
              fetchSubreddit(sub, true)
            },
          })
          return
        }
      }

      setSubLoadingIds((prev) => new Set([...prev, sub.id]))
      try {
        const res = await fetch('/api/reddit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subreddit: sub.name,
            type: sub.type || 'subreddit',
            sort: sub.sort || 'hot',
            t: sub.timeRange || 'week',
            limit: sub.limit || settings.redditPostCount || 15,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setSubCacheEntry(sub.id, { error: data.error || 'Unknown error' })
        } else {
          setSubCacheEntry(sub.id, data)
        }
      } catch (err) {
        setSubCacheEntry(sub.id, { error: `Network error: ${err.message}` })
      } finally {
        setSubLoadingIds((prev) => {
          const next = new Set(prev)
          next.delete(sub.id)
          return next
        })
      }
    },
    [setSubCacheEntry, getSubCacheEntry, closeConfirm, settings]
  )

  const handleSyncAllSubs = async (force = false) => {
    if (subreddits.length === 0) return

    if (!force) {
      const freshCount = subreddits.filter((s) => isSubCacheFresh(s.id)).length

      if (freshCount > 0) {
        setConfirmModal({
          isOpen: true,
          message: `${freshCount} of your subreddits are still fresh. Sync everything anyway?`,
          onConfirm: () => {
            closeConfirm()
            handleSyncAllSubs(true)
          },
        })
        return
      }
    }

    setSyncingAllSubs(true)
    await Promise.all(subreddits.map((s) => fetchSubreddit(s, true)))
    setSyncingAllSubs(false)
  }

  const handleAddSubreddit = async (name, sort, timeRange) => {
    const newSub = addSubreddit(name, sort, timeRange)
    setTimeout(() => {
      fetchSubreddit(newSub, true)
    }, 100)
  }

  // ── Auto-refresh stale subreddits on mount ──────────────────────────
  const autoRefreshedRef = useState(false)
  useEffect(() => {
    if (autoRefreshedRef[0] || subreddits.length === 0) return
    autoRefreshedRef[1](true)

    const staleSubs = subreddits.filter(s => !isSubCacheFresh(s.id))
    if (staleSubs.length > 0) {
      // Stagger fetches to avoid rate-limiting
      staleSubs.forEach((sub, i) => {
        setTimeout(() => fetchSubreddit(sub, true), i * 500)
      })
    }
  }, [subreddits, isSubCacheFresh, fetchSubreddit])

  // ── Derived values ────────────────────────────────────────────────────

  const totalLoading = loadingIds.size
  const totalPkgLoading = pkgLoadingIds.size
  const totalFeedLoading = feedLoadingIds.size
  const totalSubLoading = subLoadingIds.size
  const hasTopics = topics.length > 0
  const hasPackages = packages.length > 0
  const hasFeeds = feeds.length > 0
  const hasSubreddits = subreddits.length > 0

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
          <div className="w-full max-w-[2400px] mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex flex-col items-start gap-1 mt-0.5">
                <h1 className="text-accent text-base sm:text-lg tracking-widest leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                  VENN
                </h1>
                <CloudSyncIndicator />
              </div>
              <button
                onClick={() => { setShowSettings(!showSettings); setShowAdd(false); setShowAddPackage(false); setShowAddFeed(false); setShowAddSubreddit(false) }}
                className="hidden sm:flex items-center gap-2 text-xs border border-muted px-2 py-1.5 hover:border-accent transition-colors"
                title="Dashboard Settings"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span className="text-dim">Settings</span>
              </button>
              {(totalLoading > 0 || totalPkgLoading > 0 || totalFeedLoading > 0 || totalSubLoading > 0) && (
                <span className="text-xs text-accent animate-pulse">
                  syncing {totalLoading + totalPkgLoading + totalFeedLoading + totalSubLoading}...
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Mobile settings button */}
              <button
                onClick={() => { setShowSettings(!showSettings); setShowAdd(false); setShowAddPackage(false); setShowAddFeed(false); setShowAddSubreddit(false) }}
                className="sm:hidden text-xs text-dim hover:text-accent border border-muted p-2 h-8 w-8 flex items-center justify-center transition-colors"
                title="Settings"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>

              {/* Mobile Contextual Add Button */}
              <button
                onClick={() => {
                  if (activeTab === 'topics') { setShowAdd(!showAdd); setShowAddPackage(false); setShowAddFeed(false); setShowAddSubreddit(false); setShowSettings(false); }
                  else if (activeTab === 'packages') { setShowAddPackage(!showAddPackage); setShowAdd(false); setShowAddFeed(false); setShowAddSubreddit(false); setShowSettings(false); }
                  else if (activeTab === 'feeds') { setShowAddFeed(!showAddFeed); setShowAdd(false); setShowAddPackage(false); setShowAddSubreddit(false); setShowSettings(false); }
                  else if (activeTab === 'subreddits') { setShowAddSubreddit(!showAddSubreddit); setShowAdd(false); setShowAddPackage(false); setShowAddFeed(false); setShowSettings(false); }
                }}
                className="sm:hidden text-xs text-text border border-border bg-surface hover:text-accent p-2 h-8 w-8 flex items-center justify-center transition-colors"
                title="Add New item"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                +
              </button>

              {hasTopics && (
                <button
                  onClick={() => handleSyncAll()}
                  disabled={syncingAll || totalLoading > 0}
                  className="hidden sm:inline-block text-xs text-dim hover:text-accent border border-muted hover:border-accent px-2 sm:px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {syncingAll ? 'syncing...' : 'sync'}
                </button>
              )}

              <button
                onClick={() => { setShowAdd(!showAdd); setShowSettings(false); setShowAddPackage(false); setShowAddFeed(false); setShowAddSubreddit(false) }}
                className="hidden sm:inline-block text-xs px-2 sm:px-3 py-1.5 border transition-colors"
                style={{
                  borderColor: showAdd ? '#e8f429' : '#2a2a2a',
                  color: showAdd ? '#e8f429' : '#e8e8e8',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {showAdd ? '−' : '+'}
              </button>

              <button
                onClick={() => { setShowAddPackage(!showAddPackage); setShowAdd(false); setShowSettings(false); setShowAddFeed(false); setShowAddSubreddit(false) }}
                className="hidden sm:inline-block text-xs px-2 sm:px-3 py-1.5 border transition-colors"
                style={{
                  borderColor: showAddPackage ? '#e8f429' : '#2a2a2a',
                  color: showAddPackage ? '#e8f429' : '#e8e8e8',
                  fontFamily: 'var(--font-display)',
                }}
                title="Add package to track"
              >
                {showAddPackage ? '−' : '+'} PKG
              </button>

              <button
                onClick={() => { setShowAddFeed(!showAddFeed); setShowAdd(false); setShowAddPackage(false); setShowSettings(false); setShowAddSubreddit(false) }}
                className="hidden sm:inline-block text-xs px-2 sm:px-3 py-1.5 border transition-colors"
                style={{
                  borderColor: showAddFeed ? '#e8f429' : '#2a2a2a',
                  color: showAddFeed ? '#e8f429' : '#e8e8e8',
                  fontFamily: 'var(--font-display)',
                }}
                title="Add RSS feed to track"
              >
                {showAddFeed ? '−' : '+'} FEED
              </button>

              <button
                onClick={() => { setShowAddSubreddit(!showAddSubreddit); setShowAdd(false); setShowAddPackage(false); setShowAddFeed(false); setShowSettings(false) }}
                className="hidden sm:inline-block text-xs px-2 sm:px-3 py-1.5 border transition-colors"
                style={{
                  borderColor: showAddSubreddit ? '#e8f429' : '#2a2a2a',
                  color: showAddSubreddit ? '#e8f429' : '#e8e8e8',
                  fontFamily: 'var(--font-display)',
                }}
                title="Add Reddit source to track (r/ or u/)"
              >
                {showAddSubreddit ? '−' : '+'} REDDIT
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

        <div className="flex w-full max-w-[2400px] mx-auto justify-center items-start">
          <LeftSidebar />
          
          <main className="flex-1 w-full px-4 sm:px-8 py-6 min-w-0">
            <GlobalSearchModal
              isOpen={showOmnibar}
              onClose={() => setShowOmnibar(false)}
              topics={topics}
              feeds={feeds}
              subreddits={subreddits}
              packages={packages}
              globalCache={{ topics: topicCache, subreddits: subCache, feeds: feedCache, packages: pkgCache }}
            />
            {/* Settings panel */}
            {showSettings && (
              <SettingsPanel
                settings={settings}
                onUpdate={updateSettings}
                onClose={() => setShowSettings(false)}
              />
            )}

            {/* Add topic form */}
            {showAdd && (
              <div className="mobile-drawer-container">
                <div className="mobile-drawer-content">
                  <AddTopicForm
                    onAdd={handleAddTopic}
                    onClose={() => setShowAdd(false)}
                  />
                </div>
              </div>
            )}

            {/* Add package form */}
            {showAddPackage && (
              <div className="mobile-drawer-container">
                <div className="mobile-drawer-content">
                  <AddPackageForm
                    onAdd={handleAddPackage}
                    onClose={() => setShowAddPackage(false)}
                  />
                </div>
              </div>
            )}

            {/* Add feed form */}
            {showAddFeed && (
              <div className="mobile-drawer-container">
                <div className="mobile-drawer-content">
                  <AddFeedForm
                    onAdd={handleAddFeed}
                    onClose={() => setShowAddFeed(false)}
                  />
                </div>
              </div>
            )}

            {/* Add subreddit form */}
            {showAddSubreddit && (
              <div className="mobile-drawer-container">
                <div className="mobile-drawer-content">
                  <AddSubredditForm
                    onAdd={handleAddSubreddit}
                    onClose={() => setShowAddSubreddit(false)}
                  />
                </div>
              </div>
            )}

            {/* Empty state */}
            {!hasTopics && !hasPackages && !hasFeeds && !hasSubreddits && !showAdd && !showAddPackage && !showAddFeed && !showAddSubreddit && !showSettings && (
              <div className="flex flex-col items-center justify-center py-20 sm:py-32 text-center px-4">
                <div className="text-4xl text-accent mb-4" style={{ fontFamily: 'var(--font-display)' }}>_</div>
                <p className="text-text text-sm mb-2">nothing tracked yet</p>
                <p className="text-dim text-xs mb-6 max-w-xs">
                  add topics you want to track (movies, news, people), packages to monitor (PyPI, npm, VS Code), or RSS feeds.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => setShowAdd(true)}
                    className="text-sm px-6 py-3 border border-accent text-accent hover:bg-accent hover:text-bg transition-colors rounded"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    + ADD TOPIC
                  </button>
                  <button
                    onClick={() => setShowAddPackage(true)}
                    className="text-sm px-6 py-3 border border-muted text-dim hover:border-accent hover:text-accent transition-colors rounded"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    + ADD PACKAGE
                  </button>
                  <button
                    onClick={() => setShowAddFeed(true)}
                    className="text-sm px-6 py-3 border border-muted text-dim hover:border-accent hover:text-accent transition-colors rounded"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    + ADD FEED
                  </button>
                  <button
                    onClick={() => setShowAddSubreddit(true)}
                    className="text-sm px-6 py-3 border border-orange-400/50 text-orange-400/70 hover:border-orange-400 hover:text-orange-400 transition-colors rounded"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    + ADD SUBREDDIT
                  </button>
                </div>
              </div>
            )}

            {/* Topic grid */}
            <div className={`mt-8 sm:mt-0 w-full ${activeTab === 'topics' ? 'block' : 'hidden sm:block'}`}>
            {hasTopics && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndTopics}>
                <div className="flex items-center gap-3 mb-4 px-2">
                  <span className="text-dim text-xs">
                    {topics.length} topic{topics.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex-1 border-t border-border" />
                </div>

                <SortableContext items={topics.map((t) => t.id)} strategy={rectSortingStrategy}>
                  <div className="flex flex-wrap gap-3 px-2">
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
                </SortableContext>
              </DndContext>
            )}
            </div>

            {/* ── Reddit Intelligence ─────────────────────────────────────────── */}
            {hasSubreddits && (
              <div className={`mt-8 ${activeTab === 'subreddits' ? 'block' : 'hidden sm:block'}`}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSubs}>
                  <div className="flex items-center gap-3 mb-4 px-2">
                    <span className="text-dim text-xs">
                      {subreddits.length} reddit source{subreddits.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 border-t border-border" />
                    <button
                      onClick={() => handleSyncAllSubs()}
                      disabled={syncingAllSubs || totalSubLoading > 0}
                      className="text-xs text-dim hover:text-accent border border-muted hover:border-accent px-2 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {syncingAllSubs ? 'syncing...' : 'sync all'}
                    </button>
                  </div>

                  <SortableContext items={subreddits.map(s => s.id)} strategy={rectSortingStrategy}>
                    <div className="flex flex-wrap gap-3 px-2">
                      {subreddits.map((sub) => (
                        <SubredditCard
                          key={sub.id}
                          subreddit={sub}
                          cacheEntry={getSubCacheEntry(sub.id)}
                          onSync={fetchSubreddit}
                          onRemove={removeSubreddit}
                          onUpdateConfig={updateSubredditConfig}
                          isLoading={subLoadingIds.has(sub.id)}
                          settings={settings}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* ── Package Tracker ─────────────────────────────────────────── */}
            {hasPackages && (
              <div className={`mt-8 ${activeTab === 'packages' ? 'block' : 'hidden sm:block'}`}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndPackages}>
                  <div className="flex items-center gap-3 mb-4 px-2">
                    <span className="text-dim text-xs">
                      {packages.length} package{packages.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 border-t border-border" />
                    <button
                      onClick={() => handleSyncAllPkgs()}
                      disabled={syncingAllPkgs || totalPkgLoading > 0}
                      className="text-xs text-dim hover:text-accent border border-muted hover:border-accent px-2 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {syncingAllPkgs ? 'syncing...' : 'sync all'}
                    </button>
                  </div>

                  <SortableContext items={packages.map(pkg => pkg.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-2">
                      {packages.map((pkg) => (
                        <PackageCard
                          key={pkg.id}
                          pkg={pkg}
                          cacheEntry={getPkgCacheEntry(pkg.id)}
                          onSync={fetchPackage}
                          onRemove={removePackage}
                          isLoading={pkgLoadingIds.has(pkg.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* ── Feeds Tracker ─────────────────────────────────────────── */}
            {hasFeeds && (
              <div className={`mt-8 ${activeTab === 'feeds' ? 'block' : 'hidden sm:block'}`}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndFeeds}>
                  <div className="flex items-center gap-3 mb-4 px-2">
                    <span className="text-dim text-xs">
                      {feeds.length} feed{feeds.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 border-t border-border" />
                    <button
                      onClick={() => handleSyncAllFeeds()}
                      disabled={syncingAllFeeds || totalFeedLoading > 0}
                      className="text-xs text-dim hover:text-accent border border-muted hover:border-accent px-2 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {syncingAllFeeds ? 'syncing...' : 'sync all'}
                    </button>
                  </div>

                  <SortableContext items={feeds.map(f => f.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-2">
                      {feeds.map((feed) => (
                        <FeedCard
                          key={feed.id}
                          feed={feed}
                          cacheEntry={getFeedCacheEntry(feed.id)}
                          onSync={fetchFeed}
                          onRemove={removeFeed}
                          isLoading={feedLoadingIds.has(feed.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </main>

          <RightSidebar />
        </div>

        {/* Footer */}
        <footer className="border-t border-border mt-8 sm:mt-12 w-full">
          <div className="w-full max-w-[2400px] mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <span className="text-dim text-xs">tavily search + {settings.aiMode === 'ollama' ? `ollama (${settings.ollamaModel})` : 'openrouter'}</span>
            <span className="text-dim text-xs">4h cache · manual sync only</span>
          </div>
        </footer>
      </div>

      <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
      <ToastContainer />
    </>
  )
}
