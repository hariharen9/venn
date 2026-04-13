# ⚡ VENN — Personal Intel Dashboard

```
VENN
```

> **Self-hosted AI intelligence dashboard.** Track anything. Own your data.

---

## Features

- **AI-Powered Tracking** — Add any topic, get AI-summarized intel
- **Search + Summarize** — Tavily Search + OpenRouter (or Ollama)
- **PIN-Locked** — Application-wide authentication (configurable via `APP_PIN`)
- **Offline-First** — localStorage persistence, works without internet
- **Mobile-First** — Fully responsive design
- **Serverless** — Deploys to Netlify in seconds

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Netlify Functions (serverless) |
| Search | Tavily Search API |
| AI | OpenRouter (Gemma 3 27B) or local Ollama |
| Auth | Custom PIN via middleware + cookies |
| Storage | localStorage (no DB required) |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/venn.git
cd venn
npm install
```

### 2. Get API Keys

**Tavily Search** (1000 free credits/month):
- https://tavily.com → Sign up → Dashboard → Copy API Key

**OpenRouter** (free models available):
- https://openrouter.ai → Sign up → Settings → API Keys

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
TAVILY_API_KEY=tvly-xxxxxxxxxxxx
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
APP_PIN=your_secure_pin_here
```

### 4. Run Locally

```bash
npx netlify dev
# Open http://localhost:8888
```

---

## Authentication

Venn is secured with a PIN-protected authentication layer:

- **APP_PIN** env variable sets your access code
- Sessions last **1 day** (per device/browser)
- Middleware intercepts all routes → redirects to `/login` if unauthorized
- Logout clears session → returns to lock screen

**Security Note**: Use a strong PIN (6+ digits) in production.

---

## Deploy

### Netlify (Recommended)

```bash
# CLI
npm install -g netlify-cli
netlify login
netlify init

# Set environment variables
netlify env:set TAVILY_API_KEY your_key
netlify env:set OPENROUTER_API_KEY your_key
netlify env:set APP_PIN your_pin

# Deploy
netlify deploy --prod
```

### Or via Dashboard

1. Push to GitHub
2. https://app.netlify.com → New site from Git
3. Build: `npm run build` | Publish: `.next`
4. Add env vars in Site Settings → Environment Variables
5. Install `@netlify/plugin-nextjs` plugin

---

## Usage

- **+ ADD** — Add a topic to track (e.g., "NVIDIA earnings", "SpaceX launches")
- **Custom Query** — Optionally override the search query for better results
- **sync** — Manual refresh (cached for 4 hours)
- **Settings** — Toggle between OpenRouter (cloud) or Ollama (local)
- **× EXIT** — Lock dashboard and return to login

---

## Rate Limits (Free Tier)

| Service | Limit | Notes |
|---------|-------|-------|
| Tavily Search | 1,000 credits/mo | 1 search = 1 credit |
| OpenRouter | Rate limited | Best during off-peak |
| Netlify Functions | 125,000/mo | More than enough |

With 10 topics: ~100 full refreshes/month. Tweak `CACHE_TTL_MS` in `lib/useTopics.js` to extend.

---

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `TAVILY_API_KEY` | Tavily search API key | Yes |
| `OPENROUTER_API_KEY` | OpenRouter API key | Yes |
| `APP_PIN` | Dashboard access PIN | Yes |

---

## License

MIT — Use your own keys, host your own instance.