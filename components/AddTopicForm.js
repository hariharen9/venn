import { useState } from 'react'

export default function AddTopicForm({ onAdd, onClose }) {
  const [topic, setTopic] = useState('')
  const [query, setQuery] = useState('')
  const [showQuery, setShowQuery] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!topic.trim()) return
    onAdd(topic.trim(), query.trim())
    setTopic('')
    setQuery('')
    onClose()
  }

  const handleKey = (e) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="border border-accent bg-surface p-4 animate-slide-up"
      style={{ fontFamily: 'var(--font-mono)' }}
      onKeyDown={handleKey}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-accent text-xs" style={{ fontFamily: 'var(--font-display)' }}>
          ADD_TOPIC
        </span>
        <div className="flex-1 border-t border-muted" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-dim text-xs block mb-1">topic name *</label>
          <div className="flex items-center border border-muted focus-within:border-accent transition-colors">
            <span className="text-accent text-xs px-2">›</span>
            <input
              autoFocus
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Oppenheimer box office"
              className="flex-1 bg-transparent text-text text-sm py-2 pr-2 outline-none placeholder:text-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowQuery(!showQuery)}
            className="text-xs text-dim hover:text-text transition-colors"
          >
            {showQuery ? '− hide' : '+ custom search query'} (optional)
          </button>

          {showQuery && (
            <div className="mt-2 animate-fade-in">
              <label className="text-dim text-xs block mb-1">
                override search query
              </label>
              <div className="flex items-center border border-muted focus-within:border-muted transition-colors">
                <span className="text-dim text-xs px-2">›</span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='e.g. "Oppenheimer 2024 box office total worldwide"'
                  className="flex-1 bg-transparent text-text text-sm py-2 pr-2 outline-none placeholder:text-muted"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <p className="text-xs text-dim mt-1">
                If blank, the topic name is used as the search query.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!topic.trim()}
            className="text-xs px-4 py-2 bg-accent text-bg font-medium hover:bg-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ADD
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-dim hover:text-text transition-colors"
          >
            cancel (esc)
          </button>
        </div>
      </form>
    </div>
  )
}
