# Architecture Research

**Domain:** NotebookLM companion browser extension with Docs/Drive export
**Researched:** 2026-03-03
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    NotebookLM Web Page                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌────────────────────────────────┐  │
│  │ Note discovery   │  │ Injected action UI            │  │
│  │ + selection      │  │ checkboxes / export button    │  │
│  └────────┬─────────┘  └──────────────┬─────────────────┘  │
│           │                            │                    │
├───────────┴────────────────────────────┴────────────────────┤
│                   Content Script Layer                      │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Note extraction + message bridge + UI state adapter   │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                Extension Service Worker Layer               │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐   │
│  │ Export orches- │ │ OAuth/token    │ │ Docs/Drive API │   │
│  │ trator         │ │ manager        │ │ client         │   │
│  └────────────────┘ └────────────────┘ └────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                       Storage Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ storage.sync │  │ storage.local│  │ storage.session  │   │
│  │ user prefs   │  │ UI prefs     │  │ volatile state   │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| NotebookLM content script | Detect note surfaces, inject controls, collect selected note payloads | DOM observers, capability detection, message dispatch |
| Export orchestrator | Turn selected-note payloads into Google Docs export jobs | Service-worker message handlers plus structured job objects |
| Auth manager | Request and refresh Google access tokens | `chrome.identity.getAuthToken()` with minimal scopes |
| Docs renderer | Convert normalized note model into Docs API requests | `documents.create` + `documents.batchUpdate` |
| Drive organizer | Optional follow-up placement/metadata operations | Drive API calls, likely later than v1 |
| Settings UI | User preferences and account/permission clarity | Popup/options page or extension app page |

## Recommended Project Structure

```text
src/
├── content/                # NotebookLM page integration
│   ├── notebook/           # Selectors, observers, extraction
│   ├── ui/                 # Injected buttons, checkboxes, toasts
│   └── index.ts            # Content-script entry
├── background/             # MV3 service worker logic
│   ├── auth/               # chrome.identity token handling
│   ├── export/             # export orchestration and job state
│   ├── google/             # Docs/Drive clients
│   └── index.ts            # Service-worker entry
├── shared/                 # Cross-context types and contracts
│   ├── models/             # Note model, export result model
│   ├── messages/           # runtime message schemas
│   └── utils/              # small pure helpers
├── popup/                  # Existing quick actions/settings UI
└── options/                # Optional richer settings page later
```

### Structure Rationale

- **content/** isolates NotebookLM-specific fragility from the rest of the extension.
- **background/** keeps Google API calls and OAuth away from direct page code.
- **shared/** prevents drift between message senders and receivers.
- **popup/** remains useful for settings and legacy import entry points without overloading the content script.

## Architectural Patterns

### Pattern 1: Normalized Note Model

**What:** Extract NotebookLM notes into an internal representation before export.
**When to use:** Always, unless the product intentionally dumps plain text.
**Trade-offs:** Slightly more work upfront, much easier to maintain when NotebookLM markup changes.

**Example:**
```typescript
type ExportableNote = {
  notebookId: string;
  noteId: string;
  title: string;
  blocks: Array<
    | { type: 'paragraph'; text: string }
    | { type: 'heading'; level: 1 | 2 | 3; text: string }
    | { type: 'list_item'; text: string }
  >;
};
```

### Pattern 2: Command-Based Message Passing

**What:** Use explicit message types between content script and service worker.
**When to use:** Immediately, because MV3 contexts are separated and the codebase already has message passing.
**Trade-offs:** Slightly more boilerplate, much easier debugging and testing.

**Example:**
```typescript
type RuntimeMessage =
  | { cmd: 'export-selected-notes'; notes: ExportableNote[] }
  | { cmd: 'get-export-status'; jobId: string };
```

### Pattern 3: Capability Detection over Selector Assumption

**What:** Detect whether required NotebookLM UI capabilities are present before injecting controls.
**When to use:** Always on third-party web apps that ship UI changes frequently.
**Trade-offs:** More defensive code, fewer silent breakages.

## Data Flow

### Request Flow

```text
[User checks notes and clicks export]
    ↓
[Injected export UI]
    ↓
[Content script extracts selected notes]
    ↓
[Runtime message to service worker]
    ↓
[Auth manager gets token]
    ↓
[Docs client creates doc(s)]
    ↓
[Docs renderer writes content]
    ↓
[Result returned to content script]
    ↓
[User sees success/failure summary]
```

### State Management

```text
[NotebookLM DOM state]
    ↓
[Selection adapter in content script]
    ↓
[Export command payload]
    ↓
[Ephemeral export job state in service worker / storage.session]
    ↓
[UI progress polling or push updates]
```

### Key Data Flows

1. **Selection flow:** NotebookLM note DOM -> normalized note model -> export payload.
2. **Export flow:** Export payload -> OAuth token -> Docs create/write requests -> result objects.
3. **Feedback flow:** Export result -> in-page toast/status UI -> optional persisted last results.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current extension architecture is fine; prioritize correctness and resilience |
| 1k-100k users | Tighten permission model, add better telemetry/debug logging, improve selector compatibility strategy |
| 100k+ users | Prepare for frequent NotebookLM UI breakages, store compatibility toggles remotely only if policy and privacy model justify it |

### Scaling Priorities

1. **First bottleneck:** DOM fragility in NotebookLM UI — fix with capability detection, selector centralization, and E2E tests.
2. **Second bottleneck:** Permission/auth friction — fix with narrower scopes and clearer user education.

## Anti-Patterns

### Anti-Pattern 1: Business Logic Inside the Content Script

**What people do:** Put extraction, auth, export, and result logic directly in the page context.
**Why it's wrong:** Makes NotebookLM DOM changes break unrelated export logic and complicates testing.
**Do this instead:** Keep content scripts thin; move Google API orchestration to the service worker.

### Anti-Pattern 2: Direct DOM-to-Docs Rendering

**What people do:** Translate arbitrary NotebookLM HTML straight into Docs requests.
**Why it's wrong:** Extremely fragile and hard to debug when markup changes.
**Do this instead:** Normalize first, then render from a stable internal note model.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| NotebookLM web UI | DOM detection and UI injection | No guaranteed public app API was identified in official docs; treat as unstable integration |
| Google Docs API | Create document, then `batchUpdate` content | Best fit for preserving note structure |
| Google Drive API | Optional placement, metadata, later folder management | Useful once v1 export works reliably |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| content ↔ background | runtime messages | Define strict command schemas |
| background ↔ Google APIs | REST fetch with OAuth bearer token | Centralize error handling and retries |
| popup/options ↔ shared state | storage + runtime messages | Keep settings independent from NotebookLM page context |

## Sources

- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- https://developer.chrome.com/docs/extensions/reference/api/identity
- https://developers.google.com/workspace/docs/api/reference/rest
- https://developers.google.com/docs/api/how-tos/documents
- https://developers.google.com/workspace/drive/api/guides/create-file
- https://support.google.com/notebooklm/answer/16262519?hl=en

---
*Architecture research for: NotebookLM companion extension*
*Researched: 2026-03-03*
