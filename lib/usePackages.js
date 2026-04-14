import { useState, useEffect, useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'

const STORAGE_KEY = 'venn_packages'
const CACHE_KEY = 'venn_pkg_cache'
const CACHE_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

export function usePackages() {
  const [packages, setPackages] = useState([])
  const [cache, setCache] = useState({})

  const loadLocally = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setPackages(JSON.parse(saved))

      const savedCache = localStorage.getItem(CACHE_KEY)
      if (savedCache) setCache(JSON.parse(savedCache))
    } catch (e) { console.warn('usePackages: localStorage read failed:', e) }
  }, [])

  // Load from localStorage on mount and listen for cloud updates
  useEffect(() => {
    loadLocally()
    window.addEventListener('venn_sync_updated', loadLocally)
    return () => window.removeEventListener('venn_sync_updated', loadLocally)
  }, [loadLocally])

  const triggerUpload = () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('venn_needs_sync'))
  }

  // Persist packages
  const persistPackages = useCallback((updated) => {
    setPackages(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch (e) { console.warn('usePackages: localStorage write failed:', e) }
    triggerUpload()
  }, [])

  // Persist cache
  const persistCache = useCallback((updated) => {
    setCache(updated)
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(updated)) } catch (e) { console.warn('usePackages: localStorage write failed:', e) }
  }, [])

  const addPackage = useCallback((name, platform, identifier) => {
    const newPkg = {
      id: Date.now().toString(),
      name: name.trim(),
      platform,
      identifier: identifier.trim(),
      createdAt: new Date().toISOString(),
    }
    persistPackages([...packages, newPkg])
    return newPkg.id
  }, [packages, persistPackages])

  const removePackage = useCallback((id) => {
    persistPackages(packages.filter((p) => p.id !== id))
    const updatedCache = { ...cache }
    delete updatedCache[id]
    persistCache(updatedCache)
  }, [packages, cache, persistPackages, persistCache])

  const reorderPackages = useCallback((activeId, overId) => {
    const oldIndex = packages.findIndex((item) => item.id === activeId)
    const newIndex = packages.findIndex((item) => item.id === overId)
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      persistPackages(arrayMove(packages, oldIndex, newIndex))
    }
  }, [packages, persistPackages])

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
    packages,
    addPackage,
    removePackage,
    reorderPackages,
    setCacheEntry,
    getCacheEntry,
    isCacheStale,
  }
}
