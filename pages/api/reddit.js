// Reddit OAuth API Proxy
// Uses client_credentials grant (application-only, no user login)
// Token is cached in-memory for the 1h TTL

let cachedToken = null
let tokenExpiresAt = 0

async function getAccessToken() {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken
  }

  const CLIENT_ID = process.env.REDDIT_CLIENT_ID
  const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET not configured')
  }

  const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Venn-Dashboard/1.0',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Reddit token exchange failed (${res.status}): ${text}`)
  }

  const data = await res.json()

  if (data.error) {
    throw new Error(`Reddit auth error: ${data.error}`)
  }

  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + (data.expires_in * 1000)

  return cachedToken
}

async function redditGet(endpoint, token) {
  const res = await fetch(`https://oauth.reddit.com${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Venn-Dashboard/1.0',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Reddit API error (${res.status}): ${text}`)
  }

  return res.json()
}

export default async function handler(req, res) {
  const headers = {
    'Content-Type': 'application/json',
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { subreddit, type = 'subreddit', sort = 'hot', t = 'week', limit = 15, action = 'listing', query = '' } = req.body || {}

  if (!subreddit) {
    return res.status(400).json({ error: 'subreddit is required' })
  }

  // Sanitize name (remove r/ or u/ prefix if present)
  const isUser = type === 'user'
  const subName = subreddit.replace(/^r\//, '').replace(/^u\//, '').replace(/^user\//, '').trim().toLowerCase()
  const basePath = isUser ? `/user/${subName}` : `/r/${subName}`

  try {
    const token = await getAccessToken()

    // Helper to normalize posts
    const normalizePosts = (children) => (children || []).map(child => {
      const d = child.data

      let finalUrl = d.url;
      let pType = d.is_self ? 'text' : d.is_video ? 'video' : d.post_hint === 'image' ? 'image' : 'link';

      if (pType === 'link' && finalUrl) {
        if (finalUrl.match(/\.(jpeg|jpg|gif|png)$/i)) {
          pType = 'image';
        } else if (d.domain && (d.domain.includes('imgur.com') || d.domain.includes('reddituploads'))) {
          pType = 'image';
          if (d.preview?.images?.[0]?.source?.url) {
            finalUrl = d.preview.images[0].source.url.replace(/&amp;/g, '&');
          } else if (!finalUrl.includes('/a/') && !finalUrl.includes('/gallery/')) {
            const match = finalUrl.match(/imgur\.com\/([a-zA-Z0-9]+)$/);
            if (match) finalUrl = `https://i.imgur.com/${match[1]}.jpg`;
          }
        }
      }

      if (pType === 'image' && d.preview?.images?.[0]?.source?.url) {
        finalUrl = d.preview.images[0].source.url.replace(/&amp;/g, '&');
      }

      return {
        id: d.id,
        title: d.title,
        author: d.author,
        score: d.score,
        upvoteRatio: d.upvote_ratio,
        numComments: d.num_comments,
        createdUtc: d.created_utc,
        permalink: `https://reddit.com${d.permalink}`,
        url: finalUrl,
        domain: d.domain,
        selftext: d.selftext ? d.selftext.slice(0, 1500) : '',
        thumbnail: d.thumbnail && !['self', 'default', 'nsfw', 'spoiler', 'image', ''].includes(d.thumbnail) ? d.thumbnail : null,
        flair: d.link_flair_text || null,
        flairColor: d.link_flair_background_color || null,
        isNsfw: d.over_18 || false,
        isSpoiler: d.spoiler || false,
        isStickied: d.stickied || false,
        isCrosspost: !!(d.crosspost_parent),
        postType: pType,
        totalAwards: d.total_awards_received || 0,
      }
    })

    // ── Search Mode ──
    if (action === 'search' && query) {
      const searchUrl = isUser 
        ? `/search?q=${encodeURIComponent(`author:${subName} ${query}`)}&sort=relevance&limit=${limit}`
        : `/r/${subName}/search?q=${encodeURIComponent(query)}&restrict_sr=on&sort=relevance&limit=${limit}`
        
      const searchResults = await redditGet(searchUrl, token)
      return res.status(200).json({
        posts: normalizePosts(searchResults.data?.children),
        searchQuery: query,
        fetchedAt: new Date().toISOString(),
      })
    }

    // ── Listing Mode ──
    const sortParam = sort === 'top' ? `/${sort}?t=${t}&limit=${limit}` : `/${sort}?limit=${limit}`
    const listingEndpoint = isUser ? `${basePath}/submitted${sortParam}` : `${basePath}${sortParam}`
    
    const [listing, about] = await Promise.all([
      redditGet(listingEndpoint, token),
      redditGet(`${basePath}/about`, token),
    ])

    const posts = normalizePosts(listing.data?.children)

    // Extract metadata
    const subData = about.data || {}
    const meta = isUser ? {
      name: subData.name || subName,
      title: subData.subreddit?.title || '',
      description: subData.subreddit?.public_description || '',
      subscribers: subData.subreddit?.subscribers || subData.link_karma + subData.comment_karma || 0,
      activeUsers: subData.link_karma || 0,
      icon: subData.icon_img?.split('?')[0] || subData.snoovatar_img || null,
      bannerColor: subData.subreddit?.key_color || null,
      isNsfw: subData.subreddit?.over_18 || false,
      createdUtc: subData.created_utc || 0,
    } : {
      name: subData.display_name || subName,
      title: subData.title || '',
      description: subData.public_description || '',
      subscribers: subData.subscribers || 0,
      activeUsers: subData.accounts_active || subData.active_user_count || 0,
      icon: subData.icon_img || subData.community_icon?.split('?')[0] || null,
      bannerColor: subData.primary_color || subData.key_color || null,
      isNsfw: subData.over18 || false,
      createdUtc: subData.created_utc || 0,
    }

    return res.status(200).json({
      posts,
      meta,
      sort,
      t: sort === 'top' ? t : null,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Reddit API error:', err.message)
    return res.status(502).json({ error: err.message })
  }
}
