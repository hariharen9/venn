export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { topic, query, topicType = 'auto', aiMode = 'openrouter', ollamaModel = 'gemma3', ollamaUrl = 'http://localhost:11434' } = req.body

  if (!topic) {
    return res.status(400).json({ error: 'topic is required' })
  }

  const TAVILY_KEY = process.env.TAVILY_API_KEY
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY

  if (!TAVILY_KEY) {
    return res.status(500).json({ error: 'Missing TAVILY_API_KEY in .env.local' })
  }

  // ── Step 1: Tavily Search ──────────────────────────────────────────────────
  const searchQuery = query || topic
  const isIndianCinema = topicType === 'cinema' || /tamil|bollywood|kollywood|hindi|movie|film/i.test(topic)
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
        max_results: 10,
        include_answer: true,
        include_raw_content: true,
        topic: isIndianCinema ? 'general' : 'news',
      }),
    })

    if (!tavilyRes.ok) {
      throw new Error(`Tavily ${tavilyRes.status}`)
    }

    const data = await tavilyRes.json()
    tavilyAnswer = data.answer || ''
    searchResults = (data.results || []).slice(0, 8).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content || '',
    }))
  } catch (err) {
    return res.status(502).json({ error: `Search failed: ${err.message}` })
  }

  if (searchResults.length === 0) {
    return res.status(200).json({
      type: 'error',
      error: 'No results found',
      sources: [],
      fetchedAt: new Date().toISOString(),
    })
  }

  // ── Step 2: Build Classification + Extraction Prompt ───────────────────────
  const resultsText = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`)
    .join('\n\n')

  const typeHint = topicType !== 'auto' ? `User specified type: ${topicType}. Use this type.` : ''

  const prompt = `You are Venn, an intelligent data extraction engine. Your task is to analyze search results and extract structured data.

${typeHint}

IMPORTANT CONTEXT: This is for an Indian user. Always:
- Use INR (₹) currency, NOT USD ($)
- Use lakhs (1 lakh = 100,000) and crores (1 crore = 10,000,000) instead of millions
- For Indian cinema (Tamil, Hindi, Kollywood, Bollywood), prioritize Indian sources and actors/directors
- Convert any dollar amounts to INR using approximate rate: 1 USD ≈ 83 INR

Analyze the topic: "${topic}"

${tavilyAnswer ? `Quick answer from search: ${tavilyAnswer}\n` : ''}
Search results:
${resultsText}

CLASSIFICATION RULES:
- "cinema" → Movies, TV shows, streaming series, actors, directors
- "briefing" → Everything else (news, events, topics, general information)

OUTPUT SCHEMA (JSON only, no other text):
{
  "type": "cinema" | "briefing",
  "confidence": 0.0-1.0,
  "data": {
    // For "cinema" type:
    "title": "string - primary title",
    "stats": {
      "ww_gross": "string - worldwide box office if available",
      "budget": "string - production budget if available",
      "rating": "string - IMDb/rotten tomatoes rating",
      "release_date": "string - release date YYYY-MM-DD",
      "runtime": "string - runtime in minutes",
      "director": "string - director name",
      "genre": "string - primary genre"
    },
    "highlights": ["array of 2-3 key highlights"],
    "milestones": ["array of achievements/milestones"],
    "cast": ["array of main cast names"],
    "news": [{"text": "string", "sentiment": "positive|neutral|negative"}],
    
    // For "briefing" type:
    "title": "string - topic title",
    "summary": "string - 2-3 sentence summary",
    "key_points": ["array of 3-5 bullet points"],
    "sentiment": "positive|neutral|negative|mixed",
    "sources": [{"title": "string", "url": "string", "snippet": "string"}]
  }
}

Respond ONLY with valid JSON. No markdown, no explanation.`

  // ── Step 3: AI Extraction ─────────────────────────────────────────────────
  let extractedData = null
  let parseError = null

  const sendResponse = (responseData, provider) => {
    return res.status(200).json({
      type: responseData.type || 'briefing',
      confidence: responseData.confidence || 0.5,
      data: responseData.data || responseData,
      sources: searchResults.slice(0, 4),
      fetchedAt: new Date().toISOString(),
      usedProvider: provider,
      parseError: parseError,
    })
  }

  // Always try Ollama first, then fall back to OpenRouter
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
          parseError = `JSON parse failed: ${e.message}. Raw: ${rawResponse.slice(0, 200)}`
          const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            try {
              extractedData = JSON.parse(jsonMatch[0])
              parseError = null
            } catch {}
          }
        }

        if (extractedData) {
          return sendResponse(extractedData, `ollama:${ollamaModel}`)
        }
      }
    } catch (ollamaErr) {
      console.warn('Ollama failed, falling back to OpenRouter:', ollamaErr.message)
    }
  }

  // OpenRouter fallback
  if (!OPENROUTER_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not set and Ollama unavailable.' })
  }

  // OpenRouter
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
        max_tokens: 1024,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!orRes.ok) {
      const errText = await orRes.text()
      throw new Error(`OpenRouter ${orRes.status}: ${errText}`)
    }

    const orData = await orRes.json()
    const rawResponse = orData.choices?.[0]?.message?.content?.trim() || ''

    try {
      extractedData = JSON.parse(rawResponse)
    } catch (e) {
      parseError = `JSON parse failed: ${e.message}. Raw: ${rawResponse.slice(0, 200)}`
      // Try to extract JSON from response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0])
          parseError = null
        } catch {}
      }
    }

    if (!extractedData) {
      return res.status(200).json({
        type: 'briefing',
        confidence: 0.1,
        data: {
          title: topic,
          summary: 'Failed to parse AI response. Check settings for debug mode.',
          key_points: [parseError || 'Unknown parse error'],
        },
        sources: searchResults.slice(0, 4),
        fetchedAt: new Date().toISOString(),
        usedProvider: 'openrouter:gemma-4',
        parseError: parseError,
      })
    }

    return sendResponse(extractedData, 'openrouter:gemma-4')
  } catch (err) {
    return res.status(502).json({ error: `AI failed: ${err.message}` })
  }
}