import { useState, useEffect } from 'react'

const KEY = 'venn_settings'

const defaults = {
  aiMode: 'openrouter',      // 'ollama' | 'openrouter'
  ollamaModel: 'gemma3',     // any model pulled in Ollama
  ollamaUrl: 'http://localhost:11434',
}

export function useSettings() {
  const [settings, setSettings] = useState(defaults)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved) setSettings({ ...defaults, ...JSON.parse(saved) })
    } catch {}
  }, [])

  const updateSettings = (updates) => {
    const next = { ...settings, ...updates }
    setSettings(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }

  return { settings, updateSettings }
}
