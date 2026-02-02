# Resume Context: YouTube Comments Parser — InnerTube Migration

## Branch: `feature/youtube-comments-parser`

## Current Status (2026-02-02)

**InnerTube API migration ~90% done.** Top-level comments load and send to NotebookLM successfully (1228 comments from MrBeast video). **Reply (replies) continuations not loading — this is the active bug.**

## What Was Done This Session

### Migrated from YouTube Data API v3 to InnerTube API

1. **`lib/youtube-comments-api.js`** — Rewrote `fetchAllComments()` to use InnerTube API instead of Data API v3 for comment fetching. Key changes:
   - `_extractYtConfig(tabId)` — injects script into YouTube tab via `chrome.scripting.executeScript` with `world: 'MAIN'` to read `window.ytcfg` and `window.ytInitialData`
   - `_fetchCommentPage(continuation, ytConfig)` — executes fetch in YouTube tab context (not service worker!) via `chrome.scripting.executeScript` with `world: 'MAIN'`, because service worker gets 403 (wrong origin)
   - `_parseInnerTubeResponse()` — parses `onResponseReceivedEndpoints` structure
   - `_findCommentsContinuation()` — uses "Newest first" sort (index 1 in `sortFilterSubMenuRenderer`) to avoid ~1000 limit of "Top comments" sort
   - `extractVideoId` kept (URL parsing only). `validateApiKey` and `getVideoMetadata` removed — metadata now extracted from DOM via `getVideoMetadataFromDOM(tabId)`

2. **`background.js`** — Added `tabId` parameter to `parse-comments` command and `doParseComments()` function

3. **`popup/popup.js`** — Passes `currentTab.id` as `tabId` in `parse-comments` message. Removed API limit hint display.

4. **`lib/comments-to-md.js`** — `_formatDateCompact()` now handles InnerTube's relative date strings ("2 years ago")

5. **i18n** — Replaced `comments_apiLimitHint` with `comments_configExtractFailed` in EN/RU

## The Active Bug: Reply Continuations Not Found

### Symptoms
- `replyConts=0` on ALL pages in service worker logs
- 1228 top-level comments load perfectly (62 pages, pagination works)
- 156K total = ~1228 top-level + ~155K replies — replies are NOT being fetched
- Video: MrBeast "$1 Vs $100,000,000" (ID: KrLj6nc...)

### Root Cause Analysis
YouTube uses a **new `commentViewModel` format** instead of the old `commentThreadRenderer`. In the new format:
- Comment data is in `frameworkUpdates.entityBatchUpdate.mutations[].payload.commentEntityPayload`
- Comment rendering is via `commentViewModel` (not `commentRenderer`)
- **Reply continuation tokens** may be stored differently in this new format

### What's Already Been Tried
The parser checks for replies in:
1. `commentThreadRenderer.replies.commentRepliesRenderer.contents` → OLD format (works for old videos)
2. `commentViewModel.replies.commentRepliesRenderer.contents` → NEW format (not finding replies)
3. `item.commentThreadRenderer.commentViewModel` → wrapper format

### Diagnostic Code Currently In Place
Debug logging in `_parseInnerTubeResponse()` that outputs first item's structure:
- `[YT-Comments] first item keys:` — top-level keys of the first continuationItem
- `[YT-Comments] thread keys:` — keys inside commentThreadRenderer
- `[YT-Comments] thread.comment keys:` — what's inside thread.comment
- `[YT-Comments] thread.replies:` — full replies structure (first 800 chars)

### Key Insight from Logs (2026-02-02 11:54)
Previous debug lines (`viewModel keys`, `threadWithViewModel`) did NOT appear in logs. This means:
- Items are NOT `commentViewModel` at top level
- Items ARE likely `commentThreadRenderer` but `thread.comment.commentRenderer` might be null (new format uses `commentViewModel` inside thread.comment instead)
- The new diagnostic will show the actual structure

**NEXT STEP: Reload extension, run parser, check service worker console for `[YT-Comments] first item keys` / `thread keys` / `thread.replies` lines.**

### How to Debug
1. Reload extension at `chrome://extensions/`
2. Click "service worker" link on extension card → opens DevTools
3. Go to YouTube video, open popup, click "Спарсить комментарии"
4. Check console for `[YT-Comments] first item keys` and `[YT-Comments] thread.replies` lines
5. The logged structure will reveal where reply continuation tokens are located
6. **Fix path**: Once we see the structure, update `_parseInnerTubeResponse()` to extract reply continuation tokens from the correct location

## Architecture Overview

### Key Technical Decisions
- **`world: 'MAIN'`** is REQUIRED for both `_extractYtConfig` and `_fetchCommentPage` — without it, injected scripts can't access page JS variables or send requests with YouTube cookies
- **Two queues** in `fetchAllComments`: `topQueue` (prioritized) and `replyQueue` — ensures all top-level comments load before replies
- **Sort selection**: Must use "Newest first" (sortMenuItems[1]) to get all comments; "Top comments" caps at ~1000
- **InnerTube endpoint**: POST to `https://www.youtube.com/youtubei/v1/next?key={INNERTUBE_API_KEY}` with `{ context: INNERTUBE_CONTEXT, continuation: token }`

### Files Modified (from original Data API v3 version)
| File | Change |
|------|--------|
| `lib/youtube-comments-api.js` | **Major rewrite** — InnerTube client |
| `background.js` | Added `tabId` to `parse-comments` cmd + `doParseComments()` |
| `popup/popup.js` | Pass `currentTab.id`, removed API limit hint |
| `lib/comments-to-md.js` | Handle relative dates in `_formatDateCompact` |
| `_locales/en/messages.json` | Replaced `apiLimitHint` → `configExtractFailed` |
| `_locales/ru/messages.json` | Same |

### What Still Works (unchanged)
- `extractVideoId()` — URL parsing, no API needed
- `CommentsToMd.format()` — unchanged, handles both ISO dates and relative dates
- All other extension features (add source, notebooks, playlists, etc.)

### What Was Removed
- `validateApiKey()` and `getVideoMetadata()` — replaced by DOM-based metadata extraction (`getVideoMetadataFromDOM`)
- YouTube Data API v3 dependency — no longer needed, no API key required
- Settings UI for API key — replaced with comments mode/limit/replies settings

## User's Setup
- NotebookLM account working (add video and text sources work)
- Russian locale active
- Sending comments to NotebookLM works (1228 comments successfully added as text source)
- No YouTube API key needed — comments fetched via InnerTube API

## To Continue
1. Check debug logs from service worker to see reply structure
2. Fix reply continuation token extraction in `_parseInnerTubeResponse()`
3. Remove debug logging after fix
4. Test with video that has moderate comments (~5K) first
5. Test full 156K video
6. Consider: for very large videos (100K+), replies fetching could take very long — may want to add option to skip replies
