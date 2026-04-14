import { useState } from 'react'

const PLATFORMS = [
  { value: 'pypi', label: '🐍 PyPI', placeholder: 'e.g. requests, flask, numpy' },
  { value: 'npm', label: '📦 npm', placeholder: 'e.g. express, react, @scope/pkg' },
  { value: 'vscode', label: '💎 VS Code', placeholder: 'e.g. publisher.extension-name' },
]

export default function AddPackageForm({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState('pypi')
  const [identifier, setIdentifier] = useState('')

  const currentPlatform = PLATFORMS.find((p) => p.value === platform)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !identifier.trim()) return
    onAdd(name.trim(), platform, identifier.trim())
    setName('')
    setIdentifier('')
    onClose()
  }

  return (
    <div
      className="border border-accent bg-surface p-4 animate-slide-up w-full max-w-md mx-auto rounded"
      style={{ fontFamily: 'var(--font-mono)' }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-accent text-xs" style={{ fontFamily: 'var(--font-display)' }}>
          ADD_PACKAGE
        </span>
        <div className="flex-1 border-t border-muted" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Display Name */}
        <div>
          <label className="text-dim text-sm block mb-2">display name *</label>
          <div className="flex items-center border border-muted focus-within:border-accent transition-colors rounded">
            <span className="text-accent text-sm px-3 py-3">›</span>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "My Cool Package"'
              className="flex-1 bg-transparent text-text text-base py-3 pr-3 outline-none placeholder:text-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        {/* Platform Selector */}
        <div>
          <label className="text-dim text-sm block mb-2">platform *</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPlatform(p.value)}
                className="text-sm px-3 py-2 border transition-colors rounded"
                style={{
                  borderColor: platform === p.value ? '#e8f429' : '#2a2a2a',
                  color: platform === p.value ? '#e8f429' : '#666',
                  background: platform === p.value ? 'rgba(232,244,41,0.05)' : 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Package Identifier */}
        <div>
          <label className="text-dim text-sm block mb-2">package identifier *</label>
          <div className="flex items-center border border-muted focus-within:border-accent transition-colors rounded">
            <span className="text-accent text-sm px-3 py-3">›</span>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={currentPlatform?.placeholder || ''}
              className="flex-1 bg-transparent text-text text-base py-3 pr-3 outline-none placeholder:text-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
          <p className="text-xs text-dim mt-2">
            {platform === 'pypi' && 'The package name as it appears on pypi.org'}
            {platform === 'npm' && 'The package name as it appears on npmjs.com'}
            {platform === 'vscode' && 'Format: publisher.extensionName (from the marketplace URL)'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!name.trim() || !identifier.trim()}
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
