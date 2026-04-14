import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'venn_packages'
const CACHE_KEY = 'venn_pkg_cache'
const CACHE_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

export function usePackages() {
  const [packages, setPackages] = useState([])
  const [cache, setCache] = useState({})

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setPackages(JSON.parse(saved))

      const savedCache = localStorage.getItem(CACHE_KEY)
      if (savedCache) setCache(JSON.parse(savedCache))
    } catch (e) { console.warn('usePackages: localStorage read failed:', e) }
  }, [])

  // Persist packages
  const persistPackages = useCallback((updated) => {
    setPackages(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch (e) { console.warn('usePackages: localStorage write failed:', e) }
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
    setCacheEntry,
    getCacheEntry,
    isCacheStale,
  }
}
