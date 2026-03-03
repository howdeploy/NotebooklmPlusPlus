# Stack Research

**Domain:** NotebookLM companion browser extension with in-page UI augmentation and Google Docs/Drive export
**Researched:** 2026-03-03
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Chrome Extension Manifest V3 | Current stable platform | Extension runtime model | Required modern platform for Chrome extensions; event-driven architecture fits NotebookLM augmentation and Chrome continues investing here. |
| Plain TypeScript | 5.x | Safer extension logic across background/content/UI contexts | Stronger maintainability than ad hoc JS once the codebase grows across content scripts, Drive export services, and UI state. |
| `chrome.scripting` + content scripts | Chrome 88+ MV3 API | Inject NotebookLM UI affordances and scrape note data | Official runtime injection model for MV3; better fit than brittle static injection everywhere. |
| Google Docs API + Google Drive API | v1 / v3 REST | Create Docs, populate content, optionally move to folders later | Official way to create and write Docs content with controlled Drive scopes. |
| `chrome.identity` OAuth2 flow | Current Chrome API | Obtain Google API access tokens inside extension UX | Official extension-native auth path for Google APIs; avoids custom cookie scraping for Drive/Docs access. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `esbuild` | 0.25.x | Fast bundling for MV3 extension contexts | Use when converting the project from loose JS files to typed modular builds. |
| `@types/chrome` | 0.1x | Type support for Chrome extension APIs | Use immediately with TypeScript migration. |
| `zod` | 3.x or 4.x | Validate storage payloads and message contracts | Use once message passing and export job payloads become more complex. |
| `dompurify` | 3.x | Sanitize any HTML-derived note content before conversion | Use if export path starts from rich HTML instead of plain text extraction. |
| `turndown` | 7.x | Convert rich HTML note content into an intermediate text model | Use only if NotebookLM note content is easiest to extract as HTML and needs normalization before Docs output. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint | Static analysis | Add Chrome-extension-aware rules and forbid dangerous DOM patterns in content scripts. |
| Prettier | Formatting | Keep generated MV3 JSON, TS, and extension UI code consistent. |
| Puppeteer | End-to-end extension testing | Use unpacked-extension E2E runs to validate NotebookLM DOM integration and service-worker behavior. |

## Installation

```bash
# Core
npm install zod dompurify turndown

# Dev dependencies
npm install -D typescript esbuild eslint prettier @types/chrome puppeteer
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| TypeScript + esbuild | Stay on plain JavaScript | Only if keeping the project very small and intentionally short-lived. |
| `chrome.identity` OAuth | Manual token/cookie harvesting from Google pages | Avoid unless there is no supported API path; it is harder to review, less stable, and riskier for Chrome Web Store distribution. |
| Docs API `documents.create` + `batchUpdate` | Drive-only file creation from uploaded markdown/text blobs | Use Drive-only creation if fidelity is intentionally low and plain files are acceptable. |
| Structured DOM extraction in content scripts | Heavy debugger/CDP-driven scraping | Use debugger only for cases like PDF printing that cannot be done otherwise. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Broad Drive scopes like `drive` or `drive.readonly` | Higher review burden and broader user-data access than necessary | `drive.file` plus the narrow Docs scopes needed for creation/editing |
| Persisting OAuth tokens in `storage.sync` or `storage.local` | Official Chrome guidance warns these stores are not appropriate for confidential data | Keep tokens in memory/session and rely on `chrome.identity` token caching |
| Building core flows around `chrome.debugger` | Powerful permission with strong warning surface and unnecessary risk for general export features | Standard DOM extraction, content scripts, and official Google APIs |
| Assuming NotebookLM DOM shape is stable | Google can ship UI changes at any time | Add resilient selectors, capability detection, and fast failure paths |

## Stack Patterns by Variant

**If the extension stays Chrome-only:**
- Use `chrome.identity` directly
- Because the product is already tied to Chrome MV3 APIs and Google account flows

**If cross-browser support becomes a real goal later:**
- Introduce a browser-abstraction layer and reconsider auth
- Because Firefox/Edge portability will otherwise be blocked by Chrome-specific identity behavior

**If rich note formatting proves inconsistent in DOM extraction:**
- Export via a normalized internal note model, then render to Docs requests
- Because direct DOM-to-Docs mapping becomes too brittle to maintain

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| MV3 service worker | Chrome 116+ behavior improvements | Better long-running reliability for auth and extension events; test against current stable Chrome |
| `chrome.identity` | MV3 + manifest `oauth2` | Requires extension OAuth client configuration and user-consented scopes |
| Docs API v1 | Drive API v3 | Common pairing when creating Docs and optionally organizing them in Drive |

## Sources

- https://developer.chrome.com/docs/extensions/reference/api/identity — verified extension OAuth token flow and manifest requirements
- https://developer.chrome.com/docs/extensions/reference/manifest/oauth2 — verified manifest OAuth configuration
- https://developer.chrome.com/docs/extensions/reference/api/scripting — verified MV3 runtime injection pattern
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle — verified MV3 service worker lifecycle and persistence constraints
- https://developer.chrome.com/docs/extensions/reference/api/storage — verified storage guidance and token-safety implications
- https://developers.google.com/workspace/docs/api/reference/rest — verified Docs API create/get/batchUpdate surface
- https://developers.google.com/docs/api/how-tos/documents — verified Docs creation flow and folder-placement constraints
- https://developers.google.com/workspace/drive/api/guides/create-file — verified Drive file creation flow
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth — verified scope recommendations, especially `drive.file`

---
*Stack research for: NotebookLM companion extension*
*Researched: 2026-03-03*
