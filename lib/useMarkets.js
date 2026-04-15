import { useState, useEffect, useCallback } from 'react'

export function useMarkets() {
  const [forex, setForex] = useState(null)
  const [crypto, setCrypto] = useState(null)
  const [commodities, setCommodities] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch Forex (USD/INR)
      const forexRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      const forexData = await forexRes.json()
      
      // 2. Fetch Crypto & Commodity Proxies (PAXG for Gold, KAG for Silver)
      const ids = 'bitcoin,ethereum,solana,dogecoin,pax-gold,kinesis-silver'
      const cryptoRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=inr&include_24hr_change=true`)
      const data = await cryptoRes.json()

      setForex({
        rate: forexData.rates.INR,
        base: 'USD',
        target: 'INR',
        updated: forexData.date
      })

      setCrypto([
        { id: 'BTC', name: 'Bitcoin', price: data.bitcoin.inr, change: data.bitcoin.inr_24h_change },
        { id: 'ETH', name: 'Ethereum', price: data.ethereum.inr, change: data.ethereum.inr_24h_change },
        { id: 'SOL', name: 'Solana', price: data.solana.inr, change: data.solana.inr_24h_change },
        { id: 'DOGE', name: 'Dogecoin', price: data.dogecoin.inr, change: data.dogecoin.inr_24h_change },
      ])

      // Logic for Gold/Silver (Prices from CoinGecko are per Troy Ounce)
      const GRAMS_PER_OZ = 31.1035
      const GRAMS_PER_PAVAN = 8

      const gold_1g = data['pax-gold'].inr / GRAMS_PER_OZ
      const silver_1g = data['kinesis-silver'].inr / GRAMS_PER_OZ

      setCommodities({
        gold: {
          price_1g: Math.round(gold_1g),
          price_1pavan: Math.round(gold_1g * GRAMS_PER_PAVAN),
          change_24h: data['pax-gold'].inr_24h_change
        },
        silver: {
          price_1g: Math.round(silver_1g),
          price_1pavan: Math.round(silver_1g * GRAMS_PER_PAVAN),
          change_24h: data['kinesis-silver'].inr_24h_change
        }
      })

      setError(null)
    } catch (err) {
      console.error('Market fetch error:', err)
      setError('Market data uplink failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 10 * 60 * 1000) // Poll every 10 mins
    return () => clearInterval(interval)
  }, [fetchAll])

  return { forex, crypto, commodities, loading, error, refresh: fetchAll }
}
