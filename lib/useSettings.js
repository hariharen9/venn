import { useState, useEffect } from 'react'

const KEY = 'venn_settings'

const defaults = {
  aiMode: 'openrouter',
  ollamaModel: 'gemma3',
  ollamaUrl: 'http://localhost:11434',
  // Widget settings
  defaultTopicType: 'auto',
  showTypeBadge: true,
  showConfidence: false,
  showRawJson: false,
  // Chat settings
  enableChat: true,
  clearChatOnSync: true,
  chatPosition: 'bottom',
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

  return { settings, updateSettings, defaults }
}
