export default function ConfirmDialog({ isOpen, message, onConfirm, onCancel }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-bg/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-sm border border-accent bg-surface shadow-2xl animate-slide-up" 
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-accent bg-accent/5">
          <span className="text-[10px] text-accent font-bold tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
            SYSTEM_CONFIRM
          </span>
          <span className="text-[10px] text-accent/40">v1.0.4</span>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <span className="text-accent text-xl">?</span>
            <p className="text-sm text-text leading-relaxed">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              className="flex-1 py-2 text-xs border border-accent text-accent hover:bg-accent hover:text-bg transition-colors font-bold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              PROCEED
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-2 text-xs border border-border text-dim hover:text-text hover:border-text transition-colors"
            >
              cancel
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
