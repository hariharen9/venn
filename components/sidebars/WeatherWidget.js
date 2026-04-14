import { useState, useEffect, useCallback } from 'react'
import { useSettings } from '../../lib/useSettings'

const WEATHER_CODES = {
  0: { label: 'Clear Sky', icon: '☀️' },
  1: { label: 'Mainly Clear', icon: '🌤️' },
  2: { label: 'Partly Cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Rime Fog', icon: '🌫️' },
  51: { label: 'Light Drizzle', icon: '🌦️' },
  61: { label: 'Slight Rain', icon: '🌧️' },
  71: { label: 'Slight Snow', icon: '🌨️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
}

export default function WeatherWidget() {
  const { settings } = useSettings()
  const [data, setData] = useState(null)
  const [locationName, setLocationName] = useState('Detecting...')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchWeatherData = useCallback(async (lat, lon, name) => {
    setLoading(true)
    setError(null)
    try {
      if (name) setLocationName(name)
      else {
        // Reverse Geocode for auto mode
        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
        const geoData = await geoRes.json()
        setLocationName(`${geoData.city}, ${geoData.principalSubdivisionCode || geoData.countryCode}`)
      }

      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`)
      const weatherData = await weatherRes.json()
      setData(weatherData.current)
    } catch (err) {
      setError('Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (settings.weatherMode === 'manual' && settings.manualLat && settings.manualLon) {
      fetchWeatherData(settings.manualLat, settings.manualLon, settings.manualLocation)
    } else {
      // Auto mode
      if (!navigator.geolocation) {
        setError('Geo not supported')
        setLoading(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeatherData(pos.coords.latitude, pos.coords.longitude),
        (err) => {
          setError('Permission denied')
          setLoading(false)
        }
      )
    }
  }, [settings.weatherMode, settings.manualLat, settings.manualLon, settings.manualLocation, fetchWeatherData])

  if (loading) {
    return (
      <div className="border border-border p-3 flex flex-col items-center justify-center min-h-[140px] opacity-50">
        <span className="text-accent text-[10px] animate-pulse">LOCATING_SATELLITE...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-border p-3 min-h-[140px] flex flex-col justify-center bg-surface">
         <h3 className="text-accent text-xs tracking-widest mb-2" style={{ fontFamily: 'var(--font-display)' }}>ENVIRONMENT</h3>
         <p className="text-[10px] text-red-500/80 uppercase tracking-tighter">Err: {error}</p>
         <p className="text-[9px] text-dim mt-2 italic">
           {settings.weatherMode === 'manual' ? 'Check manual City settings.' : 'Allow location access for live data feed.'}
         </p>
      </div>
    )
  }

  const condition = WEATHER_CODES[data.weather_code] || { label: 'Unknown', icon: '🛰️' }

  return (
    <div className="border border-border p-3 space-y-3 bg-surface" style={{ fontFamily: 'var(--font-mono)' }}>
      <div className="flex justify-between items-start border-b border-border pb-2">
        <div className="flex flex-col">
          <h3 className="text-accent text-xs tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
            ENVIRONMENT
          </h3>
          <span className="text-[9px] text-dim/50 tracking-tighter mt-0.5">
            {settings.weatherMode === 'auto' ? 'LIVE_UPLINK' : 'MANUAL_LOCK'}
          </span>
        </div>
        <span className="text-[10px] text-dim text-right max-w-[120px] truncate">
          {locationName.toUpperCase()}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{condition.icon}</span>
          <div className="flex flex-col">
            <span className="text-xl text-text font-bold leading-none">
              {Math.round(data.temperature_2m)}°C
            </span>
            <span className="text-[10px] text-dim mt-1">{condition.label.toUpperCase()}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="flex flex-col">
          <span className="text-dim text-[9px]">HUMIDITY</span>
          <span className="text-text text-[10px]">{data.relative_humidity_2m}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-dim text-[9px]">WIND_SPD</span>
          <span className="text-text text-[10px]">{data.wind_speed_10m} km/h</span>
        </div>
      </div>
    </div>
  )
}
