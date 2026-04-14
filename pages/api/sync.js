import { getStore } from '@netlify/blobs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    // Get the site-bound Netlify Blobs store 
    const store = getStore('venn_sync_store')
    const key = 'user_data'

    if (req.method === 'GET') {
      const data = await store.get(key, { type: 'json' })
      if (!data) return res.status(200).json({ exists: false })
      return res.status(200).json({ exists: true, data })
    }

    if (req.method === 'POST') {
      const { settings, topics, packages } = req.body
      const payload = {
        settings,
        topics,
        packages,
        updatedAt: Date.now()
      }
      await store.setJSON(key, payload)
      return res.status(200).json({ success: true, timestamp: payload.updatedAt })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Blob sync error:', error)
    res.status(500).json({ error: error.message })
  }
}
