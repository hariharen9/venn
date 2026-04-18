# ⚡ VENN — Personal Intelligence Dashboard

<div align="center">
  <img src="public/apple-touch-icon.png" width="128" height="128" alt="Venn Logo" />
  <p><strong>A hyper-fast, private, and AI-powered intelligence feed for your digital life.</strong></p>
  <p>Created by <a href="https://github.com/hariharen9">hariharen9</a></p>
</div>

---

> **Track anything. Summary everything. Own your data.** Venn is a self-hosted command center designed to transform scattered information into actionable intelligence.

## 🚀 Key Features

- **Multi-Source Tracking** — Add topics (movies, news, people), packages (PyPI, npm), RSS feeds, subreddits, and Reddit users
- **AI-Powered Intelligence** — Automatic summarization using LLMs with Indian context (INR, lakhs/crores)
- **Dual AI Providers** — Auto-detects and uses Ollama when available, falls back to OpenRouter
- **Reddit Users Support** — Track both subreddits and individual Reddit users (u/username)
- **Native PWA Feel** — Mobile-optimized with bottom-sheet modals, safe-area support, and fixed navigation
- **Local-First / Private** — Support for local LLMs via **Ollama** for complete privacy
- **Universal Search** — Instant semantic global search (Omnibar) across all tracked entities
- **Aesthetic First** — Terminal-inspired, high-breathability dark interface with accent colors
- **PIN-Locked** — Lightweight security to keep your dashboard eyes-only
- **Package Monitoring** — Track npm/PyPI packages with version alerts
- **RSS Feeds** — Full RSS/Atom feed aggregator
- **Cache System** — Smart caching to reduce API calls

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) (App + Pages) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + Vanilla CSS |
| **AI Processing** | [OpenRouter](https://openrouter.ai/) (Gemma 4) or local [Ollama](https://ollama.com/) |
| **Search Engine** | [Tavily AI](https://tavily.com/) |
| **Persistence** | [Netlify Blobs](https://www.netlify.com/products/blobs/) (Global Sync) + LocalStorage |
| **Auth** | Custom PIN-based Middleware |
| **Reddit API** | Reddit Official API with OAuth |

---

## 🚦 Getting Started (Self-Host)

Venn is designed to be self-hosted. You run it, you own the keys.

### 1. Installation

```bash
git clone https://github.com/hariharen9/venn.git
cd venn
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and provide your keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys:

| Variable | Description | Required |
|---|---|---|
| `TAVILY_API_KEY` | [Tavily](https://tavily.com/) Search API Key | Yes |
| `OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai/) API Key | Yes (if Ollama not used) |
| `APP_PIN` | Your chosen 6+ digit access code | Yes |
| `REDDIT_CLIENT_ID` | Reddit App Client ID | For Reddit |
| `REDDIT_CLIENT_SECRET` | Reddit App Secret | For Reddit |
| `REDDIT_USERNAME` | Reddit username | For Reddit |
| `REDDIT_PASSWORD` | Reddit password | For Reddit |

### 3. Reddit API Setup

1. Go to https://www.reddit.com/prefs/apps
2. Click "create another app..."
3. Select **script**
4. Name: "Venn"
5. Redirect URI: http://localhost:1313
6. Note the `client_id` (below app name)
7. Note the `client_secret`

### 4. Ollama Setup (Optional, for local AI)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull recommended models
ollama pull gemma3
ollama pull llama3
ollama pull mistral
```

### 5. Development

```bash
# Using Netlify CLI to support Blobs and Functions
npx netlify dev
```

Then open http://localhost:1313

### 6. Production Deploy

```bash
# Deploy to Netlify
npx netlify deploy --prod --dir=.next
```

Or connect your GitHub repo to Netlify for automatic deploys.

---

## 📖 Usage Guide

### Adding Topics

Click `+ TOPIC` and enter any topic (movie name, person, event, etc.) Topics are synced via Tavily search and AI-summarized.

### Adding Reddit Sources

- **Subreddits**: Enter `r/programming` — shows Hot/New/Top/Rising posts
- **Reddit Users**: Enter `u/spez` — shows Overview/Posts/Comments

### Adding Packages

Track npm or PyPI packages. Venn fetches version history and checks for updates.

### Adding RSS Feeds

Add any RSS/Atom feed URL. Venn parses and displays entries.

---

## ⚙️ Settings

| Option | Description |
|---|---|
| **AI Mode** | Auto (Ollama first, fallback), Ollama only, or OpenRouter |
| **Ollama URL** | Default `http://localhost:11434` |
| **Reddit Post Count** | Posts to fetch per source (default: 15) |
| **Cache TTL** | How long to cache data (default: 4 hours) |

---

## 📱 Mobile & PWA

Venn is a first-class PWA:
- **iOS**: "Add to Home Screen" for full-screen experience
- **Android**: Installable directly from browser
- **Features**: Bottom-sheet drawers, tabbed navigation, swipe gestures

---

## 🔐 Privacy & Data

- **No Database**: Venn operates on LocalStorage + Netlify Blobs
- **Local AI**: Switch to **Ollama** in Settings for complete privacy
- **Sync**: Cloud sync ensures data across devices
- **Your Keys**: API keys stay on your deployment

---

## 🐛 Troubleshooting

### Ollama not connecting
- Ensure Ollama is running: `ollama serve`
- Check URL in Settings (default: http://localhost:11434)
- Try accessing http://localhost:11434/api/tags in browser

### Reddit not working
- Verify client_id and client_secret in .env.local
- Ensure Reddit app redirect URI matches exactly

### Build errors
- Run `npm run build` locally to check for errors
- Ensure all env variables are set

---

## 📄 License

MIT — Created by [hariharen9](https://github.com/hariharen9).
**Note:** This is a personal tool. It is provided "as is". Use your own API keys for third-party services.