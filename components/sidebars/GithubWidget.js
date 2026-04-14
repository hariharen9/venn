import { useState, useEffect } from 'react'

export default function GithubWidget({ username = 'hariharen9' }) {
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [userRes, eventsRes] = await Promise.all([
          fetch(`https://api.github.com/users/${username}`),
          fetch(`https://api.github.com/users/${username}/events/public`)
        ])

        if (!userRes.ok) throw new Error('Github profile unreachable')
        
        const userData = await userRes.json()
        const eventsData = await eventsRes.json()

        setUser(userData)
        setEvents((eventsData || []).slice(0, 3))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [username])

  if (loading) {
    return (
      <div className="border border-border p-3 flex flex-col items-center justify-center min-h-[160px] opacity-50">
        <span className="text-accent text-[10px] animate-pulse">EXTRACTING_GITHUB_INTEL...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-border p-3 min-h-[140px] flex flex-col justify-center bg-surface">
         <h3 className="text-accent text-xs tracking-widest mb-2" style={{ fontFamily: 'var(--font-display)' }}>GITHUB_STATS</h3>
         <p className="text-[10px] text-red-500/80 uppercase">Err: {error}</p>
      </div>
    )
  }

  const formatEventType = (type) => {
    switch (type) {
      case 'PushEvent': return 'PUSHED_TO'
      case 'WatchEvent': return 'STARRED'
      case 'CreateEvent': return 'CREATED'
      case 'PullRequestEvent': return 'PR_OPENED'
      default: return type.replace('Event', '').toUpperCase()
    }
  }

  return (
    <div className="border border-border p-3 space-y-4 bg-surface" style={{ fontFamily: 'var(--font-mono)' }}>
      <div className="flex justify-between items-start border-b border-border pb-2">
        <h3 className="text-accent text-xs tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
          GITHUB_PULSE
        </h3>
        <span className="text-[10px] text-dim">@{username.toUpperCase()}</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col">
          <span className="text-text text-lg font-bold leading-none">{user.public_repos}</span>
          <span className="text-dim text-[9px] mt-1 tracking-tighter">REPOSITORIES</span>
        </div>
        <div className="flex flex-col">
          <span className="text-text text-lg font-bold leading-none">{user.followers}</span>
          <span className="text-dim text-[9px] mt-1 tracking-tighter">FOLLOWERS</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-2 pt-1">
        <p className="text-[9px] text-accent/60 tracking-widest">RECENT_ACTIVITY</p>
        {events.length > 0 ? (
          events.map((ev, i) => (
            <div key={i} className="flex flex-col border-l border-muted pl-2 py-0.5">
              <span className="text-[9px] text-dim">{formatEventType(ev.type)}</span>
              <span className="text-[10px] text-text truncate max-w-[180px]">
                {ev.repo.name.split('/')[1]}
              </span>
            </div>
          ))
        ) : (
          <p className="text-[10px] text-dim italic">No recent public activity</p>
        )}
      </div>

      <div className="pt-2 border-t border-muted flex items-center justify-between">
         <a href={user.html_url} target="_blank" rel="noreferrer" className="text-[10px] text-accent hover:underline">
           VIEW_PROFILE ›
         </a>
      </div>
    </div>
  )
}
