import { useState, useEffect } from 'react'

let toastFn = null

export function showToast(message, type = 'info', duration = 5000) {
  if (toastFn) {
    toastFn(message, type, duration)
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    toastFn = (message, type, duration) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    return () => { toastFn = null }
  }, [])

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return 'border-green-500 bg-green-950/50 text-green-400'
      case 'error':
        return 'border-red-500 bg-red-950/50 text-red-400'
      case 'warning':
        return 'border-yellow-500 bg-yellow-950/50 text-yellow-400'
      default:
        return 'border-accent bg-accent/10 text-accent'
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'success': return '✓'
      case 'error': return '✕'
      case 'warning': return '⚠'
      default: return '›'
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`border-l-4 px-4 py-3 rounded shadow-lg animate-slide-up ${getTypeStyles(toast.type)}`}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{getIcon(toast.type)}</span>
            <span className="text-sm">{toast.message}</span>
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease forwards;
        }
      `}</style>
    </div>
  )
}