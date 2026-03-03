# Pitfalls Research

**Domain:** NotebookLM companion browser extension with Google Docs export
**Researched:** 2026-03-03
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Building the roadmap on a false product gap

**What goes wrong:**
The team assumes NotebookLM has no note export, then spends time rebuilding something users technically already have.

**Why it happens:**
NotebookLM capabilities move quickly and extension builders often work from memory instead of checking current help docs.

**How to avoid:**
Treat the v1 differentiation as selective, batch-oriented, in-page export UX rather than “export exists vs doesn’t exist.”

**Warning signs:**
Requirements say only “export notes to Docs” with no mention of selection, batching, or workflow improvement.

**Phase to address:**
Phase 1 planning and requirements traceability.

---

### Pitfall 2: DOM selectors break after NotebookLM UI changes

**What goes wrong:**
Checkboxes vanish, note extraction targets the wrong elements, or export silently acts on empty content.

**Why it happens:**
NotebookLM is a third-party app with no stability guarantees for CSS classes or component structure.

**How to avoid:**
Centralize selectors, detect capabilities before rendering controls, and build E2E smoke tests around representative notebook pages.

**Warning signs:**
Frequent null selectors, empty note arrays, UI controls appearing in wrong locations, or support reports after NotebookLM releases.

**Phase to address:**
Foundational NotebookLM integration phase.

---

### Pitfall 3: Choosing the wrong auth path for Google APIs

**What goes wrong:**
The extension leans on borrowed cookies or page tokens for Drive/Docs export and becomes brittle, hard to review, or unsafe.

**Why it happens:**
The existing project already talks to Google web surfaces through page-derived tokens, which can tempt reuse for unrelated APIs.

**How to avoid:**
Use official extension OAuth via `chrome.identity` plus narrow Google API scopes for Docs/Drive export.

**Warning signs:**
Drive export code depends on scraping tokens from NotebookLM/Google HTML or stores long-lived tokens in local/sync storage.

**Phase to address:**
Authentication and Google API integration phase.

---

### Pitfall 4: Service worker loses long-running export state

**What goes wrong:**
Batch export appears to stall or loses progress because the MV3 service worker is suspended mid-flow.

**Why it happens:**
MV3 service workers are event-driven and can terminate after inactivity; global variables are not durable.

**How to avoid:**
Persist job state needed for recovery, keep export operations chunked, and design for restart-safe progress updates.

**Warning signs:**
Exports succeed partially, polling returns “no job found,” or rerunning the same export causes duplicate docs without explanation.

**Phase to address:**
Export orchestration phase.

---

### Pitfall 5: Overpromising fidelity in v1

**What goes wrong:**
The product claims near-perfect NotebookLM note preservation but delivers malformed Docs for complex content.

**Why it happens:**
NotebookLM notes can contain generated structures, formatting, and mixed content that are nontrivial to map exactly.

**How to avoid:**
Define a realistic v1 fidelity target: titles, headings, paragraphs, and simple lists preserved; advanced structures handled explicitly later.

**Warning signs:**
Requirements talk about “exact export” without enumerating supported block types.

**Phase to address:**
Requirements and export-rendering phase.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-coding NotebookLM selectors inline | Faster first implementation | Painful breakage when UI changes | Only during very early spike work |
| Keeping the whole codebase as ad hoc JS | No migration cost today | Rising bug rate across contexts and messages | Acceptable briefly if TypeScript migration is phased |
| Reusing `debugger` permission for unrelated scraping | Convenient access to more browser internals | Larger trust/security burden and harder review | Never for standard note export |
| Writing Docs content as one flat text blob | Quick initial success | Weak output quality and harder future formatting upgrades | Acceptable only in prototype, not launch v1 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| NotebookLM DOM | Assuming classes/structure are stable | Capability detection plus selector registry |
| Chrome Identity | Requesting broad scopes too early | Ask only for scopes needed for current export feature |
| Google Docs API | Creating document but not structuring content via `batchUpdate` | Build a renderer that emits ordered Docs requests |
| Google Drive API | Requesting broad Drive access for simple file creation | Prefer `drive.file` and expand only if required |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recomputing all notes on every DOM mutation | UI lag in NotebookLM and duplicate controls | Debounce observers and scope scans to relevant containers | Breaks quickly on large notebooks |
| Exporting many notes in one giant operation with no chunking | Timeouts, unclear failures, service worker resets | Export per note or in small batches with resumable status | Breaks as note count/content grows |
| Excessive polling for progress | Battery/CPU overhead and noisy logs | Use moderate polling cadence and short-lived job state | Noticeable on repeated exports |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing OAuth access tokens in sync/local storage | Token exposure and poor data hygiene | Keep tokens in Chrome identity cache or session memory |
| Requesting restricted Drive scopes without need | More invasive permissions and verification burden | Use narrow scopes first |
| Injecting unsanitized rich HTML into extension UIs | XSS risk inside extension pages | Sanitize or normalize before rendering |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Invisible distinction between native NotebookLM export and extension export | Users do not understand value or trust the new button | Label the extension action clearly around selected-note workflow |
| No per-note success/failure feedback | Users cannot tell what exported | Return counts and doc links or note-level status |
| Checkboxes that disappear on rerender | Product feels broken and random | Reconciliation logic tied to NotebookLM mutations |

## "Looks Done But Isn't" Checklist

- [ ] **Note selection:** Often missing rerender resilience — verify checkboxes survive NotebookLM UI updates during normal use
- [ ] **Docs export:** Often missing meaningful structure — verify headings, paragraphs, and lists render correctly
- [ ] **OAuth flow:** Often missing re-consent/error paths — verify first-run auth, cancelled auth, and expired token flows
- [ ] **Batch export:** Often missing duplicate-prevention behavior — verify repeated clicks do not create accidental duplicate storms
- [ ] **Trust UX:** Often missing permission explanation — verify users understand why Google auth is requested

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Broken selectors after NotebookLM change | MEDIUM | Patch selector registry, add regression test, ship update |
| Failed OAuth/session state | LOW | Clear cached token, re-prompt via explicit user action, retry export |
| Partial export batch | MEDIUM | Return created docs list, surface failed notes, allow retry for failed subset |
| Overbroad initial scope | HIGH | Reduce scopes, update consent text, rework auth implementation |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| False product gap | Phase 1 | Requirements explicitly differentiate from native NotebookLM export |
| DOM selector fragility | Phase 2 | Smoke tests and selector abstraction pass on real NotebookLM pages |
| Wrong auth path | Phase 3 | Export works via `chrome.identity` and documented scopes only |
| Service worker state loss | Phase 4 | Batch export survives realistic delays and reports recoverable status |
| Overpromised fidelity | Phase 4 | Export quality matches declared supported block types |

## Sources

- https://support.google.com/notebooklm/answer/16262519?hl=en
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- https://developer.chrome.com/docs/extensions/reference/api/identity
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth

---
*Pitfalls research for: NotebookLM companion extension*
*Researched: 2026-03-03*
