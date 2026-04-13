// pages/api/refresh.js — Venn local dev route
// AI provider: tries Ollama first if mode=ollama, falls back to OpenRouter on failure

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { topic, query, aiMode = 'openrouter', ollamaModel = 'gemma3', ollamaUrl = 'http://localhost:11434' } = req.body
  if (!topic) return res.status(400).json({ error: 'topic is required' })

  const TAVILY_KEY = process.env.TAVILY_API_KEY
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY

  if (!TAVILY_KEY) return res.status(500).json({ error: 'Missing TAVILY_API_KEY in .env.local' })

  // ── Step 1: Tavily search ──────────────────────────────────────────────────
  const searchQuery = query || topic
  let searchResults = []
  let tavilyAnswer = ''

  try {
    const tavilyRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query: searchQuery,
        search_depth: 'basic',
        max_results: 6,
        include_answer: true,
        include_raw_content: false,
        topic: 'news',
      }),
    })
    if (!tavilyRes.ok) throw new Error(`Tavily ${tavilyRes.status}`)
    const data = await tavilyRes.json()
    tavilyAnswer = data.answer || ''
    searchResults = (data.results || []).slice(0, 6).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content || '',
    }))
  } catch (err) {
    return res.status(502).json({ error: `Search failed: ${err.message}` })
  }

  if (searchResults.length === 0) {
    return res.status(200).json({ summary: 'No recent results found.', sources: [], fetchedAt: new Date().toISOString() })
  }

  // ── Step 2: Build prompt ───────────────────────────────────────────────────
  const resultsText = searchResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`).join('\n\n')
  const answerContext = tavilyAnswer ? `Quick answer: ${tavilyAnswer}\n\n` : ''
  const prompt = `You are a personal intelligence briefing assistant for Venn. Write a concise status update for: "${topic}"
Rules: 2-4 sentences max. Direct, no fluff. No "based on search results" phrases. Most important recent development only.
${answerContext}Search results:\n${resultsText}\n\nStatus update:`

  // ── Step 3: Try Ollama if requested ───────────────────────────────────────
  if (aiMode === 'ollama') {
    try {
      const ollamaRes = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: ollamaModel, prompt, stream: false }),
        signal: AbortSignal.timeout(30000),
      })
      if (!ollamaRes.ok) {
        const errText = await ollamaRes.text()
        throw new Error(`Ollama ${ollamaRes.status}: ${errText}`)
      }
      const ollamaData = await ollamaRes.json()
      const summary = ollamaData.response?.trim() || 'No response from Ollama.'
      return res.status(200).json({
        summary,
        sources: searchResults.slice(0, 4),
        fetchedAt: new Date().toISOString(),
        usedProvider: `ollama:${ollamaModel}`,
      })
    } catch (err) {
      return res.status(502).json({ error: `Ollama failed: ${err.message}. Check if Ollama is running at ${ollamaUrl}` })
    }
  }

  // ── Step 4: OpenRouter (only if aiMode is openrouter) ──────────────────────
  if (!OPENROUTER_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not set.' })
  }

  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://venn-dashboard.netlify.app',
        'X-Title': 'Venn',
      },
      body: JSON.stringify({
        model: 'google/gemma-4-26b-a4b-it',
        max_tokens: 256,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!orRes.ok) {
      const errText = await orRes.text()
      throw new Error(`OpenRouter ${orRes.status}: ${errText}`)
    }
    const orData = await orRes.json()
    const summary = orData.choices?.[0]?.message?.content?.trim() || 'Could not generate summary.'
    return res.status(200).json({
      summary,
      sources: searchResults.slice(0, 4),
      fetchedAt: new Date().toISOString(),
      usedProvider: 'openrouter:gemma-3-27b',
    })
  } catch (err) {
    return res.status(502).json({ error: `AI failed: ${err.message}` })
  }
}
