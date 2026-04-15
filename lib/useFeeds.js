import { useState, useEffect, useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'

const STORAGE_KEY = 'venn_feeds'
const CACHE_KEY = 'venn_feed_cache'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour for feeds is usually better than 4 hours

export function useFeeds() {
  const [feeds, setFeeds] = useState([])
  const [cache, setCache] = useState({})

  const loadLocally = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setFeeds(JSON.parse(saved))

      const savedCache = localStorage.getItem(CACHE_KEY)
      if (savedCache) setCache(JSON.parse(savedCache))
    } catch (e) { console.warn('useFeeds: localStorage read failed:', e) }
  }, [])

  useEffect(() => {
    loadLocally()
    window.addEventListener('venn_sync_updated', loadLocally)
    return () => window.removeEventListener('venn_sync_updated', loadLocally)
  }, [loadLocally])

  const triggerUpload = () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('venn_needs_sync'))
  }

  const persistFeeds = useCallback((updated) => {
    setFeeds(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch (e) { console.warn('useFeeds: localStorage write failed:', e) }
    triggerUpload()
  }, [])

  const persistCache = useCallback((updated) => {
    setCache(updated)
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(updated)) } catch (e) { console.warn('useFeeds: localStorage write failed:', e) }
  }, [])

  const addFeed = useCallback((name, url) => {
    const newFeed = {
      id: Date.now().toString(),
      name: name.trim(),
      url: url.trim(),
      createdAt: new Date().toISOString(),
    }
    persistFeeds([...feeds, newFeed])
    return newFeed.id
  }, [feeds, persistFeeds])

  const removeFeed = useCallback((id) => {
    persistFeeds(feeds.filter((f) => f.id !== id))
    const updatedCache = { ...cache }
    delete updatedCache[id]
    persistCache(updatedCache)
  }, [feeds, cache, persistFeeds, persistCache])

  const reorderFeeds = useCallback((activeId, overId) => {
    const oldIndex = feeds.findIndex((item) => item.id === activeId)
    const newIndex = feeds.findIndex((item) => item.id === overId)
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      persistFeeds(arrayMove(feeds, oldIndex, newIndex))
    }
  }, [feeds, persistFeeds])

  const setCacheEntry = useCallback((id, data) => {
    const updated = { ...cache, [id]: { ...data, cachedAt: Date.now() } }
    persistCache(updated)
  }, [cache, persistCache])

  const getCacheEntry = useCallback((id) => {
    return cache[id] || null
  }, [cache])

  const isCacheStale = useCallback((id) => {
    const entry = cache[id]
    if (!entry) return true
    return Date.now() - entry.cachedAt > CACHE_TTL_MS
  }, [cache])

  return {
    feeds,
    addFeed,
    removeFeed,
    reorderFeeds,
    setCacheEntry,
    getCacheEntry,
    isCacheStale,
  }
}
