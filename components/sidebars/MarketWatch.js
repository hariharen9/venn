import { useMarkets } from '../../lib/useMarkets'

function PriceRow({ label, value, change, prefix = '', suffix = '' }) {
  const isPos = change > 0
  const isNeg = change < 0
  
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0 hover:bg-white/5 transition-colors px-1">
      <span className="text-[10px] text-dim">{label.toUpperCase()}</span>
      <div className="flex flex-col items-end">
        <span className="text-[11px] text-text font-medium">
          {prefix}{value !== undefined && value !== null ? value.toLocaleString() : '--'}{suffix}
        </span>
        {change !== undefined && (
          <span className={`text-[9px] font-mono ${isPos ? 'text-green-400' : isNeg ? 'text-red-400' : 'text-dim/50'}`}>
            {isPos ? '▴' : isNeg ? '▾' : ''} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  )
}

export default function MarketWatch() {
  const { forex, crypto, commodities, loading, error, refresh } = useMarkets()

  if (loading && !forex) {
    return (
      <div className="border border-border p-3 flex flex-col items-center justify-center min-h-[140px] opacity-50 bg-surface">
        <span className="text-accent text-[10px] animate-pulse">ESTABLISHING_FEED...</span>
      </div>
    )
  }

  if (error && !forex) {
    return (
      <div className="border border-border p-3 bg-surface min-h-[100px] flex flex-col justify-center">
        <h3 className="text-accent text-xs tracking-widest mb-2" style={{ fontFamily: 'var(--font-display)' }}>MARKET_PULSE</h3>
        <p className="text-[10px] text-red-500/80 uppercase">Uplink Error</p>
        <button onClick={refresh} className="text-[9px] text-dim hover:text-accent mt-2 underline">RETRY_CONNECTION</button>
      </div>
    )
  }

  return (
    <div className="border border-border bg-surface flex flex-col" style={{ fontFamily: 'var(--font-mono)' }}>
      {/* Header */}
      <div className="p-3 border-b border-border bg-white/[0.02] flex justify-between items-center">
        <h3 className="text-accent text-xs tracking-widest font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          MARKET_PULSE
        </h3>
        <span className="status-dot scale-75" style={{ background: '#4ade80', boxShadow: '0 0 4px #4ade80' }} />
      </div>

      <div className="p-3 space-y-4">
        {/* Forex Section */}
        {forex && (
          <div>
            <div className="text-[9px] text-dim/50 mb-2 tracking-tighter uppercase">Foreign Exchange</div>
            <div className="flex items-end justify-between bg-bg/50 p-2 border border-border/50 rounded">
              <div className="flex flex-col">
                <span className="text-[10px] text-dim">USD / INR</span>
                <span className="text-lg text-text font-bold leading-tight">₹{forex.rate.toFixed(2)}</span>
              </div>
              <span className="text-[9px] text-dim/40 mb-1">LIVE_CONVERSION</span>
            </div>
          </div>
        )}

        {/* Crypto Section */}
        {crypto && (
          <div>
            <div className="text-[9px] text-dim/50 mb-1 tracking-tighter uppercase">Crypto Assets (INR)</div>
            <div className="space-y-0.5">
              {crypto.map(coin => (
                <PriceRow 
                  key={coin.id} 
                  label={coin.id} 
                  value={coin.price} 
                  change={coin.change} 
                  prefix="₹" 
                />
              ))}
            </div>
          </div>
        )}

        {/* Commodities Section */}
        {commodities && (
          <div>
            <div className="text-[9px] text-dim/50 mb-1 tracking-tighter uppercase">Commodities (INR)</div>
            <div className="space-y-2">
              {/* Gold */}
              <div className="border-b border-border/20 pb-1">
                <div className="text-[8px] text-accent/60 mb-1 font-bold">GOLD (24K)</div>
                <PriceRow label="1 Gram" value={commodities.gold.price_1g} prefix="₹" change={commodities.gold.change_24h} />
                <PriceRow label="1 Pavan (8g)" value={commodities.gold.price_1pavan} prefix="₹" />
              </div>
              {/* Silver */}
              <div>
                <div className="text-[8px] text-accent/60 mb-1 font-bold">SILVER</div>
                <PriceRow label="1 Gram" value={commodities.silver.price_1g} prefix="₹" change={commodities.silver.change_24h} />
                <PriceRow label="1 Pavan (8g)" value={commodities.silver.price_1pavan} prefix="₹" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Status */}
      <div className="px-3 py-2 border-t border-border/50 flex justify-between items-center opacity-40">
        <span className="text-[8px]">UPLINK: ACTIVE</span>
        <span className="text-[8px]">POLL: 10M</span>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  )
}
