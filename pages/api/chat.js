export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { topic, message, history = [], aiMode = 'openrouter', ollamaModel = 'gemma3', ollamaUrl = 'http://localhost:11434' } = req.body

  if (!topic || !message) {
    return res.status(400).json({ error: 'topic and message are required' })
  }

  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY

  // Build conversation context
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

      return res.status(200).json({
        role: 'assistant',
        content: response,
        provider: 'ollama',
      })
    } catch (ollamaErr) {
      console.warn('Ollama failed, falling back to OpenRouter:', ollamaErr.message)
      // Fall through to OpenRouter
    }
  }

  // OpenRouter (or fallback)

  // OpenRouter
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
        max_tokens: 512,
        temperature: 0.4,
        messages: [
          { role: 'system', content: `${systemPrompt}\n\nThe user is asking about: ${topic}` },
          ...conversation.map(h => ({ role: h.role, content: h.content }))
        ],
      }),
    })

    console.log('Chat API called:', { topic, message, aiMode, historyLength: history?.length })
    
    if (!orRes.ok) {
      const errText = await orRes.text()
      console.log('Chat API error:', errText)
      throw new Error(`OpenRouter ${orRes.status}: ${errText}`)
    }

    const data = await orRes.json()
    console.log('Chat API data:', JSON.stringify(data))
    
    const response = data.choices?.[0]?.message?.content?.trim() || 'No response from AI.'

    return res.status(200).json({
      role: 'assistant',
      content: response,
      model: 'gemma-4-26b-a4b-it',
    })
  } catch (err) {
    return res.status(502).json({ error: `AI failed: ${err.message}` })
  }
}