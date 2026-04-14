import { useState, useEffect } from 'react'

export default function SystemIndicators() {
  const [mounted, setMounted] = useState(false)
  const [memory, setMemory] = useState(0)

  useEffect(() => {
    setMounted(true)
    const updateMem = () => {
      if (window.performance && window.performance.memory) {
        setMemory(Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024))
      }
    }
    updateMem()
    const timer = setInterval(updateMem, 2000)
    return () => clearInterval(timer)
  }, [])

  if (!mounted) return <div className="border border-border p-3 h-32 opacity-0" />

  const memPercent = Math.min((memory / 512) * 100, 100)

  return (
    <div className="border border-border p-3 space-y-4 bg-surface" style={{ fontFamily: 'var(--font-mono)' }}>
      <h3 className="text-accent text-xs tracking-widest border-b border-border pb-2" style={{ fontFamily: 'var(--font-display)' }}>
        SYS_STATUS
      </h3>
      
      <div>
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-dim">NETWORK_UPLINK</span>
          <span className="text-green-400 animate-pulse-slow">SECURE</span>
        </div>
        <div className="w-full flex gap-0.5 h-1.5 mt-1">
          {[...Array(20)].map((_, i) => (
             <div key={i} className={`flex-1 h-full ${i < 18 ? 'bg-green-500/50' : 'bg-muted'}`} />
          ))}
        </div>
      </div>
      
      <div>
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-dim">JS_HEAP_MEM</span>
          <span className="text-text">{memory > 0 ? `${memory} MB` : 'UNKNOWN'}</span>
        </div>
        <div className="w-full flex gap-0.5 h-1.5 mt-1">
          {[...Array(20)].map((_, i) => {
             const active = (i / 20) * 100 < memPercent
             return <div key={i} className={`flex-1 h-full transition-colors ${active ? 'bg-accent/80' : 'bg-muted'}`} />
          })}
        </div>
      </div>
      
      <div>
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-dim">ENCRYPTION</span>
          <span className="text-text">AES-256</span>
        </div>
      </div>
    </div>
  )
}
