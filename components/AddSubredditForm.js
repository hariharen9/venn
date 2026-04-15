import { useState } from 'react'

const SORT_OPTIONS = [
  { value: 'hot', label: 'Hot', desc: 'Trending posts right now' },
  { value: 'new', label: 'New', desc: 'Most recent submissions' },
  { value: 'top', label: 'Top', desc: 'Highest scored posts' },
  { value: 'rising', label: 'Rising', desc: 'Gaining momentum fast' },
]

const TIME_OPTIONS = [
  { value: 'hour', label: 'Past Hour' },
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
]

export default function AddSubredditForm({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const [sort, setSort] = useState('hot')
  const [timeRange, setTimeRange] = useState('week')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name.trim(), sort, timeRange)
    setName('')
    setSort('hot')
    setTimeRange('week')
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
          ADD_SUBREDDIT
        </span>
        <div className="flex-1 border-t border-muted" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subreddit Name */}
        <div>
          <label className="text-dim text-sm block mb-2">subreddit name *</label>
          <div className="flex items-center border border-muted focus-within:border-accent transition-colors rounded">
            <span className="text-orange-400 text-sm px-3 py-3">r/</span>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/^r\//, ''))}
              placeholder="e.g. programming, worldnews, technology"
              className="flex-1 bg-transparent text-text text-base py-3 pr-3 outline-none placeholder:text-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        {/* Sort Selector */}
        <div>
          <label className="text-dim text-sm block mb-2">default sort</label>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSort(option.value)}
                className="text-sm px-3 py-2 border transition-colors rounded"
                style={{
                  borderColor: sort === option.value ? '#e8f429' : '#2a2a2a',
                  color: sort === option.value ? '#e8f429' : '#666',
                  background: sort === option.value ? 'rgba(232,244,41,0.05)' : 'transparent',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-dim mt-2">
            {SORT_OPTIONS.find(o => o.value === sort)?.desc}
          </p>
        </div>

        {/* Time Range (only for top) */}
        {sort === 'top' && (
          <div className="animate-fade-in">
            <label className="text-dim text-sm block mb-2">time range</label>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTimeRange(option.value)}
                  className="text-sm px-3 py-2 border transition-colors rounded"
                  style={{
                    borderColor: timeRange === option.value ? '#f59e0b' : '#2a2a2a',
                    color: timeRange === option.value ? '#f59e0b' : '#666',
                    background: timeRange === option.value ? 'rgba(245,158,11,0.05)' : 'transparent',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!name.trim()}
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
