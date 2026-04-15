import { useEffect, useState, useRef } from 'react'

export default function CloudSyncIndicator() {
  const [status, setStatus] = useState('syncing') // 'syncing' | 'synced' | 'error'
  const debounceRef = useRef(null)
  
  // Hard pull from cloud on initial load
  useEffect(() => {
    const pullCloudState = async () => {
      setStatus('syncing')
      try {
        const res = await fetch('/api/sync')
        const json = await res.json()
        if (json.exists && json.data) {
          const cloudTime = json.data.updatedAt || 0
          const localTimeStr = localStorage.getItem('venn_sync_time')
          const localTime = localTimeStr ? parseInt(localTimeStr, 10) : 0

          // If the cloud is newer than local (or local has never synced), overwrite!
          if (cloudTime > localTime) {
            if (json.data.settings) localStorage.setItem('venn_settings', JSON.stringify(json.data.settings))
            if (json.data.topics) localStorage.setItem('venn_topics', JSON.stringify(json.data.topics))
            if (json.data.packages) localStorage.setItem('venn_packages', JSON.stringify(json.data.packages))
            if (json.data.feeds) localStorage.setItem('venn_feeds', JSON.stringify(json.data.feeds))
            localStorage.setItem('venn_sync_time', cloudTime.toString())

            // Force all UI hooks to reload from localStorage
            window.dispatchEvent(new Event('venn_sync_updated'))
          }
        } else {
          // If cloud data is completely empty, but we have local data, force an initial backup!
          const hasLocalData = localStorage.getItem('venn_topics') || localStorage.getItem('venn_packages') || localStorage.getItem('venn_feeds')
          if (hasLocalData) {
            window.dispatchEvent(new Event('venn_needs_sync'))
          }
        }
        setStatus('synced')
      } catch (err) {
        console.error('Cloud pull failed', err)
        setStatus('error')
      }
    }
    pullCloudState()
  }, [])

  // Listen to local changes and push them after a debounce
  useEffect(() => {
    const pushCloudState = async () => {
      setStatus('syncing')
      try {
        const settings = JSON.parse(localStorage.getItem('venn_settings') || 'null')
        const topics = JSON.parse(localStorage.getItem('venn_topics') || '[]')
        const pkgs = JSON.parse(localStorage.getItem('venn_packages') || '[]')
        const feeds = JSON.parse(localStorage.getItem('venn_feeds') || '[]')

        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings, topics, packages: pkgs, feeds })
        })
        const json = await res.json()
        if (json.success && json.timestamp) {
          localStorage.setItem('venn_sync_time', json.timestamp.toString())
          setStatus('synced')
        } else {
          setStatus('error')
        }
      } catch (err) {
        console.error('Cloud push failed', err)
        setStatus('error')
      }
    }

    const handler = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      // Debounce the push to cloud to batch multiple quick clicks (like adding a few packages)
      debounceRef.current = setTimeout(pushCloudState, 2000)
      setStatus('syncing')
    }

    // This event is fired by useTopics, useSettings, usePackages when user modifies data
    window.addEventListener('venn_needs_sync', handler)
    return () => window.removeEventListener('venn_needs_sync', handler)
  }, [])

  return (
    <div 
      className="flex flex-col items-start" 
      style={{ fontFamily: 'var(--font-mono)' }}
      title={status === 'error' ? 'Cloud sync failed — continuing locally' : 'Netlify Blobs Sync'}
    >
      <div className="flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
        <span 
          className={`flex w-1.5 h-1.5 rounded-full ${
            status === 'syncing' ? 'bg-accent animate-pulse' : 
            status === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`} 
        />
        <span className="text-[9px] uppercase tracking-[0.2em] text-dim">{status}</span>
      </div>
    </div>
  )
}
