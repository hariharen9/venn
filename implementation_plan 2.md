# Reddit Intelligence Integration Plan (MASTER)

Implement a premier, expert-level Reddit tracking system using the official Reddit OAuth API. This follows Venn's "Pure Uplink" architecture to provide a high-performance, customizable command-center experience.

## The Access Strategy: Option A (Reddit OAuth)
- **Why?**: Standard RSS and unauthenticated `.json` endpoints are blocked by Reddit on serverless IPs (Netlify/Vercel). 
- **Solution**: The `client_credentials` OAuth flow via `oauth.reddit.com` is reliable, fast, and free (100 queries/min).
- **Security**: All authentication happens server-side in `pages/api/reddit.js`. No secrets are exposed to the client.

## Proposed Features & Customizability

### 1. Core Data Intelligence
| Feature | Data Source | Details |
|---|---|---|
| **Multi-Sort Feed** | `hot`, `new`, `top`, `rising` | Dynamic selection per subreddit. |
| **Time Filtering** | `hour`, `day`, `week`, `month`, `year`, `all` | For `top` sort mode. |
| **Subreddit Intel** | `r/{sub}/about` | Subscribers, active users, description, icon, banner colors. |
| **Multi-Sub Feeds** | Combined endpoints | Support for `r/sub1+sub2` combined views. |
| **Engagement Pulse** | Post metadata | Scores, comment counts, awards, and flair. |

### 2. Enhanced Visual Layer
| Feature | Visual implementation |
|---|---|
| **Score Formatting** | Color-coded upvote counts (Green > 1k, Yellow > 500). |
| **Post Type Icons** | Indicators for Text (📜), Image (🖼️), Video (🎥), Link (🔗). |
| **Flair Badges** | Subreddit-specific post flairs with subtle styling. |
| **Media Previews** | High-fidelity thumbnails behind scanline effects. |
| **Safe Mode** | NSFW/Spoiler tags and content blurring (toggleable). |
| **Intel Header** | Subreddit subscriber counts and "Active Now" telemetry. |
| **Direct Uplinks** | One-click links to Reddit posts, authors, or comments. |

### 3. User Customization Options
| Setting | Options |
|---|---|
| **Default Sort** | Hot (default), New, Top, Rising |
| **Default Time Range** | Day, Week (default), Month, Year, All |
| **Data Density** | **Compact** (List style) vs **Expanded** (Rich card style) |
| **Media Display** | Toggle thumbnails on/off |
| **NSFW Protocol** | Toggle filter on/off (Safe mode by default) |
| **Uplink Count** | Number of posts per sub (5, 10, 15, 25) |

## Implementation Roadmap

### Phase 1: The Backend (API & State)
- **[NEW] [reddit.js](file:///d:/Programming/venn/pages/api/reddit.js)**: Server-side token management + data proxying.
- **[NEW] [useSubreddits.js](file:///d:/Programming/venn/lib/useSubreddits.js)**: Hook for `localStorage` persistence, cache (1h TTL), and cloud sync events.

### Phase 2: The UI (Components)
- **[NEW] [SubredditCard.js](file:///d:/Programming/venn/components/SubredditCard.js)**: The primary dashboard widget with all interactive controls.
- **[NEW] [AddSubredditForm.js](file:///d:/Programming/venn/components/AddSubredditForm.js)**: Modal for adding new tracking protocols.

### Phase 3: Integration
- **[MODIFY] [index.js](file:///d:/Programming/venn/pages/index.js)**: Add `REDDIT_FEED_PULSE` section and `+ SUB` header button.
- **[MODIFY] [SettingsPanel.js](file:///d:/Programming/venn/components/SettingsPanel.js)**: Global toggles for NSFW, thumbnails, and density.

## Verification Plan
1. **Cred Verification**: Automated check for `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`.
2. **Layout Stress Test**: Add 5+ subreddits and verify drag-and-drop reordering.
3. **Sync Loop**: Verify that settings and subreddits sync across devices (Local ↔ Cloud).
