# YouTube Comments Parser — Technical Documentation

## Overview

The YouTube Comments Parser is a feature of the "Add to NotebookLM" Chrome extension that extracts comments from YouTube videos and imports them into Google NotebookLM as text sources. It works without any YouTube API key — using DOM data extraction for metadata and YouTube's InnerTube API for comments.

---

## Architecture

### Files Involved

| File | Role |
|------|------|
| `popup/popup.html` | UI: Parse button, progress bar, cancel button |
| `popup/popup.js` | UI logic: trigger, poll status, update progress, handle cancel |
| `background.js` | Orchestrator: 4-phase pipeline, state machine, message router |
| `lib/youtube-comments-api.js` | Core: metadata extraction, InnerTube API, comment parsing |
| `lib/comments-to-md.js` | Formatter: markdown generation, text splitting |
| `app/app.html` | Settings UI: mode, limit, replies toggles |
| `app/app.js` | Settings persistence to `chrome.storage.local` |

### Data Flow

```
[YouTube Tab] ──scripting.executeScript──> [DOM / InnerTube data]
                                                │
[Popup UI] ──sendMessage({ cmd })──> [Background Service Worker]
     │                                          │
     │ poll every 500ms                         ├─ Phase 1: getVideoMetadataFromDOM()
     │ { cmd: 'get-parse-status' }              ├─ Phase 2: fetchAllComments()
     │                                          ├─ Phase 3: CommentsToMd.format()
     │ <── parseState updates ──                ├─ Phase 4: NotebookLMAPI.addTextSource()
     │                                          │
[Progress UI]                            [NotebookLM]
```

---

## Phase 1: Video Metadata Extraction

**Function:** `YouTubeCommentsAPI.getVideoMetadataFromDOM(tabId)`
**File:** `lib/youtube-comments-api.js:32-210`

Executes `chrome.scripting.executeScript` in the YouTube tab's `MAIN` world to access page internals.

### Data Sources (by priority)

| Field | Primary Source | Fallback |
|-------|---------------|----------|
| `videoId` | `playerResponse.videoDetails.videoId` | — |
| `title` | `playerResponse.videoDetails.title` | `document.title` minus " - YouTube" |
| `channelTitle` | `playerResponse.videoDetails.author` | — |
| `viewCount` | `playerResponse.videoDetails.viewCount` | — |
| `publishedAt` | `microformat.playerMicroformatRenderer.publishDate` (ISO) | DOM `#info-strings yt-formatted-string` |
| `likeCount` | BFS through `pageData` for like button view model | DOM `aria-label` on button elements |
| `commentCount` | BFS through `pageData.engagementPanels` for `commentsEntryPointHeaderRenderer` | `ytd-comments` component data |

### How `publishedAt` Works

The old approach picked up localized text from DOM (e.g., "54 тыс. просмотров" on Russian YouTube instead of the date). The fix uses `playerResponse.microformat.playerMicroformatRenderer.publishDate` which returns a locale-independent ISO date like `"2024-01-15"`.

```javascript
const microformat = playerResponse?.microformat?.playerMicroformatRenderer;
publishedAt = microformat.publishDate || microformat.uploadDate || '';
```

### How `likeCount` Works

YouTube stores like counts in deeply nested view model objects. The function uses BFS (breadth-first search) to find them:

1. **`segmentedLikeDislikeButtonViewModel`** → `likeButtonViewModel` → `toggleButtonViewModel` → `defaultButtonViewModel.buttonViewModel.title` (e.g., "15K")
2. **`toggledText.content` / `defaultText.content`** pattern in like button structures
3. **`topLevelButtons`** in `videoPrimaryInfoRenderer` → `toggleButtonRenderer.defaultText.accessibility.label`
4. **DOM fallback:** tries 4 different CSS selectors for `button[aria-label]`

### How `commentCount` Works

Comment count is available in `engagementPanels` **before** the comments section lazy-loads:

1. **`commentsEntryPointHeaderRenderer.commentCount.simpleText`** — the count shown in the engagement panel header
2. **`commentsCount.simpleText`** — alternative location in section header data
3. **`ytd-comments` component data** → `countText.runs` — if the comments section has already loaded

### BFS Helper

Both `likeCount` and `commentCount` extraction use an inline `bfsFind(root, predicate, maxDepth)` function that traverses nested objects/arrays up to a configurable depth, calling a predicate on each plain object. Returns the first non-`undefined` result.

### `parseCountStr` Helper

Parses abbreviated number strings with Russian/English suffixes:
- `"1.2K"` → 1200
- `"15 тыс."` → 15000
- `"1,5 млн"` → 1500000
- `"54"` → 54

---

## Phase 2: Comment Fetching

**Function:** `YouTubeCommentsAPI.fetchAllComments(videoId, options)`
**File:** `lib/youtube-comments-api.js:97-232`

### Setup

1. **Extract `ytcfg`** from the YouTube tab via `_extractYtConfig(tabId)`:
   - Gets `INNERTUBE_API_KEY` and `INNERTUBE_CONTEXT` from `window.ytcfg.data_`
   - BFS-scans `ytd-comments` and `ytd-watch-flexy` component data for sort menu items and continuation tokens
   - Fallback to `window.ytInitialData` (stale on SPA navigation)

2. **Find initial continuation token** via `_findCommentsContinuation(ytConfig, mode)`:
   - Strategy 1: Use sort menu (`sortFilterSubMenuRenderer.subMenuItems`) — index 0 for "Top", index 1 for "Newest"
   - Strategy 2: Find continuation with `targetId === 'comments-section'`
   - Strategy 3: First available continuation token

### Pagination Loop

Uses a **two-queue system** for ordered fetching:

```
topQueue  → top-level comment pages (processed first)
replyQueue → reply thread pages (processed after all top-level pages)
```

For each page:
1. Fetch via `_fetchCommentPage(token, ytConfig)` — POST to InnerTube API
2. Parse via `_parseInnerTubeResponse(response, type)` — extract comments + continuations
3. Route new continuations to `topQueue` or `replyQueue`
4. Check `cancelToken.cancelled` and `maxComments` limit

### InnerTube API Call

**Endpoint:** `https://www.youtube.com/youtubei/v1/next?key={API_KEY}`

Request is executed **inside the YouTube tab** via `chrome.scripting.executeScript` to inherit cookies and origin:

```javascript
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ context: INNERTUBE_CONTEXT, continuation: token })
});
```

Retry logic: exponential backoff (2^attempt seconds) on HTTP 429/500/503, up to 3 retries.

### Response Parsing

**Function:** `_parseInnerTubeResponse(response, continuationType)`
**File:** `lib/youtube-comments-api.js:422-556`

Two comment formats are handled:

1. **Entity payloads (new format):** `frameworkUpdates.entityBatchUpdate.mutations[].payload.commentEntityPayload`
   - Properties: `commentId`, `content.content`, `publishedTime`
   - Author: `displayName`
   - Toolbar: `likeCountNotliked` / `likeCountLiked`

2. **Comment renderers (old format):** `onResponseReceivedEndpoints[].continuationItems[].commentThreadRenderer.comment.commentRenderer`
   - `commentId`, `contentText` (runs/simpleText), `publishedTimeText`
   - `authorText.simpleText`, `voteCount.simpleText`

Reply continuations come from `commentThreadRenderer.replies.commentRepliesRenderer` — both `contents` (old) and `subThreads` (new) paths.

Comment deduplication via `seenCommentIds` Set prevents duplicates across pagination.

### Comment Object Structure

```javascript
// Top-level comment
{
  id: "Ugw...",
  author: "Username",
  text: "Comment text",
  likeCount: 42,
  publishedAt: "2 years ago",
  totalReplyCount: 5,
  replies: [
    {
      id: "Ugw...z4F",     // contains "." for replies
      author: "Reply Author",
      text: "Reply text",
      likeCount: 3,
      publishedAt: "1 year ago"
    }
  ]
}
```

---

## Phase 3: Markdown Formatting

**Object:** `CommentsToMd`
**File:** `lib/comments-to-md.js`

### Output Format

```markdown
# YouTube Comments

**Video:** Video Title
**Channel:** Channel Name
**Published:** 15.01.2024
**Views:** 1,234,567 | **Likes:** 45,678
**Total comments:** 2,345
**Parsed comments:** 1,000 comments, 3,456 replies
**Parsed at:** 02.02.2026

===

**AuthorName** | 👍42 | 2 years ago
This is the comment text

  ↳ **ReplyAuthor** | 👍3 | 1 year ago
  This is a reply

**AnotherAuthor** | 👍15 | 3 months ago
Another comment
```

### Text Splitting

If total word count exceeds `MAX_WORDS_PER_PART` (400,000 words), the output is split into multiple parts. Each comment thread (with replies) is an **indivisible block** — never split mid-thread.

Part titles: `"Comments: Video Title (Part 1)"`, `"Comments: Video Title (Part 2)"`, etc.

### Localization

Labels are localized in English and Russian. Language is read from `chrome.storage.sync.language`.

### Date Formatting

- ISO dates (`2024-01-15T...`) → `DD.MM.YYYY`
- Relative strings (`"2 years ago"`) → passed through as-is

---

## Phase 4: Send to NotebookLM

Each formatted part is sent as a text source via `NotebookLMAPI.addTextSource(notebookId, text, title)`.

Auth tokens are refreshed before sending (`NotebookLMAPI.getTokens(currentAuthuser)`) because parsing may have taken minutes.

---

## Settings

Managed in `app/app.html` and `app/app.js`, stored in `chrome.storage.local`.

| Setting | Key | Values | Default |
|---------|-----|--------|---------|
| Sort mode | `commentsMode` | `"top"`, `"newest"` | `"top"` |
| Comment limit | `commentsLimit` | 1000, 2000, 5000, 0 (unlimited) | 1000 |
| Include replies | `commentsIncludeReplies` | boolean | `true` for top, `false` for newest |

**Behavior by mode:**
- **Top:** YouTube naturally limits to ~1000 most popular comments. `maxComments=0` (no artificial limit). Replies included by default.
- **Newest:** All comments sorted by date. Limit configurable. Replies off by default.

The limit selector is only visible when mode is `"newest"`.

---

## Progress & State Machine

### State Object (`parseState` in background.js)

```javascript
{
  active: boolean,
  videoId: string,
  progress: {
    fetched: number,    // top-level comments fetched so far
    total: number|null, // from metadata.commentCount
    phase: string       // current phase
  },
  cancelToken: { cancelled: boolean },
  error: { code: string, message: string } | null,
  result: { commentCount, totalComments, partCount, videoTitle } | null
}
```

### Phase Transitions

```
idle → fetching → fetching_replies → formatting → sending → done
  │                                                           │
  └─── (any phase) ──→ error                                 │
  └─── (any phase) ──→ cancelled                             │
```

### Polling

Popup polls `{ cmd: 'get-parse-status' }` every 500ms. UI updates:

| Phase | Display |
|-------|---------|
| `fetching` | "Loading comments... (150 / ~2,345)" |
| `fetching_replies` | "Loading replies... (1000 comments)" |
| `formatting` | "Formatting..." |
| `sending` | "Sending to NotebookLM..." |
| `done` | Success message with notebook link |
| `error` | Mapped error message |
| `cancelled` | "Parsing cancelled" |

---

## Cancel Mechanism

1. User clicks cancel button in popup
2. `popup.js` sends `{ cmd: 'cancel-parse' }`
3. `background.js` sets `parseState.cancelToken.cancelled = true`
4. `youtube-comments-api.js` checks the token at 3 points:
   - Before fetching each page (line 129)
   - After receiving response (line 159)
   - Before processing each comment (line 171)
5. Functions return early, `doParseComments` exits

---

## Message Commands

| Command | Direction | Parameters | Response |
|---------|-----------|------------|----------|
| `parse-comments` | popup → bg | `notebookId`, `videoId`, `tabId` | `{ started: true }` or `{ error }` |
| `get-parse-status` | popup → bg | — | `{ active, progress, error, result }` |
| `cancel-parse` | popup → bg | — | `{ success: true }` |

---

## Error Handling

| Error Code | Cause |
|------------|-------|
| `COMMENTS_DISABLED` | No comments section / continuation token found |
| `VIDEO_NOT_FOUND` | Metadata extraction failed (not on video page) |
| `INVALID_REQUEST` | Missing `tabId` parameter |
| `NETWORK_ERROR` | InnerTube API HTTP error or script execution failure |

Retries: up to 3 attempts with exponential backoff for HTTP 429/500/503.

---

## Key Implementation Details

- **No API key required.** Metadata from DOM data objects, comments via InnerTube with page cookies.
- **SPA-safe.** Uses `ytd-watch-flexy` component data instead of stale `window.ytInitialData`.
- **Locale-independent.** Published date from `microformat.publishDate` (ISO), not localized DOM text.
- **Rate limiting.** 100ms delay between requests, exponential backoff on errors.
- **Memory efficient.** Comments processed incrementally, not buffered in full response objects.
- **Deduplication.** `seenCommentIds` Set prevents duplicates across old/new comment formats and pagination.
