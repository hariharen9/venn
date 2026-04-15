import Parser from 'rss-parser'

const parser = new Parser({
  customFields: {
    item: ['media:content', 'enclosure', 'content:encoded'],
  }
})

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: 'Feed URL is required' })
  }

  try {
    // Basic URL validation
    const targetUrl = new URL(url)
    
    // We add a tiny timeout so hanging endpoints don't eat all serverless compute
    const controller = new AbortController()
    const timeout = setTimeout(() => { controller.abort() }, 10000)
    
    // Note: We use raw fetch here and pass text to rss-parser because parser.parseURL
    // sometimes behaves weirdly with serverless environments.
    const fetchRes = await fetch(targetUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Venn-Dashboard/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    })
    
    clearTimeout(timeout)
    
    if (!fetchRes.ok) {
      throw new Error(`Failed to fetch feed: HTTP ${fetchRes.status}`)
    }
    
    const feedText = await fetchRes.text()
    const feed = await parser.parseString(feedText)

    // Map items to a normalized schema
    const items = (feed.items || []).slice(0, 10).map(item => {
      // Find a suitable snippet (favouring standard description, then trying others)
      let rawSnippet = item.contentSnippet || item.summary || item.description || ''
      // Basic HTML stripping if contentSnippet failed to fully strip it
      let snippet = rawSnippet.replace(/<[^>]*>?/gm, '').trim()
      
      // Truncate to reasonable length
      if (snippet.length > 200) {
        snippet = snippet.substring(0, 200) + '...'
      }

      return {
        id: item.guid || item.id || item.link,
        title: item.title || 'Untitled',
        link: item.link,
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        snippet: snippet || null,
        author: item.creator || item.author || null
      }
    })

    return res.status(200).json({
      title: feed.title || 'Unknown Feed',
      description: feed.description || '',
      link: feed.link || url,
      items
    })
    
  } catch (err) {
    console.error('RSS parse error:', err.message)
    return res.status(502).json({ error: `Failed to process RSS feed: ${err.message}` })
  }
}
