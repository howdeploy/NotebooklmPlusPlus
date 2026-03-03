# Project Research Summary

**Project:** NotebookL++
**Domain:** NotebookLM companion browser extension
**Researched:** 2026-03-03
**Confidence:** HIGH

## Executive Summary

NotebookL++ is best treated as a NotebookLM companion extension, not a generic Google Drive exporter. The product should augment the NotebookLM web UI directly, extract selected note content through content scripts, and hand export orchestration to an MV3 service worker that uses official Google OAuth and Docs/Drive APIs.

Research also surfaced an important product correction: NotebookLM already supports exporting notes to Google Docs and Google Sheets from its own UI. That means the v1 opportunity is not “add export to NotebookLM,” but “add a much faster selective batch-export workflow that fits power-user pipelines.” The roadmap should therefore prioritize precise note selection, resilient NotebookLM integration, and low-friction Google Docs creation over broader scope like sync or exporting every NotebookLM artifact type.

- Build as a Chrome MV3 extension with strong separation between NotebookLM page logic and Google API orchestration
- Use official `chrome.identity` auth and narrow Drive/Docs scopes
- Treat NotebookLM DOM integration as the biggest operational risk

## Key Findings

### Recommended Stack

The recommended stack is MV3 + TypeScript + `chrome.scripting` for page augmentation, backed by `chrome.identity` and Google Docs/Drive APIs for export. This is the most maintainable path for a public-facing extension and avoids risky dependence on token scraping for Drive features.

**Core technologies:**
- Manifest V3: required extension platform and service-worker architecture
- `chrome.scripting`: runtime UI injection into NotebookLM
- `chrome.identity`: official OAuth token acquisition for Google APIs
- Google Docs API: create and structure exported note documents
- Google Drive API: later placement/organization of created Docs when needed

### Expected Features

The must-have set is narrow and clear: checkbox-based note selection in NotebookLM, one-click export of selected notes to Google Docs, basic output fidelity, and visible success/error feedback. Existing import-oriented capabilities from the base project remain strategically useful but should not distract from the new export path.

**Must have (table stakes):**
- Select notes directly in NotebookLM
- Export selected notes to Google Docs
- Preserve note title and basic structure
- Explain auth and report export results clearly

**Should have (competitive):**
- Better selective workflow than native NotebookLM export
- Batch result reporting for downstream automation
- Product identity as a broader NotebookLM operations layer

**Defer (v2+):**
- Sync back from Docs to NotebookLM
- Export history/deduplication
- Non-note artifact export

### Architecture Approach

The architecture should separate concerns cleanly: content scripts own DOM observation and note extraction, the service worker owns auth and export jobs, and a normalized note model sits between them. This preserves flexibility if NotebookLM markup changes and keeps Google API code away from brittle UI logic.

**Major components:**
1. NotebookLM integration layer — detects notes, injects checkboxes, captures selected note content
2. Export orchestration layer — manages jobs, retries, and user-visible results
3. Google auth/API layer — obtains OAuth tokens and creates/writes Google Docs
4. Shared data contracts — note model, runtime messages, export result model

### Critical Pitfalls

1. **Mistaking the product gap** — avoid rebuilding export generically; focus on selective batch UX
2. **NotebookLM DOM fragility** — centralize selectors and add compatibility tests
3. **Wrong auth strategy** — use `chrome.identity`, not harvested page credentials
4. **MV3 service-worker state loss** — design export jobs to be restart-safe
5. **Overpromised fidelity** — define supported formatting clearly for v1

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Product Reframe and Export Contract
**Rationale:** Requirements must reflect the real differentiation from native NotebookLM export.
**Delivers:** Clear requirements, supported note model, permission strategy
**Addresses:** Product-scope clarity and fidelity definition
**Avoids:** Building the wrong feature set

### Phase 2: NotebookLM Note Selection Integration
**Rationale:** No export matters until note selection inside NotebookLM is reliable.
**Delivers:** Note discovery, checkbox injection, selection state handling
**Uses:** MV3 content scripts and `chrome.scripting`
**Implements:** NotebookLM integration component

### Phase 3: Google Auth and Docs Export Pipeline
**Rationale:** Official OAuth and Docs creation are the core export path.
**Delivers:** Extension OAuth flow, Docs creation, content rendering, result reporting
**Uses:** `chrome.identity`, Docs API, narrow Drive scopes
**Implements:** Auth/API and export orchestration components

### Phase 4: Resilience, UX Feedback, and Validation
**Rationale:** DOM drift and MV3 lifecycle issues can make a demo look good but fail in real use.
**Delivers:** Retry/recovery behavior, better status UI, smoke tests on real NotebookLM flows
**Avoids:** Silent failures and brittle releases

### Phase Ordering Rationale

- Selection must come before export because it defines the core payload model.
- Official auth must come before advanced Drive behaviors to avoid locking in a brittle implementation.
- Resilience and testing need their own explicit phase because this domain breaks mainly at integration seams, not isolated functions.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** NotebookLM DOM patterns and selector stability need real-page validation
- **Phase 3:** Exact Google Docs rendering strategy for NotebookLM note structures may need focused API research

Phases with standard patterns (skip research-phase):
- **Phase 1:** Product framing and requirement scoping are already clear

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on official Chrome and Google API docs |
| Features | HIGH | Strongly grounded, including current NotebookLM help docs |
| Architecture | HIGH | Standard MV3 separation plus clear domain-specific adaptation |
| Pitfalls | HIGH | Risks are concrete and strongly implied by platform constraints |

**Overall confidence:** HIGH

### Gaps to Address

- Exact NotebookLM DOM representation of notes must be validated against the live product during implementation
- The best v1 mapping from NotebookLM note content to Docs formatting should be tested on representative note shapes

## Sources

### Primary (HIGH confidence)
- https://developer.chrome.com/docs/extensions/reference/api/identity — extension OAuth flow
- https://developer.chrome.com/docs/extensions/reference/manifest/oauth2 — manifest OAuth config
- https://developer.chrome.com/docs/extensions/reference/api/scripting — MV3 injection model
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle — service worker behavior and persistence constraints
- https://developer.chrome.com/docs/extensions/reference/api/storage — storage recommendations and token handling implications
- https://developers.google.com/workspace/docs/api/reference/rest — Docs API surface
- https://developers.google.com/docs/api/how-tos/documents — Docs creation and folder-placement details
- https://developers.google.com/workspace/drive/api/guides/create-file — Drive file creation
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth — Drive scope recommendations
- https://support.google.com/notebooklm/answer/16262519?hl=en — current NotebookLM note/export capabilities

### Secondary (MEDIUM confidence)
- https://support.google.com/notebooklm/answer/16215270?hl=en — current source-import behavior and limitations

---
*Research completed: 2026-03-03*
*Ready for roadmap: yes*
