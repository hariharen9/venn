import { useState, useEffect } from 'react'

export default function MiniCalendar() {
  const [mounted, setMounted] = useState(false)
  const [today, setToday] = useState(new Date())

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      const now = new Date()
      if (now.getDate() !== today.getDate()) setToday(now)
    }, 60000)
    return () => clearInterval(timer)
  }, [today])

  if (!mounted) {
    return <div className="border border-border p-3 h-40 opacity-0" />
  }

  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const monthString = today.toLocaleString('en-US', { month: 'short' }).toUpperCase()

  return (
    <div className="border border-border p-3 bg-surface" style={{ fontFamily: 'var(--font-mono)' }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-accent text-xs tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
          {monthString}_{year}
        </span>
      </div>
      
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1 border-b border-muted pb-1">
        {weekdays.map(day => (
          <span key={day} className="text-[9px] text-dim">{day}</span>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-0.5 text-center mt-2">
        {days.map((d, i) => {
          if (!d) return <div key={i} className="aspect-square" />
          const isToday = d === today.getDate()
          return (
            <div 
              key={i} 
              className={`text-[10px] aspect-square flex items-center justify-center transition-colors ${
                isToday 
                  ? 'bg-accent/10 border border-accent text-accent animate-pulse-slow' 
                  : 'text-text hover:bg-muted border border-transparent'
              }`}
            >
              {d}
            </div>
          )
        })}
      </div>
    </div>
  )
}
