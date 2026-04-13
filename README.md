# Venn — Personal Intel Dashboard

A personal AI-powered dashboard that tracks anything you care about.
Add topics, and it fetches the latest info via Tavily Search + summarizes with Gemma via OpenRouter.

## Stack
- **Frontend**: Next.js + Tailwind CSS
- **Backend**: Netlify Functions (serverless)
- **Search**: Tavily Search API (free — 1000 credits/month)
- **AI**: OpenRouter → Gemma 3 27B (free tier)
- **Persistence**: localStorage (topics + cached results, 1h TTL)

---

## Setup (Local)

### 1. Install dependencies
```bash
npm install
```

### 2. Get your free API keys

**Tavily Search API** (free, no credit card):
1. Go to https://tavily.com/
2. Sign up → copy your API key from the dashboard
3. Free tier: 1000 credits/month (1 search = 1 credit)

**OpenRouter** (free models available):
1. Go to https://openrouter.ai/
2. Sign up → Settings → API Keys → create key
3. Free model used: `google/gemma-4-26b-a4b-it`

### 3. Create `.env.local`
```bash
cp .env.example .env.local
# Edit .env.local and fill in your two keys
```

### 4. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Netlify

### Option A: Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set TAVILY_API_KEY your_key_here
netlify env:set OPENROUTER_API_KEY your_key_here
netlify deploy --prod
```

### Option B: Netlify Dashboard
1. Push this repo to GitHub
2. Go to https://app.netlify.com → New site from Git
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add env vars in Site Settings → Environment Variables:
   - `TAVILY_API_KEY`
   - `OPENROUTER_API_KEY`
6. Install the **@netlify/plugin-nextjs** plugin (Plugins tab)
7. Deploy!

---

## Usage

- Click **+ ADD** to add a topic (e.g. "Dune 3", "SpaceX launches", "r/wallstreetbets")
- Optionally set a custom search query for more precise results
- Topics auto-refresh on load if cache is older than 1 hour
- Hit **⟳** on any card to manually refresh a single topic
- Hit **refresh all** to update everything at once
- Results persist in localStorage — dashboard works offline with last known data

---

## Rate limits (free tier)

| Service | Free limit | Notes |
|---|---|---|
| Tavily Search | 1,000 credits/month | 1 credit per search |
| OpenRouter Gemma 3 27B | Free (rate limited) | Slowest during peak hours |
| Netlify Functions | 125,000 invocations/month | Way more than enough |

With 10 topics, you get ~100 full dashboard refreshes per month on free Tavily.
Cache is 1 hour by default — tweak `CACHE_TTL_MS` in `lib/useTopics.js` to stretch credits further.
