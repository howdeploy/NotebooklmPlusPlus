# Feature Research

**Domain:** NotebookLM companion browser extension
**Researched:** 2026-03-03
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Reliable page-context augmentation | If this is a NotebookLM companion, actions must appear where users already work | MEDIUM | Needs resilient selectors and fallback UI placement. |
| Multi-select note actions | User asked for checkbox-driven selection; without it the product does not solve the core workflow gap | MEDIUM | Selection state must survive NotebookLM rerenders. |
| One-click export of selected notes to Google Docs | Core value of the product | MEDIUM | Need per-note or batched document strategy and user-visible success state. |
| Basic export fidelity (title + structure) | Raw text dump feels broken for knowledge work | MEDIUM | First version can map headings, paragraphs, lists, and simple separators. |
| Clear error and completion feedback | Export flows fail silently too often in extensions | LOW | Show counts, failures, and links to created Docs. |
| Permission clarity | Users are cautious with Google-connected extensions | LOW | UI should explain why Drive/Docs auth is requested. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Export only selected notes, not the whole note set | Improves NotebookLM’s existing export UX by matching user intent at finer granularity | MEDIUM | Important because NotebookLM already has native note export, but not this exact workflow. |
| Batch export with post-export artifact list | Makes NotebookLM part of a larger pipeline | MEDIUM | Return created Doc links/IDs for downstream automation. |
| Bridge between import and export workflows | Extends the original add-to-NotebookLM extension into a fuller companion tool | HIGH | Product story becomes “NotebookLM operations layer,” not just importer. |
| Pluggable downstream actions later | Makes room for Drive folder routing, metadata tagging, or pipeline handoff later | HIGH | Do not overbuild in v1, but preserve architecture seam. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full bidirectional sync between NotebookLM and Docs | Sounds powerful and “complete” | Hard to reason about ownership, conflicts, and NotebookLM semantics; much larger auth and product surface | One-way export in v1 |
| Broad “export everything in NotebookLM” | Feels like maximum capability | Blurs scope across notes, sources, audio, reports, and other artifacts with different data models | Start with notes only |
| Hidden background export with no user confirmation | Feels convenient | Dangerous for permissions, discoverability, and trust | Explicit user-triggered export from NotebookLM UI |
| Raw HTML mirroring of NotebookLM DOM | Fast to implement initially | Brittle and likely to degrade output quality as NotebookLM markup shifts | Normalize to an internal note model before rendering to Docs |

## Feature Dependencies

```text
Selectable note UI
    └──requires──> NotebookLM DOM detection
                         └──requires──> resilient content script lifecycle

Google Docs export
    └──requires──> Google OAuth in extension
                         └──requires──> manifest oauth2 + identity permission

Batch export feedback
    └──requires──> export job state model

Original import capabilities
    └──enhances──> product positioning as full NotebookLM companion

Bidirectional sync ──conflicts──> quick, low-risk v1 scope
```

### Dependency Notes

- **Selectable note UI requires NotebookLM DOM detection:** without stable note discovery, every user-facing action becomes fragile.
- **Google Docs export requires OAuth:** official Drive/Docs APIs are the maintainable path for public distribution.
- **Batch export feedback requires job state:** users need to know which notes became which Docs.
- **Bidirectional sync conflicts with MVP:** it changes the product from “operational companion” into “synchronization platform.”

## MVP Definition

### Launch With (v1)

- [ ] Detect note cards/items in NotebookLM and add checkbox-based selection
- [ ] Provide a visible “Export selected to Google Docs” action in NotebookLM
- [ ] Authenticate with Google APIs using extension-native OAuth
- [ ] Create one Google Doc per selected note with title and basic content structure preserved
- [ ] Show export result summary with links or counts for created Docs

### Add After Validation (v1.x)

- [ ] Export all notes with one action — if users repeatedly select everything manually
- [ ] Optional folder targeting in Drive — if downstream organization becomes a repeated pain point
- [ ] Export deduplication/history — if repeated exports become hard to track

### Future Consideration (v2+)

- [ ] Export sources and other NotebookLM artifact types — after note export stabilizes
- [ ] Sync/re-export workflows — only if strong demand justifies complexity
- [ ] Pipeline hooks for external systems — if the product becomes more than a NotebookLM UI layer

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Checkbox note selection | HIGH | MEDIUM | P1 |
| Selected-note Docs export | HIGH | MEDIUM | P1 |
| OAuth-driven Google API auth | HIGH | MEDIUM | P1 |
| Export result feedback | HIGH | LOW | P1 |
| Export all notes | MEDIUM | LOW | P2 |
| Drive folder targeting | MEDIUM | MEDIUM | P2 |
| Export history | MEDIUM | MEDIUM | P2 |
| Sync back to NotebookLM | LOW for MVP | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | NotebookLM native | Existing add_to_NotebookLM | Our Approach |
|---------|-------------------|----------------------------|--------------|
| Import external content | Yes for supported inputs, with limits | Strong at “send to NotebookLM” workflows | Preserve and extend existing capability |
| Export notes to Docs | Yes, NotebookLM already supports Docs/Sheets export from notes UI | No | Focus on faster selective batch export workflow |
| Fine-grained multi-select export UX | Partial at best from current public help surface | No | Make selected-note export explicit and fast |
| NotebookLM in-page bulk actions | Some native quick actions exist | Limited to source-side utilities | Expand with companion controls inside NotebookLM |

## Sources

- NotebookLM Help: https://support.google.com/notebooklm/answer/16262519?hl=en
- NotebookLM Help: https://support.google.com/notebooklm/answer/16215270?hl=en
- Existing project context: /home/kosya/vibecoding/notebooklplusplus/.planning/PROJECT.md

---
*Feature research for: NotebookLM companion extension*
*Researched: 2026-03-03*
