import { useState } from 'react'

export default function AddFeedForm({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    onAdd(name.trim(), url.trim())
    setName('')
    setUrl('')
    onClose()
  }

  const handleKey = (e) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="border border-accent bg-surface p-4 animate-slide-up w-full max-w-md mx-auto rounded"
      style={{ fontFamily: 'var(--font-mono)' }}
      onKeyDown={handleKey}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-accent text-xs" style={{ fontFamily: 'var(--font-display)' }}>
          ADD_FEED
        </span>
        <div className="flex-1 border-t border-muted" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Feed Name */}
        <div>
          <label className="text-dim text-sm block mb-2">display name *</label>
          <div className="flex items-center border border-muted focus-within:border-accent transition-colors rounded">
            <span className="text-accent text-sm px-3 py-3">›</span>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hacker News, The Verge"
              className="flex-1 bg-transparent text-text text-base py-3 pr-3 outline-none placeholder:text-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        {/* Feed URL */}
        <div>
          <label className="text-dim text-sm block mb-2">rss / atom url *</label>
          <div className="flex items-center border border-muted focus-within:border-accent transition-colors rounded">
            <span className="text-accent text-sm px-3 py-3">›</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-transparent text-text text-base py-3 pr-3 outline-none placeholder:text-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!name.trim() || !url.trim()}
            className="flex-1 text-sm px-4 py-3 bg-accent text-bg font-medium hover:bg-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ADD
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 text-sm text-dim hover:text-text transition-colors text-center py-3 rounded border border-transparent hover:border-muted"
          >
            cancel
          </button>
        </div>
      </form>
    </div>
  )
}
