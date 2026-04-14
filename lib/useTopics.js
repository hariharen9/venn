import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'venn_topics'
const CACHE_KEY = 'venn_cache'
const CACHE_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

export function useTopics() {
  const [topics, setTopics] = useState([])
  const [cache, setCache] = useState({})

  const loadLocally = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setTopics(JSON.parse(saved))

      const savedCache = localStorage.getItem(CACHE_KEY)
      if (savedCache) setCache(JSON.parse(savedCache))
    } catch (e) { console.warn('useTopics: localStorage read failed:', e) }
  }, [])

  // Load from localStorage on mount and listen for cloud syncs
  useEffect(() => {
    loadLocally()
    window.addEventListener('venn_sync_updated', loadLocally)
    return () => window.removeEventListener('venn_sync_updated', loadLocally)
  }, [loadLocally])

  const triggerUpload = () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('venn_needs_sync'))
  }

  // Persist topics
  const persistTopics = useCallback((updated) => {
    setTopics(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch (e) { console.warn('useTopics: localStorage write failed:', e) }
    triggerUpload()
  }, [])

  // Persist cache
  const persistCache = useCallback((updated) => {
    setCache(updated)
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(updated)) } catch (e) { console.warn('useTopics: localStorage write failed:', e) }
  }, [])

  const addTopic = useCallback((topic, query = '', topicType = 'auto') => {
    const newTopic = {
      id: Date.now().toString(),
      topic: topic.trim(),
      query: query.trim(),
      topicType: topicType,
      createdAt: new Date().toISOString(),
    }
    persistTopics([...topics, newTopic])
    return newTopic.id
  }, [topics, persistTopics])

  const removeTopic = useCallback((id) => {
    persistTopics(topics.filter((t) => t.id !== id))
    const updatedCache = { ...cache }
    delete updatedCache[id]
    persistCache(updatedCache)
    try { localStorage.removeItem(`venn_chat_${id}`) } catch {}
  }, [topics, cache, persistTopics, persistCache])

  const updateTopic = useCallback((id, updates) => {
    persistTopics(topics.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }, [topics, persistTopics])

  const setCacheEntry = useCallback((id, data) => {
    const updated = { ...cache, [id]: { ...data, cachedAt: Date.now() } }
    persistCache(updated)
  }, [cache, persistCache])

  // Always returns cached data regardless of age — card decides how to display it
  const getCacheEntry = useCallback((id) => {
    return cache[id] || null
  }, [cache])

  // True if no cache or cache is older than TTL
  const isCacheStale = useCallback((id) => {
    const entry = cache[id]
    if (!entry) return true
    return Date.now() - entry.cachedAt > CACHE_TTL_MS
  }, [cache])

  return {
    topics,
    cache,
    addTopic,
    removeTopic,
    updateTopic,
    setCacheEntry,
    getCacheEntry,
    isCacheStale,
  }
}
