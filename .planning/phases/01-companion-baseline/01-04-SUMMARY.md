---
phase: 01-companion-baseline
plan: 04
subsystem: testing
tags: [chrome-extension, smoke-tests, oauth2, chrome-storage, documentation]

# Dependency graph
requires:
  - phase: 01-companion-baseline
    provides: "Brand continuity, export auth facade, and popup/settings auth messaging from plans 01-01 through 01-03"
provides:
  - "Static smoke checks for NotebookLM++ brand continuity and export-auth wiring"
  - "Static smoke checks that forbid raw Google credential persistence in extension storage"
  - "Phase 1 state tracking for drive.file auth scope, storage boundaries, and remaining debugger permission caveat"
affects: [phase-1, testing, auth, storage, readme]

# Tech tracking
tech-stack:
  added: []
  patterns: [repo-local node smoke checks, static storage-boundary assertions]

key-files:
  created: [.planning/phases/01-companion-baseline/01-04-SUMMARY.md, tests/phase1-brand-auth-smoke.mjs, tests/phase1-storage-boundary-smoke.mjs]
  modified: [README.md, .planning/STATE.md]

key-decisions:
  - "Kept Phase 1 verification static and Node-runnable so baseline regressions can be caught without a browser harness."
  - "Treated raw token persistence and raw OAuth payload returns as separate smoke-check failures to protect the export-auth boundary."
  - "Recorded the retained debugger permission as an explicit trust tradeoff instead of hiding it in implementation details."

patterns-established:
  - "Phase-end baseline checks should live in repo-local smoke scripts that run with plain node."
  - "Export auth verification must assert sanitized storage and message contracts, not just happy-path UI presence."

requirements-completed: [BASE-01, BASE-02, GEXP-04]

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 1: Companion Baseline Summary

**Phase 1 now closes with direct Node smoke coverage for NotebookLM++ brand continuity, export-auth message wiring, and the rule that raw Google credentials never enter extension storage.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-03T13:36:17Z
- **Completed:** 2026-03-03T13:39:12Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added a repo-local smoke script that checks manifest branding, `identity` plus `drive.file`, import-facing UI continuity, and export-auth command wiring.
- Added a second smoke script that fails on token-like storage writes and on unsanitized export-auth payloads crossing storage or UI boundaries.
- Documented the verification commands in `README.md` and updated project state with the final Phase 1 auth/storage decisions and the remaining `debugger` permission caveat.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add static smoke checks for brand continuity and auth baseline wiring** - `b63dfdc` (test)
2. **Task 2: Add storage-boundary smoke checks and record final Phase 1 state** - `9f02dc9` (test)

**Plan metadata:** `[pending]` (docs: complete plan)

## Files Created/Modified
- `.planning/phases/01-companion-baseline/01-04-SUMMARY.md` - Plan execution summary with verification and commit status
- `tests/phase1-brand-auth-smoke.mjs` - Static baseline check for branding, import continuity, and auth command wiring
- `tests/phase1-storage-boundary-smoke.mjs` - Static boundary check against raw credential persistence or return payload leaks
- `README.md` - Added direct Node commands for Phase 1 smoke verification
- `.planning/STATE.md` - Recorded final Phase 1 status, `drive.file` auth boundary, and remaining permission caveat

## Decisions Made
- Used static repository assertions instead of browser-driven smoke automation so the Phase 1 baseline stays fast and machine-runnable in any environment with Node.
- Verified both storage writes and returned auth payloads because protecting only persisted state would still allow raw OAuth material to leak into UI contexts.
- Marked the `debugger` permission as a deliberate carryover from the PDF import workflow so future planning can revisit it explicitly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The repository ignores `tests/`, so the smoke scripts required `git add -f` during commit. Commit automation still succeeded and the owned files were committed without touching unrelated changes.

## User Setup Required

None - no new external service configuration required in this plan. Live export auth still depends on the OAuth client setup already noted in `01-02-SUMMARY.md`.

## Next Phase Readiness

Phase 1 now has a machine-runnable baseline that checks brand continuity, auth command presence, and storage safety without relying on manual memory.
Phase 2 can build NotebookLM note-selection UX on top of this baseline while keeping the official auth and storage boundaries intact.

## Self-Check: PASSED

---
*Phase: 01-companion-baseline*
*Completed: 2026-03-03*
