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
      className="border border-accent bg-surface p-4 animate-slide-up w-full max-w-md mx-auto"
      style={{ fontFamily: 'var(--font-mono)' }}
      onKeyDown={handleKey}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-accent text-xs" style={{ fontFamily: 'var(--font-display)' }}>
          ADD_TOPIC
        </span>
        <div className="flex-1 border-t border-muted" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-dim text-xs block mb-2">topic name *</label>
          <div className="flex items-center border border-muted focus-within:border-accent transition-colors rounded">
            <span className="text-accent text-sm px-3 py-3">›</span>
            <input
              autoFocus
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Oppenheimer box office"
              className="flex-1 bg-transparent text-text text-base py-3 pr-3 outline-none placeholder:text-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowQuery(!showQuery)}
            className="text-sm text-dim hover:text-text transition-colors"
          >
            {showQuery ? '− hide' : '+ custom search query'} (optional)
          </button>

          {showQuery && (
            <div className="mt-3 animate-fade-in">
              <label className="text-dim text-xs block mb-2">
                override search query
              </label>
              <div className="flex items-center border border-muted focus-within:border-muted transition-colors rounded">
                <span className="text-dim text-sm px-3 py-3">›</span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='e.g. "Oppenheimer 2024 box office total worldwide"'
                  className="flex-1 bg-transparent text-text text-base py-3 pr-3 outline-none placeholder:text-muted"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <p className="text-xs text-dim mt-2">
                If blank, the topic name is used as the search query.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!topic.trim()}
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
