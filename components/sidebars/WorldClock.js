import { useState, useEffect } from 'react'

export default function WorldClock() {
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!mounted) {
    return (
      <div className="border border-border p-3 flex flex-col items-center justify-center h-48 opacity-50">
        <span className="text-accent text-[10px] animate-pulse">SYNCING_CHRONO...</span>
      </div>
    )
  }

  const fmt = (date, tz) => {
    try {
      if (tz === 'LOCAL') {
        return date.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }
      return date.toLocaleTimeString('en-US', { timeZone: tz, hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch (e) { return 'ERR' }
  }

  return (
    <div className="border border-border p-3 space-y-3 bg-surface" style={{ fontFamily: 'var(--font-mono)' }}>
      <h3 className="text-accent text-xs tracking-widest border-b border-border pb-2" style={{ fontFamily: 'var(--font-display)' }}>
        SYS_TIME
      </h3>
      
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-dim/70">LOCAL</span>
          <span className="text-text">{fmt(time, 'LOCAL')}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-dim/70">UTC</span>
          <span className="text-muted">{fmt(time, 'UTC')}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-dim/70">NYC</span>
          <span className="text-muted">{fmt(time, 'America/New_York')}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-dim/70">TYO</span>
          <span className="text-muted">{fmt(time, 'Asia/Tokyo')}</span>
        </div>
      </div>
      
      <div className="pt-2 border-t border-muted flex justify-between text-[10px]">
        <span className="text-dim/50">UNIX_EPOCH</span>
        <span className="text-accent/80">{Math.floor(time.getTime() / 1000)}</span>
      </div>
    </div>
  )
}
