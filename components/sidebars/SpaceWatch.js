import { useState, useEffect } from 'react'

export default function SpaceWatch() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchSpacePulse() {
    try {
      const res = await fetch('/api/space-pulse')
      if (!res.ok) throw new Error('Uplink failed')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSpacePulse()
    // Poll for ISS updates every 3 minutes (APOD is static but ISS moves)
    const interval = setInterval(fetchSpacePulse, 180000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div className="border border-border p-3 flex flex-col items-center justify-center min-h-[200px] opacity-50 bg-surface">
        <span className="text-accent text-[10px] animate-pulse">ESTABLISHING_SPACE_LINK...</span>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="border border-border p-3 bg-surface min-h-[100px] flex flex-col justify-center">
        <h3 className="text-accent text-xs tracking-widest mb-2" style={{ fontFamily: 'var(--font-display)' }}>SPACE_WATCH</h3>
        <p className="text-[10px] text-red-500/80 uppercase">Telemetry Error</p>
        <button onClick={fetchSpacePulse} className="text-[9px] text-dim hover:text-accent mt-2 underline">RETRY_LINK</button>
      </div>
    )
  }

  const { apod, iss } = data

  return (
    <div className="border border-border bg-surface flex flex-col" style={{ fontFamily: 'var(--font-mono)' }}>
      {/* Header */}
      <div className="p-3 border-b border-border bg-white/[0.02] flex justify-between items-center">
        <h3 className="text-accent text-xs tracking-widest font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          SPACE_WATCH
        </h3>
        <span className="text-[8px] text-dim font-mono tracking-tighter">NASA_UPLINK</span>
      </div>

      {/* APOD Section */}
      <div className="p-3 border-b border-border/50">
        <div className="text-[9px] text-dim/50 mb-2 uppercase tracking-tighter">Astronomy Picture of the Day</div>
        {apod.media_type === 'image' ? (
          <div className="relative group">
            <img 
              src={apod.url} 
              alt={apod.title} 
              className="w-full h-auto border border-border/50 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
            />
            <div className="absolute inset-0 bg-accent/5 pointer-events-none" />
          </div>
        ) : (
          <div className="bg-bg border border-border/50 p-4 flex flex-col items-center justify-center text-center">
             <span className="text-xl mb-2">📹</span>
             <span className="text-[10px] text-accent uppercase">Video Content Detect</span>
             <a href={apod.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-dim underline mt-1 hover:text-accent transition-colors">WATCH ON SOURCE</a>
          </div>
        )}
        <h4 className="text-[10px] text-text font-bold mt-2 leading-snug">{apod.title.toUpperCase()}</h4>
      </div>

      {/* ISS Section */}
      <div className="p-3">
        <div className="text-[9px] text-dim/50 mb-2 uppercase tracking-tighter flex justify-between">
          <span>ISS Telemetry</span>
          <span className="animate-pulse text-accent">LIVE</span>
        </div>
        
        <div className="grid grid-cols-2 gap-y-3 gap-x-2">
          <div>
            <div className="text-[8px] text-dim">LATITUDE</div>
            <div className="text-xs text-text">{iss.latitude.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-[8px] text-dim">LONGITUDE</div>
            <div className="text-xs text-text">{iss.longitude.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-[8px] text-dim">VELOCITY</div>
            <div className="text-[10px] text-text">{~~iss.velocity} KM/H</div>
          </div>
          <div>
            <div className="text-[8px] text-dim">ALTITUDE</div>
            <div className="text-[10px] text-text">{~~iss.altitude} KM</div>
          </div>
        </div>
      </div>

      {/* Visibility Status */}
      <div className="px-3 py-2 border-t border-border/50 bg-white/[0.01] flex justify-between items-center">
        <span className="text-[8px] text-dim/40 uppercase">Sat_ID: 25544</span>
        <span className={`text-[8px] ${iss.visibility === 'daylight' ? 'text-accent' : 'text-dim'} uppercase`}>
          {iss.visibility.toUpperCase()}
        </span>
      </div>
    </div>
  )
}
