// AI-powered Reddit Subreddit Summarization
// Uses the same multi-provider pipeline (Ollama + OpenRouter) as refresh.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    subredditName,
    posts,
    aiMode = 'auto',
    ollamaModel = 'gemma-4-26b-it',
    ollamaUrl = 'http://localhost:11434',
    openrouterModel = 'google/gemma-4-26b-a4b-it'
  } = req.body || {}

  if (!subredditName || !posts || !posts.length) {
    return res.status(400).json({ error: 'subredditName and posts are required' })
  }

  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY

  // Build a compact post digest for the AI
  const postDigest = posts.slice(0, 20).map((p, i) =>
    `${i + 1}. [${p.score}↑ ${p.numComments}💬] "${p.title}" by u/${p.author}${p.flair ? ` [${p.flair}]` : ''}${p.selftext ? ` — ${p.selftext.slice(0, 150)}` : ''}`
  ).join('\n')

  const prompt = `You are a concise intelligence analyst. You are analyzing the current state of the subreddit r/${subredditName}. 
Here are the top posts right now:

${postDigest}

Generate a concise intelligence briefing about what's happening on r/${subredditName} right now. Include:

1. **headline**: A single catchy headline summarizing the main theme/mood (max 10 words)
2. **summary**: 2-3 sentences capturing the overall state of the community
3. **themes**: Array of 3-5 key themes or topics being discussed
4. **sentiment**: Overall community mood — "positive", "negative", "neutral", or "mixed"
5. **notable**: 1-2 particularly notable or standout posts worth attention

Respond ONLY with valid JSON in this exact format:
{
  "headline": "string",
  "summary": "string",
  "themes": ["string"],
  "sentiment": "positive|negative|neutral|mixed",
  "notable": ["string"]
}`

  let extractedData = null
  let parseError = null

  // ── Step 1: Try Ollama ──────────────────────────────────────────────────
  if (aiMode === 'ollama' || aiMode === 'auto') {
    try {
      const ollamaRes = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt,
          stream: false,
          format: 'json',
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (ollamaRes.ok) {
        const ollamaData = await ollamaRes.json()
        const rawResponse = ollamaData.response?.trim() || ''

        try {
          extractedData = JSON.parse(rawResponse)
        } catch (e) {
          const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            try { extractedData = JSON.parse(jsonMatch[0]) } catch {}
          }
        }

        if (extractedData) {
          return res.status(200).json(extractedData)
        }
      }
    } catch (ollamaErr) {
      console.warn('Ollama failed for Reddit summary, falling back:', ollamaErr.message)
    }
  }

  // ── Step 2: OpenRouter Fallback ──────────────────────────────────────────
  if (!OPENROUTER_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not set and Ollama unavailable.' })
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
        model: openrouterModel,
        messages: [
          // Combine system instructions into user message to avoid provider compatibility issues
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!orRes.ok) {
      const errText = await orRes.text()
      throw new Error(`OpenRouter error (${orRes.status}): ${errText}`)
    }

    const orData = await orRes.json()
    const rawContent = orData.choices?.[0]?.message?.content?.trim() || ''

    // Extract JSON from response (handle markdown wrapper)
    let parsed = null
    try {
      parsed = JSON.parse(rawContent)
    } catch {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]) } catch {}
      }
    }

    if (!parsed) {
      return res.status(200).json({
        headline: `r/${subredditName} — Summary`,
        summary: rawContent.slice(0, 500),
        themes: [],
        sentiment: 'neutral',
        notable: [],
        raw: true,
      })
    }

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Reddit summarize error:', err.message)
    return res.status(502).json({ error: err.message })
  }
}
