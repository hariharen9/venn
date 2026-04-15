# Reddit Intelligence Integration Plan

Implement a high-performance, expert-level Reddit tracking system using the official Reddit OAuth API (Application-Only flow). This integration will be a first-class citizen in the Venn dashboard, mirroring the robustness of Topics, Packages, and Feeds while offering the most customizability of any widget yet.

## User Review Required

> [!IMPORTANT]
> **API Security**: The implementation will use the `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` already provided. I will implement a server-side OAuth token refresh loop in the API route to ensure 100% reliability without exposing secrets to the client.
> **Safe Mode**: I will include an "NSFW Toggle" in the settings. By default, it will be **OFF** for a clean workspace, but can be enabled for complete access.

## Proposed Changes

### 1. API Architecture

#### [NEW] [reddit.js](file:///d:/Programming/venn/pages/api/reddit.js)
The brain of the Reddit integration. It will handle:
- **Automatic Token Management**: Checks for a valid access token (client-less) and fetches a new one via `client_credentials` if expired.
- **Subreddit Querying**: Supports `r/{sub}/{sort}` with params for `limit`, `t` (time range), and `after` (for future pagination).
- **Metadata Bundling**: In a single request (or parallelized), it will fetch:
  - The listing (posts).
  - Subreddit "About" data (subscribers, active users, icon, description).
- **Error Sanitization**: Maps Reddit's complex JSON errors into Venn's standard error format.

### 2. State & Persistence Logic

#### [NEW] [useSubreddits.js](file:///d:/Programming/venn/lib/useSubreddits.js)
Follows the established "Pure Uplink" pattern:
- **Persistence**: Manages `venn_subreddits` array and `venn_subreddit_cache`.
- **Sync Integration**: Dispatches `venn_needs_sync` on changes and responds to `venn_sync_updated` from the cloud.
- **Cache Policy**: 1-hour TTL (matches RSS feeds for timeliness).
- **CRUD Operations**:
  - `addSubreddit(name, sort, timeRange)`
  - `updateSubredditConfig(id, newConfig)`
  - `refreshAll()`
  - `reorderSubreddits(newOrder)`

### 3. Rich UI System

#### [NEW] [SubredditCard.js](file:///d:/Programming/venn/components/SubredditCard.js)
The most feature-rich card in the dashboard:
- **Terminal Header**: Displays `r/subreddit_name` in Space Mono, with live `SUBSCRIBERS` and `ACTIVE_PROTOCOLS` (active users) counts.
- **Dynamic Controls**: Inline mini-selectors for Sort (`HOT`, `NEW`, `TOP`, `RIZE`) and Time (`1H`, `1D`, `1W`, `1M`, `1Y`, `ALL`).
- **Post Interaction Layer**:
  - **Score Badge**: Color-coded (e.g., green for >1000, yellow for >500).
  - **Flair Badges**: Renders subreddit tags with subtle background tints.
  - **Type Detection**: Visual icons for Text (📜), Image (🖼️), Video (🎥), and Link (🔗).
  - **Thumbnails**: Micro-previews for media posts (optional toggle).
  - **Metadata**: Author name, comment count, and localized time-ago.
- **Transitions**: Smooth skeletons during refresh and fade-ins for content.

#### [NEW] [AddSubredditForm.js](file:///d:/Programming/venn/components/AddSubredditForm.js)
- Search-like input for subreddit names.
- Quick-pick defaults for Sort and Time.
- Preview of the subreddit before adding.

### 4. Global Dashboard Integration

#### [MODIFY] [index.js](file:///d:/Programming/venn/pages/index.js)
- **Grid Layout**: Adds a fourth section: `REDDIT_FEED_PULSE`.
- **Header**: Adds `+ SUB` button with a Reddit icon 📂.
- **Drag-and-Drop**: Registers a new `DndContext` and `SortableContext` for Reddit cards, ensuring they can be reordered independently.

#### [MODIFY] [SettingsPanel.js](file:///d:/Programming/venn/components/SettingsPanel.js)
Adds a new "REDDIT_WIDGET_CONFIG" section:
- **Toggle**: `Show Media Thumbnails`
- **Toggle**: `NSFW Filter (Active/Bypass)`
- **Density Selector**: `Compact` (List view) vs `Expanded` (Rich card view).

## Detailed Feature List

| Feature | Description | Implementation Detail |
|---|---|---|
| **Multi-Sort** | Hot, New, Top, Rising | Fetched via URL params in `reddit.js` |
| **Time Filtering** | Filter top posts by hour, day, week, etc. | Pass `t` parameter to API |
| **Engagement Pulse** | Score and Comment counts | Real-time data from `data.children[].data` |
| **Aesthetic Padding** | Subreddit icons and banner colors | Extracted from `r/{sub}/about.json` |
| **Safe Browsing** | NSFW hiding and blur support | Client-side filter on `over_18` flag |
| **Deep Links** | Open posts or comments directly | Using `permalink` from Reddit response |

## Verification Plan

### Automated Testing
1. **OAuth Loop**: Verify token exchange survives multiple parallel calls.
2. **Data Integrity**: Ensure all metadata (flair, score, author) is correctly mapped to the UI.
3. **Sync Integrity**: Verify that adding a subreddit on one client appears on another after a `venn_sync_updated` event.

### Manual Verification
1. Add a variety of subs: `r/programming` (text-heavy), `r/earthporn` (image-heavy), `r/news` (link-heavy).
2. Toggle "Compact Mode" and verify layout responds instantly.
3. Test reordering via drag-and-drop.
4. Verify thumbnails load correctly behind the scanline effect.
