import { useState, useEffect, useRef } from 'react'

export default function GlobalSearchModal({ isOpen, onClose, topics, feeds, subreddits, packages, globalCache }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Process search results
  const lowerQuery = query.toLowerCase()
  let results = []

  if (query.trim().length >= 2) {
    const pushResult = (type, label, parentName, context) => {
      results.push({ type, label, parentName, context })
    }

    // 1. Topics
    topics.forEach(t => {
      if (t.topic.toLowerCase().includes(lowerQuery)) pushResult('TOPIC', t.topic, 'Active Track')
      
      const c = globalCache.topics[t.id]
      if (c && c.summary && c.summary.toLowerCase().includes(lowerQuery)) {
        pushResult('TOPIC SUM', 'AI Summary Match', t.topic, c.summary.substring(0, 150) + '...')
      }
    })

    // 2. Subreddits
    subreddits.forEach(s => {
      if (s.name.toLowerCase().includes(lowerQuery)) pushResult('SUB', `r/${s.name}`, 'Active Track')
      
      const c = globalCache.subreddits[s.id]
      if (c && c.posts) {
        c.posts.forEach(p => {
          if (p.title.toLowerCase().includes(lowerQuery) || (p.selftext && p.selftext.toLowerCase().includes(lowerQuery))) {
            pushResult('POST', p.title, `r/${s.name}`, p.selftext ? (p.selftext.substring(0, 120) + '...') : '')
          }
        })
      }
    })

    // 3. Feeds
    feeds.forEach(f => {
      if (f.name.toLowerCase().includes(lowerQuery)) pushResult('FEED', f.name, 'Active Track')
      
      const c = globalCache.feeds[f.id]
      if (c && c.items) {
        c.items.forEach(item => {
          if (item.title.toLowerCase().includes(lowerQuery) || (item.contentSnippet && item.contentSnippet.toLowerCase().includes(lowerQuery))) {
            pushResult('ARTICLE', item.title, f.name, item.contentSnippet ? (item.contentSnippet.substring(0, 120) + '...') : '')
          }
        })
      }
    })

    // 4. Packages
    packages.forEach(p => {
      if (p.name && p.name.toLowerCase().includes(lowerQuery)) pushResult('PKG', p.name, p.ecosystem ? p.ecosystem.toUpperCase() : 'PKG')
      
      const c = globalCache.packages[p.id]
      if (c && c.description && c.description.toLowerCase().includes(lowerQuery)) {
        pushResult('PKG DESC', c.description.substring(0, 100) + '...', p.name)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-3xl bg-surface border border-border shadow-2xl rounded overflow-hidden flex flex-col" 
        onClick={e => e.stopPropagation()}
        style={{ transform: 'translateY(-10vh)' }}
      >
        <div className="flex items-center p-4 border-b border-border/50">
           <span className="text-accent mr-3">❯</span>
           <input
             ref={inputRef}
             type="text"
             value={query}
             onChange={e => setQuery(e.target.value)}
             placeholder="Omnisearch cached posts, summaries, articles... (ESC to close)"
             className="w-full bg-transparent text-text outline-none font-mono md:text-lg"
             onKeyDown={e => {
               if (e.key === 'Escape') onClose()
             }}
           />
        </div>
        
        {query.trim().length >= 2 && (
          <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
            {results.length > 0 ? (
              <div className="flex flex-col gap-1">
                {results.slice(0, 50).map((res, i) => (
                  <div key={i} className="flex gap-3 p-3 hover:bg-white/[0.02] cursor-default border border-transparent rounded items-start">
                    <span className="text-[9px] w-20 flex-shrink-0 text-dim bg-black/40 px-2 py-1 rounded border border-border/50 text-center tracking-widest mt-0.5">{res.type}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm text-text font-mono truncate">{res.label}</span>
                        <span className="text-[10px] text-accent/70 flex-shrink-0">{res.parentName}</span>
                      </div>
                      {res.context && <p className="text-[11px] text-dim mt-1 truncate">{res.context}</p>}
                    </div>
                  </div>
                ))}
                {results.length > 50 && (
                  <div className="p-2 text-center text-[10px] text-dim border-t border-border/30 mt-2 pt-3">
                    + {results.length - 50} more results hidden. Keep typing to refine.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-dim text-sm italic">
                No results found for &quot;{query}&quot;
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
