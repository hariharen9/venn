import { useState, useEffect } from 'react'

const TICKER_DATA = [
  "> INTELLIGENCE DASHBOARD ONLINE",
  "> ESTABLISHING GLOBAL SYNC...",
  "> CLOUD PARITY SECURED",
  "> THREAD_COUNT: OPTIMAL",
  "> AWAITING COMMAND_INPUT",
]

export default function DataTicker() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % TICKER_DATA.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="border border-border p-3 bg-surface" style={{ fontFamily: 'var(--font-mono)' }}>
      <h3 className="text-accent text-xs tracking-widest border-b border-border pb-2 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        SYS_LOGS
      </h3>
      <div className="h-6 relative flex items-end">
        <p key={index} className="text-[10px] text-dim animate-fade-in absolute w-full">
          {TICKER_DATA[index]}
          <span className="animate-pulse ml-1 text-accent">_</span>
        </p>
      </div>
    </div>
  )
}
