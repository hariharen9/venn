import { useState, useEffect } from 'react'

const KEY = 'venn_settings'

const PREFERRED_MODELS = ['gemma3', 'gemma3:12b', 'llama3.2', 'llama3.1', 'mistral', 'phi4', 'deepseek-r1', 'llama2', 'mixtral']

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

function findBestModel(models) {
  if (!models || models.length === 0) return null
  
  for (const preferred of PREFERRED_MODELS) {
    const found = models.find(m => m.startsWith(preferred))
    if (found) return found
  }
  
  return models[0]
}

export function useSettings() {
  const [settings, setSettings] = useState(defaults)
  const [ollamaStatus, setOllamaStatus] = useState('idle') // idle | checking | online | offline
  const [availableModels, setAvailableModels] = useState([])

  useEffect(() => {
    const init = async () => {
      try {
        const saved = localStorage.getItem(KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          setSettings({ ...defaults, ...parsed })
        }
      } catch (e) { console.warn('useSettings: localStorage read failed:', e) }
    }
    init()
  }, [])

  const checkOllamaAndAutoSelect = async (url = settings.ollamaUrl) => {
    setOllamaStatus('checking')
    try {
      const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data = await res.json()
        const models = (data.models || []).map(m => m.name)
        setAvailableModels(models)
        
        const best = findBestModel(models)
        if (best) {
          setSettings(prev => ({
            ...prev,
            ollamaUrl: url,
            ollamaModel: best,
            aiMode: 'ollama',
          }))
        }
        setOllamaStatus('online')
        return { online: true, model: best, url }
      } else {
        setOllamaStatus('offline')
        return { online: false }
      }
    } catch {
      setOllamaStatus('offline')
      return { online: false }
    }
  }

  const updateSettings = (updates) => {
    const next = { ...settings, ...updates }
    setSettings(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch (e) { console.warn('useSettings: localStorage write failed:', e) }
  }

  const getActiveModel = () => {
    if (settings.aiMode === 'ollama') {
      return { provider: 'ollama', model: settings.ollamaModel, url: settings.ollamaUrl }
    }
    return { provider: 'openrouter', model: 'gemma-4-26b-a4b-it' }
  }

  return { 
    settings, 
    updateSettings, 
    defaults,
    ollamaStatus,
    availableModels,
    checkOllamaAndAutoSelect,
    getActiveModel,
  }
}