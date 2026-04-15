import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'venn_subreddits'
const CACHE_KEY = 'venn_subreddit_cache'
const CACHE_TTL_MS = 1 * 60 * 60 * 1000 // 1 hour

export function useSubreddits() {
  const [subreddits, setSubreddits] = useState([])
  const [cache, setCache] = useState({})

  // Load from localStorage on mount + listen for cloud sync
  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) setSubreddits(JSON.parse(stored))
        const storedCache = localStorage.getItem(CACHE_KEY)
        if (storedCache) setCache(JSON.parse(storedCache))
      } catch (e) {
        console.warn('Failed to load subreddits from localStorage', e)
      }
    }
    load()
    window.addEventListener('venn_sync_updated', load)
    return () => window.removeEventListener('venn_sync_updated', load)
  }, [])

  const persistSubreddits = useCallback((newSubs) => {
    setSubreddits(newSubs)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSubs))
      window.dispatchEvent(new Event('venn_needs_sync'))
    } catch (e) {
      console.warn('Failed to persist subreddits', e)
    }
  }, [])

  const persistCache = useCallback((newCache) => {
    setCache(newCache)
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(newCache))
    } catch (e) {
      console.warn('Failed to persist subreddit cache', e)
    }
  }, [])

  const addSubreddit = useCallback((name, sort = 'hot', timeRange = 'week') => {
    const subName = name.replace(/^r\//, '').trim().toLowerCase()
    const newSub = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: subName,
      sort,
      timeRange,
      createdAt: new Date().toISOString(),
    }
    persistSubreddits([...subreddits, newSub])
    return newSub
  }, [subreddits, persistSubreddits])

  const removeSubreddit = useCallback((id) => {
    persistSubreddits(subreddits.filter(s => s.id !== id))
    const newCache = { ...cache }
    delete newCache[id]
    persistCache(newCache)
  }, [subreddits, cache, persistSubreddits, persistCache])

  const updateSubredditConfig = useCallback((id, config) => {
    persistSubreddits(subreddits.map(s =>
      s.id === id ? { ...s, ...config } : s
    ))
  }, [subreddits, persistSubreddits])

  const reorderSubreddits = useCallback((newOrder) => {
    persistSubreddits(newOrder)
  }, [persistSubreddits])

  const setCacheEntry = useCallback((id, data) => {
    const newCache = {
      ...cache,
      [id]: { ...data, cachedAt: Date.now() },
    }
    persistCache(newCache)
  }, [cache, persistCache])

  const getCacheEntry = useCallback((id) => {
    return cache[id] || null
  }, [cache])

  const isCacheFresh = useCallback((id) => {
    const entry = cache[id]
    if (!entry || !entry.cachedAt) return false
    return Date.now() - entry.cachedAt < CACHE_TTL_MS
  }, [cache])

  return {
    subreddits,
    cache,
    addSubreddit,
    removeSubreddit,
    updateSubredditConfig,
    reorderSubreddits,
    setCacheEntry,
    getCacheEntry,
    isCacheFresh,
  }
}
