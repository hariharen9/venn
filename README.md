# ⚡ VENN — Personal intelligence Dashboard

<div align="center">
  <img src="public/apple-touch-icon.png" width="128" height="128" alt="Venn Logo" />
  <p><strong>A hyper-fast, private, and AI-powered intelligence feed for your digital life.</strong></p>
  <p>Created by <a href="https://github.com/hariharen9">hariharen9</a></p>
</div>

---

> **Track anything. Summary everything. Own your data.** Venn is a self-hosted command center designed to transform scattered information into actionable intelligence.

## 🚀 Key Features

- **AI-Powered Tracking** — Add any topic, subreddit, or individual Reddit user.
- **Semantic Summarization** — Real-time synthesis of web search results and social feeds using LLMs.
- **Native PWA Feel** — Mobile-optimized with bottom-sheet modals, safe-area support, and a fixed navigation bar.
- **Local-First / Private** — Support for local LLMs via **Ollama**. Cloud backup via Netlify Blobs.
- **Universal Search** — Instant semantic global search (Omnibar) across all your tracked entities.
- **Aesthetic First** — Terminal-inspired, high-breathability dark interface with multiple dynamic themes.
- **PIN-Locked** — Lightweight security to keep your dashboard eyes-only.

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) (App + Pages) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + Vanilla CSS |
| **AI Processing** | [OpenRouter](https://openrouter.ai/) (Gemma 3) or local [Ollama](https://ollama.com/) |
| **Search Engine** | [Tavily AI](https://tavily.com/) |
| **Persistence** | [Netlify Blobs](https://www.netlify.com/products/blobs/) (Global Sync) + LocalStorage |
| **Auth** | Custom PIN-based Middleware |

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

| Variable | Description |
|---|---|
| `TAVILY_API_KEY` | [Tavily](https://tavily.com/) Search API Key |
| `OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai/) API Key |
| `APP_PIN` | Your chosen 6+ digit access code |
| `REDDIT_CLIENT_ID` | Reddit App Client ID |
| `REDDIT_CLIENT_SECRET` | Reddit App Secret |

### 3. Development

```bash
# Using Netlify CLI to support Blobs and Functions
npx netlify dev
```

---

## 📱 Mobile & PWA

Venn is a first-class PWA. 
- **iOS**: "Add to Home Screen" for a full-screen, native experience with safe-area support.
- **Android**: Installable directly from the browser.
- **Tactile UI**: Uses bottom-sheet drawers and tabbed navigation for a modern mobile feel.

---

## 📦 Data & Privacy

- **No Database**: Venn operates purely on your local storage and cloud blobs.
- **Local AI**: Switch to **Ollama** in Settings to run all data summarization on your own hardware.
- **Sync**: Bidirectional cloud sync ensures your data follows you across devices without a traditional database.

## 📄 License

MIT — Created by [hariharen9](https://github.com/hariharen9). 
**Note:** This is a personal tool. It is provided "as is". Use your own API keys for third-party services.