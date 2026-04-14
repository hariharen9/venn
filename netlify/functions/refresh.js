exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  let body
  try { body = JSON.parse(event.body) }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) } }

  const { topic, query, topicType = 'auto', aiMode = 'openrouter', ollamaModel = 'gemma3', ollamaUrl = 'http://localhost:11434' } = body

  if (!topic) return { statusCode: 400, headers, body: JSON.stringify({ error: 'topic is required' }) }

  const TAVILY_KEY = process.env.TAVILY_API_KEY
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
  if (!TAVILY_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing TAVILY_API_KEY' }) }

  // ── Step 1: Tavily ─────────────────────────────────────────────────────────
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
        max_results: 8,
        include_answer: true,
        include_raw_content: false,
        topic: 'news',
      }),
    })
    if (!tavilyRes.ok) throw new Error(`Tavily ${tavilyRes.status}`)
    const data = await tavilyRes.json()
    tavilyAnswer = data.answer || ''
    searchResults = (data.results || []).slice(0, 8).map((r) => ({
      title: r.title, url: r.url, snippet: r.content || '',
    }))
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: `Search failed: ${err.message}` }) }
  }

  if (searchResults.length === 0) {
    return { statusCode: 200, headers, body: JSON.stringify({ type: 'error', error: 'No results found', sources: [], fetchedAt: new Date().toISOString() }) }
  }

  // ── Step 2: Build Classification + Extraction Prompt ───────────────────────
  const resultsText = searchResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`).join('\n\n')

  const typeHint = topicType !== 'auto' ? `User specified type: ${topicType}. Use this type.` : ''

  const prompt = `You are Venn, an intelligent data extraction engine. Your task is to analyze search results and extract structured data.

${typeHint}

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

  let extractedData = null
  let parseError = null

  const sendResponse = (responseData, provider) => ({
    statusCode: 200,
    headers,
    body: JSON.stringify({
      type: responseData.type || 'briefing',
      confidence: responseData.confidence || 0.5,
      data: responseData.data || responseData,
      sources: searchResults.slice(0, 4),
      fetchedAt: new Date().toISOString(),
      usedProvider: provider,
      parseError: parseError,
    }),
  })

  // Always try Ollama first, then fall back to OpenRouter
  if (aiMode === 'ollama' || aiMode === 'auto') {
    try {
      const ollamaRes = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: ollamaModel, prompt, stream: false, format: 'json' }),
        signal: AbortSignal.timeout(30000),
      })

      if (ollamaRes.ok) {
        const ollamaData = await ollamaRes.json()
        const rawResponse = ollamaData.response?.trim() || ''
        try {
          extractedData = JSON.parse(rawResponse)
        } catch (e) {
          parseError = `JSON parse failed: ${e.message}`
          const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            try { extractedData = JSON.parse(jsonMatch[0]); parseError = null } catch {}
          }
        }

        if (extractedData) {
          return sendResponse(extractedData, `ollama:${ollamaModel}`)
        }
      }
    } catch (ollamaErr) {
      console.warn('Ollama failed, falling back to OpenRouter')
    }
  }

  // OpenRouter fallback
  if (!OPENROUTER_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'No AI available. Ollama offline and OpenRouter not configured.' }) }
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
      parseError = `JSON parse failed: ${e.message}`
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try { extractedData = JSON.parse(jsonMatch[0]); parseError = null } catch {}
      }
    }

    if (!extractedData) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          type: 'briefing',
          confidence: 0.1,
          data: { title: topic, summary: 'Failed to parse AI response.', key_points: [parseError || 'Unknown parse error'] },
          sources: searchResults.slice(0, 4),
          fetchedAt: new Date().toISOString(),
          usedProvider: 'openrouter:gemma-4',
          parseError,
        }),
      }
    }

    return sendResponse(extractedData, 'openrouter:gemma-4')
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: `AI failed: ${err.message}` }) }
  }
}