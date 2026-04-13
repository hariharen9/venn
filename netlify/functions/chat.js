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

  const { topic, message, history = [], aiMode = 'openrouter', ollamaModel = 'gemma3', ollamaUrl = 'http://localhost:11434' } = body

  if (!topic || !message) return { statusCode: 400, headers, body: JSON.stringify({ error: 'topic and message are required' }) }

  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY

  const conversation = [
    ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
    { role: 'user', content: message }
  ]

  const systemPrompt = `You are Venn, a helpful AI assistant. Answer the user's question based on your knowledge. Be concise and helpful.`

  if (aiMode === 'ollama') {
    try {
      const ollamaRes = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [{ role: 'system', content: systemPrompt }, ...conversation],
          stream: false,
        }),
        signal: AbortSignal.timeout(30000),
      })
      if (!ollamaRes.ok) {
        const errText = await ollamaRes.text()
        throw new Error(`Ollama ${ollamaRes.status}: ${errText}`)
      }
      const data = await ollamaRes.json()
      const response = data.message?.content || 'No response from AI.'
      return { statusCode: 200, headers, body: JSON.stringify({ role: 'assistant', content: response, provider: 'ollama' }) }
    } catch (ollamaErr) {
      console.warn('Ollama failed, falling back to OpenRouter')
    }
  }

  if (!OPENROUTER_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'OPENROUTER_API_KEY not set.' }) }
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
        max_tokens: 512,
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversation.map(h => ({ role: h.role, content: h.content }))
        ],
      }),
    })
    if (!orRes.ok) {
      const errText = await orRes.text()
      throw new Error(`OpenRouter ${orRes.status}: ${errText}`)
    }
    const data = await orRes.json()
    const response = data.choices?.[0]?.message?.content?.trim() || 'No response from AI.'
    return { statusCode: 200, headers, body: JSON.stringify({ role: 'assistant', content: response }) }
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: `AI failed: ${err.message}` }) }
  }
}