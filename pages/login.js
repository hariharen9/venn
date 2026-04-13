import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function Login() {
  const [pin, setPin] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error | success
  const [errorMsg, setErrorMsg] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const inputRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setShowCursor(v => !v), 530)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const session = localStorage.getItem('venn_session')
    if (session) {
      try {
        const { expiresAt } = JSON.parse(session)
        if (expiresAt > Date.now()) {
          router.push('/')
        }
      } catch {}
    }
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pin.trim()) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setStatus('error')
        setErrorMsg(data.error || 'ACCESS DENIED')
        setPin('')
        setTimeout(() => {
          setStatus('idle')
          inputRef.current?.focus()
        }, 1500)
        return
      }

      setStatus('success')
      setTimeout(() => {
        localStorage.setItem('venn_session', JSON.stringify({ 
          expiresAt: Date.now() + (24 * 60 * 60 * 1000) 
        }))
        router.push('/')
      }, 800)
    } catch (err) {
      setStatus('error')
      setErrorMsg('NETWORK ERROR')
      setPin('')
      setTimeout(() => setStatus('idle'), 1500)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setPin('')
      inputRef.current?.focus()
    }
  }

  return (
    <>
      <Head>
        <title>Venn — LOCKED</title>
        <meta name="robots" content="noindex" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
      </Head>

      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `linear-gradient(#e8f429 1px, transparent 1px), linear-gradient(90deg, #e8f429 1px, transparent 1px)`,
            backgroundSize: '40px 40px' 
          }} 
        />

        {/* Scanlines */}
        <div className="scanline" />

        {/* Main terminal container */}
        <div className="w-full max-w-md sm:max-w-lg px-4 relative z-10">
          {/* VENN Title */}
          <div className="mb-8 sm:mb-10 text-center">
            <h1 
              className="text-5xl sm:text-6xl md:text-7xl tracking-[0.2em] sm:tracking-[0.3em] text-accent"
              style={{ 
                fontFamily: 'var(--font-display)',
                textShadow: '0 0 40px rgba(232,244,41,0.3), 0 0 80px rgba(232,244,41,0.1)',
                letterSpacing: '0.25em'
              }}
            >
              VENN
            </h1>
            <p className="text-dim text-xs sm:text-sm mt-3 tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
              PERSONAL INTEL DASHBOARD
            </p>
          </div>

          {/* Terminal window */}
          <div 
            className="border border-border bg-surface shadow-2xl"
            style={{ boxShadow: '0 0 60px rgba(232,244,41,0.05), inset 0 0 30px rgba(0,0,0,0.5)' }}
          >
            {/* Terminal header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg/50">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-dim" style={{ fontFamily: 'var(--font-display)' }}>
                AUTH_PROTOCOL_V1.0
              </span>
              <div className="w-10" />
            </div>

            {/* Terminal body */}
            <div className="p-6">
              {status === 'error' ? (
                <div className="text-center animate-shake">
                  <div className="text-4xl mb-4 text-red-500">✕</div>
                  <p className="text-red-400 text-sm font-bold tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
                    {errorMsg}
                  </p>
                  <p className="text-dim text-xs mt-2">Re-authenticating...</p>
                </div>
              ) : status === 'success' ? (
                <div className="text-center">
                  <div className="text-4xl mb-4 text-accent animate-pulse">✓</div>
                  <p className="text-accent text-sm tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
                    ACCESS GRANTED
                  </p>
                  <p className="text-dim text-xs mt-2">Initializing dashboard...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-accent text-xs" style={{ fontFamily: 'var(--font-display)' }}>
                      ▸
                    </span>
                    <span className="text-dim text-xs" style={{ fontFamily: 'var(--font-display)' }}>
                      ENTER_AUTH_TOKEN
                    </span>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="flex items-center border border-muted focus-within:border-accent focus-within:shadow-[0_0_10px_rgba(232,244,41,0.2)] transition-all duration-300 bg-bg/30 rounded">
                      <span className="text-accent text-lg px-3 py-4 sm:py-3" style={{ fontFamily: 'var(--font-display)' }}>
                        ═══╣
                      </span>
                      <input
                        ref={inputRef}
                        autoFocus
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        onKeyDown={handleKeyDown}
                        placeholder="••••••••"
                        disabled={status === 'loading'}
                        className="flex-1 bg-transparent text-text text-lg sm:text-xl py-4 sm:py-3 pr-3 sm:pr-4 outline-none tracking-[0.3em] placeholder:text-muted/50 disabled:opacity-50"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                      <span className="pr-3 sm:pr-4 text-accent text-lg">
                        {showCursor ? '▌' : ' '}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                      <button
                        type="submit"
                        disabled={pin.length < 4 || status === 'loading'}
                        className="w-full sm:w-auto px-8 py-3 sm:py-2.5 border text-sm tracking-widest transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed rounded"
                        style={{
                          borderColor: pin.length >= 4 ? '#e8f429' : '#2a2a2a',
                          color: pin.length >= 4 ? '#e8f429' : '#444',
                          background: pin.length >= 4 ? 'rgba(232,244,41,0.05)' : 'transparent',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {status === 'loading' ? 'VERIFYING...' : 'EXECUTE'}
                      </button>

                      <div className="text-xs text-dim flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span style={{ fontFamily: 'var(--font-display)' }}>AWAITING_INPUT</span>
                      </div>
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* Terminal footer */}
            <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-dim/50">
              <span style={{ fontFamily: 'var(--font-display)' }}>SESSION: ENCRYPTED</span>
              <span>{new Date().getFullYear()} // VENN_SYSTEMS</span>
            </div>
          </div>

          {/* Decorative footer */}
          <div className="mt-8 text-center">
            <p className="text-dim/30 text-[10px] tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
              UNAUTHORIZED ACCESS IS PROHIBITED
            </p>
          </div>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-4 left-4 text-accent/20 text-xs font-mono">┌─ AUTH_GATE</div>
        <div className="absolute top-4 right-4 text-accent/20 text-xs font-mono">─┐</div>
        <div className="absolute bottom-4 left-4 text-accent/20 text-xs font-mono">└──</div>
        <div className="absolute bottom-4 right-4 text-accent/20 text-xs font-mono">┘</div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </>
  )
}