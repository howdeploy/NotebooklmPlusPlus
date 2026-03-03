# Roadmap: NotebookL++

## Overview

NotebookL++ moves from a narrow import helper to a broader NotebookLM companion by preserving the original import value, adding reliable in-product note selection, exporting selected notes to Google Docs through official Google auth, and finishing with result feedback that makes the batch workflow usable in real downstream pipelines.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Companion Baseline** - Preserve the legacy import value while establishing safe extension auth and state boundaries for export.
- [ ] **Phase 2: NotebookLM Selection Workflow** - Add resilient note selection controls directly inside the NotebookLM UI.
- [ ] **Phase 3: Google Docs Export Pipeline** - Turn selected NotebookLM notes into readable Google Docs on Drive.
- [ ] **Phase 4: Export Results UX** - Make batch export progress and outcomes actionable for real user workflows.

## Phase Details

### Phase 1: Companion Baseline
**Goal**: Users can adopt NotebookL++ as a safe NotebookLM companion without losing the original import-oriented extension value.
**Depends on**: Nothing (first phase)
**Requirements**: BASE-01, BASE-02, GEXP-01, GEXP-04
**Success Criteria** (what must be TRUE):
  1. User can still access the extension's existing import-oriented capabilities after the export feature set is introduced.
  2. User can start and complete Google authorization through an official Chrome extension account flow instead of manual credential handling.
  3. User can approve export with only the minimum Google access required to create Docs on Drive.
  4. User can return to the extension and continue using its settings/export workflow state without raw Google credentials being exposed or manually re-entered.
**Plans**: TBD

Plans:
- [ ] 01-01: TBD

### Phase 2: NotebookLM Selection Workflow
**Goal**: Users can clearly select exactly which NotebookLM notes they want to export from inside the NotebookLM interface.
**Depends on**: Phase 1
**Requirements**: NINT-01, NINT-02, NINT-03, NINT-04
**Success Criteria** (what must be TRUE):
  1. User can see extension-injected checkboxes on exportable NotebookLM notes.
  2. User can select multiple notes and keep those selections intact through normal NotebookLM rerenders during the export flow.
  3. User can trigger export for the current selection from a visible in-product action.
  4. User can tell the extension's selected-note export action apart from NotebookLM's native export controls.
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Google Docs Export Pipeline
**Goal**: Users can export selected NotebookLM notes into separate, readable Google Docs with core note fidelity preserved.
**Depends on**: Phase 2
**Requirements**: GEXP-02, GEXP-03
**Success Criteria** (what must be TRUE):
  1. User can export each selected NotebookLM note as a separate Google Doc on Google Drive.
  2. User can open an exported doc and see the source note title preserved.
  3. User can open an exported doc and recognize the note's basic structure without manual reconstruction.
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Export Results UX
**Goal**: Users can understand export progress, know what succeeded or failed, and reach the produced documents for downstream use.
**Depends on**: Phase 3
**Requirements**: EXFB-01, EXFB-02, EXFB-03
**Success Criteria** (what must be TRUE):
  1. User can see when a batch export is in progress and whether it finishes successfully or with failures.
  2. User can see how many selected notes exported successfully and how many failed in the same run.
  3. User can open the created Google Docs, or otherwise receive enough result information to use the exported documents downstream.
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Companion Baseline | 0/TBD | Not started | - |
| 2. NotebookLM Selection Workflow | 0/TBD | Not started | - |
| 3. Google Docs Export Pipeline | 0/TBD | Not started | - |
| 4. Export Results UX | 0/TBD | Not started | - |
