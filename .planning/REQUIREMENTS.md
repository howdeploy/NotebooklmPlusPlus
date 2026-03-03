# Requirements: NotebookL++

**Defined:** 2026-03-03
**Core Value:** Make NotebookLM materially more operable by adding missing bulk actions directly into the NotebookLM interface, starting with frictionless export of selected notes to Google Docs.

## v1 Requirements

Requirements for the initial release. Each maps to roadmap phases.

### Notebook Integration

- [ ] **NINT-01**: User can see extension-injected checkboxes on exportable notes inside the NotebookLM interface.
- [ ] **NINT-02**: User can select multiple notes inside NotebookLM and keep that selection stable through normal UI rerenders during the export flow.
- [ ] **NINT-03**: User can trigger export of the currently selected notes from a visible action inside NotebookLM.
- [ ] **NINT-04**: User can clearly distinguish the extension’s selected-note export action from NotebookLM’s native export actions.

### Google Export

- [ ] **GEXP-01**: User can authorize the extension to create Google Docs using an official Google account flow appropriate for Chrome extensions.
- [ ] **GEXP-02**: User can export each selected NotebookLM note as a separate Google Doc on Google Drive.
- [ ] **GEXP-03**: Exported Google Docs preserve the note title and basic note structure closely enough to remain readable without manual reconstruction.
- [ ] **GEXP-04**: User can complete export without granting broader Drive access than is required for the feature.

### Export Feedback

- [ ] **EXFB-01**: User can see whether an export is in progress, completed, or failed.
- [ ] **EXFB-02**: User can see how many selected notes were exported successfully and how many failed.
- [ ] **EXFB-03**: User can access the created Google Docs, or otherwise receive enough result information to use them in a downstream workflow.

### Product Baseline

- [ ] **BASE-01**: Existing import-oriented capabilities from the base `add_to_NotebookLM` extension remain available and are not regressed by the new export feature set.
- [ ] **BASE-02**: The extension stores only the minimum state needed for settings and export workflow operation, without persisting sensitive Google API credentials in inappropriate storage.

## v2 Requirements

### Selection Enhancements

- **SELE-01**: User can select all exportable notes in the current NotebookLM view with one action.
- **SELE-02**: User can use richer bulk-selection modes such as select visible, deselect all, or select by note type.

### Drive Organization

- **DRIV-01**: User can choose a destination folder on Google Drive before export.
- **DRIV-02**: User can apply a consistent naming convention or prefix to exported docs.
- **DRIV-03**: User can generate a summary document for a batch export.

### Export Management

- **EXMG-01**: User can see export history for previous batches.
- **EXMG-02**: User can avoid accidental duplicate export of the same note through deduplication or explicit warnings.
- **EXMG-03**: User can retry only the failed notes from a previous export batch.

### Expanded Scope

- **XPRT-01**: User can export NotebookLM entities beyond notes, such as selected source-derived artifacts, where technically feasible.
- **SYNC-01**: User can synchronize or re-export note changes intentionally, with clear ownership rules.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full bidirectional sync between NotebookLM and Google Docs | Too large and risky for the first release; not required to validate the product direction |
| Export of all NotebookLM artifact types | v1 is focused on notes only so the data model stays manageable |
| Drive folder picker in launch version | Useful, but not necessary for the core selected-note export workflow |
| “Select all” and advanced bulk-selection modes | Helpful but not essential for the first validation release |
| Major redesign of the legacy import feature set | This cycle is about preserving existing import value while adding export capability |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NINT-01 | Phase 2 | Pending |
| NINT-02 | Phase 2 | Pending |
| NINT-03 | Phase 2 | Pending |
| NINT-04 | Phase 2 | Pending |
| GEXP-01 | Phase 1 | Pending |
| GEXP-02 | Phase 3 | Pending |
| GEXP-03 | Phase 3 | Pending |
| GEXP-04 | Phase 1 | Pending |
| EXFB-01 | Phase 4 | Pending |
| EXFB-02 | Phase 4 | Pending |
| EXFB-03 | Phase 4 | Pending |
| BASE-01 | Phase 1 | Pending |
| BASE-02 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after roadmap creation*
