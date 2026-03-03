# NotebookL++

## What This Is

NotebookL++ is a browser extension built on top of the existing "Add to NotebookLM" project and expanded into a fuller companion tool for NotebookLM users. It should keep the original strength of importing hard-to-capture content into NotebookLM, while adding in-product actions inside the NotebookLM UI itself. The first major addition is fast export of selected NotebookLM notes into Google Docs on Google Drive through simple note checkboxes and a one-click export action.

## Core Value

Make NotebookLM materially more operable by adding missing bulk actions directly into the NotebookLM interface, starting with frictionless export of selected notes to Google Docs.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Users can select notes directly inside the NotebookLM interface via injected checkboxes.
- [ ] Users can export selected notes with one action into Google Docs on Google Drive.
- [ ] Exported notes preserve title and basic structure as closely as practical in v1.
- [ ] The extension remains useful as a NotebookLM companion, preserving and extending the original import-oriented capabilities rather than replacing them.

### Out of Scope

- Bidirectional sync between NotebookLM and Google Docs/Drive — excluded from v1 to keep the first release focused on reliable one-way export.
- Export history, deduplication, and re-export management — excluded from v1 because downstream processing happens in the user's existing ObsidianDataWeave pipeline.
- Full support for exporting all NotebookLM entity types — excluded from v1; the first target is note export only, not sources, audio, or all artifact types.

## Context

The project starts from the open-source browser extension `add_to_NotebookLM`, which already helps users send content from pages like YouTube and difficult-to-parse websites into NotebookLM. The new direction is to evolve that base into a broader NotebookLM utility layer.

The first product goal is driven by a clear workflow gap: users can accumulate useful notes inside NotebookLM, but lack a fast way to select specific notes and push them into Google Drive for downstream automation and processing. In this workflow, NotebookL++ should do the extraction/export step, while later transformation and organization are handled by external pipelines such as ObsidianDataWeave via Claude Code or Codex.

The intended audience is broader than a single personal setup. v1 should therefore be designed as a generally useful NotebookLM enhancement for users who want direct in-UI batch actions, even if the earliest workflow inspiration comes from a specific personal pipeline.

## Constraints

- **Platform**: Browser extension on top of the current codebase — the product must evolve from the existing extension rather than being rebuilt as a separate web app.
- **Integration**: Operates inside NotebookLM UI — note selection and export actions must be available directly on the NotebookLM site.
- **Storage Target**: Google Docs on Google Drive — v1 export target is Google Docs, not markdown files or generic file export.
- **Scope**: One-way export only — keep v1 narrow enough to ship and validate before adding sync/history/advanced document management.
- **Fidelity**: Preserve note shape where practical — title and basic structure should survive export as closely as possible in the first version.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build on the existing `add_to_NotebookLM` extension | It already solves part of the NotebookLM workflow and gives a working browser-extension base | — Pending |
| Prioritize note export before broader feature expansion | Export solves the most immediate workflow gap and defines the product direction clearly | — Pending |
| Use inline note checkboxes plus a one-click export button in NotebookLM | This is the lowest-friction UX for selecting and exporting multiple notes | — Pending |
| Export to Google Docs first | Google Docs fits the user's downstream Drive-based workflow better than raw markdown in v1 | — Pending |
| Design for broader NotebookLM users, not only a personal workflow | Prevents overfitting the product to one pipeline too early | — Pending |
| Exclude sync and export-history features from v1 | Keeps the first release focused and easier to validate | — Pending |

---
*Last updated: 2026-03-03 after initialization*
