import { useState, useEffect } from 'react'

export default function MiniCalendar() {
  const [mounted, setMounted] = useState(false)
  const [today] = useState(new Date())
  const [viewDate, setViewDate] = useState(new Date())

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="border border-border p-3 h-40 opacity-0" />
  }

  const changeMonth = (offset) => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1)
    setViewDate(next)
  }

  const resetToToday = () => setViewDate(new Date())

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const monthString = viewDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()

  return (
    <div className="border border-border p-3 bg-surface" style={{ fontFamily: 'var(--font-mono)' }}>
      <div className="flex justify-between items-center mb-3">
        <button 
          onClick={() => changeMonth(-1)}
          className="text-[10px] text-dim hover:text-accent border border-muted hover:border-accent p-1 leading-none"
        >
          &lt;
        </button>
        <button 
          onClick={resetToToday}
          className="text-accent text-xs tracking-widest hover:text-text transition-colors" 
          style={{ fontFamily: 'var(--font-display)' }}
          title="Reset to today"
        >
          {monthString}_{year}
        </button>
        <button 
          onClick={() => changeMonth(1)}
          className="text-[10px] text-dim hover:text-accent border border-muted hover:border-accent p-1 leading-none"
        >
          &gt;
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1 border-b border-muted pb-1">
        {weekdays.map(day => (
          <span key={day} className="text-[9px] text-dim">{day}</span>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-0.5 text-center mt-2">
        {days.map((d, i) => {
          if (!d) return <div key={i} className="aspect-square" />
          const isTodayActual = d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          return (
            <div 
              key={i} 
              className={`text-[10px] aspect-square flex items-center justify-center transition-colors ${
                isTodayActual 
                  ? 'bg-accent/10 border border-accent text-accent animate-pulse-slow' 
                  : 'text-text hover:bg-muted border border-transparent cursor-default'
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
