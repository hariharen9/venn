export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { platform, identifier } = req.body

  if (!platform || !identifier) {
    return res.status(400).json({ error: 'platform and identifier are required' })
  }

  try {
    switch (platform) {
      case 'pypi':
        return res.status(200).json(await fetchPyPI(identifier))
      case 'npm':
        return res.status(200).json(await fetchNPM(identifier))
      case 'vscode':
        return res.status(200).json(await fetchVSCode(identifier))
      default:
        return res.status(400).json({ error: `Unsupported platform: ${platform}` })
    }
  } catch (err) {
    return res.status(502).json({ error: `Failed to fetch stats: ${err.message}` })
  }
}

// ── PyPI ──────────────────────────────────────────────────────────────────────
async function fetchPyPI(identifier) {
  // Fetch download stats, package metadata, and pepy.tech total downloads in parallel
  const [statsRes, metaRes, pepyRes] = await Promise.all([
    fetch(`https://pypistats.org/api/packages/${encodeURIComponent(identifier)}/recent`).catch((e) => ({ ok: false, status: 500, error: e })),
    fetch(`https://pypi.org/pypi/${encodeURIComponent(identifier)}/json`).catch((e) => ({ ok: false, status: 500, error: e })),
    fetch(`https://static.pepy.tech/badge/${encodeURIComponent(identifier)}`).catch(() => ({ ok: false }))
  ])

  // Trust the official PyPI registry to determine if the package exists or not
  if (metaRes.status === 404) {
    throw new Error(`Package "${identifier}" not found on PyPI.`)
  }

  let statsData = { data: {} }
  if (statsRes.ok) {
    try {
      statsData = await statsRes.json()
    } catch {}
  } else if (statsRes.status === 429) {
    console.warn(`[PyPI] pypistats.org rate limited for ${identifier}`)
  }

  // Extract metadata
  let version = null, description = null, author = null, license = null
  let requiresPython = null, homePage = null, releaseCount = null

  if (metaRes.ok) {
    try {
      const meta = await metaRes.json()
      const info = meta.info || {}
      version = info.version || null
      description = info.summary || null
      author = info.author_email
        ? info.author_email.replace(/<[^>]+>/g, '').trim()
        : info.author || null
      license = info.license || null
      requiresPython = info.requires_python || null
      homePage = info.home_page || info.project_url || null

      // Count total releases
      if (meta.releases) {
        releaseCount = Object.keys(meta.releases).length
      }
    } catch {}
  }

  // Parse pepy.tech total downloads from SVG
  let totalDownloads = null
  if (pepyRes.ok) {
    try {
      const svgStr = await pepyRes.text()
      const matches = [...svgStr.matchAll(/<text[^>]*>([^<]+)<\/text>/g)]
      if (matches.length > 0) {
        const valStr = matches[matches.length - 1][1]
        const numMatch = valStr.match(/^([\d.]+)([kMGT]?)$/i)
        if (numMatch) {
          const num = parseFloat(numMatch[1])
          const suffix = numMatch[2].toUpperCase()
          if (suffix === 'K') totalDownloads = num * 1000
          else if (suffix === 'M') totalDownloads = num * 1000000
          else if (suffix === 'G') totalDownloads = num * 1000000000
          else if (suffix === 'T') totalDownloads = num * 1000000000000
          else totalDownloads = num
        }
      }
    } catch {}
  }

  return {
    downloads: {
      daily: statsData?.data?.last_day || null,
      weekly: statsData?.data?.last_week || null,
      monthly: statsData?.data?.last_month || null,
      yearly: null, // PyPI API only provides 180 days natively
      total: totalDownloads,
    },
    version,
    description,
    author,
    license,
    requiresPython,
    homePage,
    releaseCount,
  }
}

// ── npm ───────────────────────────────────────────────────────────────────────
async function fetchNPM(identifier) {
  // npm API needs only the / encoded for scoped packages (@scope/name → @scope%2Fname)
  const encodedId = identifier.replace(/\//g, '%2F')

  // Calculate date range for yearly downloads
  const today = new Date().toISOString().split('T')[0]
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [dayRes, weekRes, monthRes, yearRes, infoRes] = await Promise.all([
    fetch(`https://api.npmjs.org/downloads/point/last-day/${encodedId}`),
    fetch(`https://api.npmjs.org/downloads/point/last-week/${encodedId}`),
    fetch(`https://api.npmjs.org/downloads/point/last-month/${encodedId}`),
    fetch(`https://api.npmjs.org/downloads/point/${oneYearAgo}:${today}/${encodedId}`),
    fetch(`https://registry.npmjs.org/${identifier}/latest`),
  ])

  if (!monthRes.ok) throw new Error(`npm returned ${monthRes.status}: package "${identifier}" not found`)

  const [dayData, weekData, monthData] = await Promise.all([
    dayRes.json(), weekRes.json(), monthRes.json(),
  ])

  const yearData = yearRes.ok ? await yearRes.json() : { downloads: null }

  // Extract package metadata
  let version = null, description = null, license = null, homePage = null
  if (infoRes.ok) {
    try {
      const info = await infoRes.json()
      version = info.version || null
      description = info.description || null
      license = typeof info.license === 'string' ? info.license : info.license?.type || null
      homePage = info.homepage || null
    } catch {}
  }

  return {
    downloads: {
      daily: dayData.downloads || 0,
      weekly: weekData.downloads || 0,
      monthly: monthData.downloads || 0,
      yearly: yearData.downloads || null,
      total: null,
    },
    version,
    description,
    license,
    homePage,
  }
}

// ── VS Code Marketplace ──────────────────────────────────────────────────────
async function fetchVSCode(identifier) {
  const res = await fetch('https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json; charset=utf-8; api-version=3.0-preview.1',
    },
    body: JSON.stringify({
      filters: [{
        criteria: [{ filterType: 7, value: identifier }],
        pageSize: 1,
      }],
      assetTypes: [],
      flags: 914, // IncludeStatistics + other metadata
    }),
  })

  if (!res.ok) throw new Error(`VS Code Marketplace returned ${res.status}`)

  const data = await res.json()
  const ext = data.results?.[0]?.extensions?.[0]
  if (!ext) throw new Error(`Extension not found: "${identifier}"`)

  const stats = ext.statistics || []
  const getStat = (name) => {
    const stat = stats.find((s) => s.statisticName === name)
    return stat ? stat.value : 0
  }

  const rating = getStat('averagerating')

  return {
    downloads: {
      daily: null,
      weekly: null,
      monthly: null,
      yearly: null,
      total: Math.round(getStat('install')),
    },
    totalDownloads: Math.round(getStat('downloadCount')) || null,
    updateCount: Math.round(getStat('updateCount')) || null,
    version: ext.versions?.[0]?.version || null,
    description: ext.shortDescription || null,
    rating: rating ? rating.toFixed(1) : null,
    ratingCount: Math.round(getStat('ratingcount')) || null,
    publisher: ext.publisher?.displayName || null,
    lastUpdated: ext.versions?.[0]?.lastUpdated || null,
  }
}
