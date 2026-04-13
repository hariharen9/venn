export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { pin } = req.body
  
  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' })
  }

  const APP_PIN = process.env.APP_PIN
  
  if (!APP_PIN) {
    return res.status(500).json({ error: 'APP_PIN not configured' })
  }

  if (pin !== APP_PIN) {
    return res.status(401).json({ success: false, error: 'Invalid PIN' })
  }

  const cookieValue = Buffer.from(APP_PIN).toString('base64')
  
  const oneDaySeconds = 24 * 60 * 60
  
  res.setHeader('Set-Cookie', `venn_auth=${cookieValue}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${oneDaySeconds}`)

  return res.status(200).json({ success: true, expiresIn: oneDaySeconds })
}