export default async function handler(req, res) {
  const NASA_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';

  try {
    // 1. Fetch APOD (NASA)
    const apodRes = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`);
    const apodData = await apodRes.json();

    // 2. Fetch ISS Location (WhereTheISS.at - better and more reliable than open-notify)
    const issRes = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    const issData = await issRes.json();

    // 3. Consolidated Payload
    const payload = {
      apod: {
        title: apodData.title,
        url: apodData.url,
        hdurl: apodData.hdurl,
        media_type: apodData.media_type,
        explanation: apodData.explanation
      },
      iss: {
        latitude: issData.latitude,
        longitude: issData.longitude,
        altitude: issData.altitude,
        velocity: issData.velocity,
        visibility: issData.visibility,
        timestamp: issData.timestamp
      },
      fetchedAt: new Date().toISOString()
    };

    // Cache for 15 minutes (ISS moves fast, but APOD is daily)
    // We'll let the frontend handle the high-frequency ISS polling if needed, 
    // but the proxy helps with CORS and Key protection.
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate');
    return res.status(200).json(payload);
  } catch (err) {
    console.error('Space Pulse Error:', err);
    return res.status(500).json({ error: 'Failed to fetch space telemetry' });
  }
}
