# Phase 1: Companion Baseline - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 preserves the existing import-oriented value of the extension while establishing a safe baseline for future export work. This phase does not add note-export UX yet; it clarifies branding, continuity, and baseline trust/state expectations around the existing product surface.

</domain>

<decisions>
## Implementation Decisions

### Legacy UX continuity
- The product name used in Phase 1 should be `NotebookLM++`.
- The current popup remains the main user entry point for existing import-oriented capabilities.
- Existing import flows should remain functionally intact; Phase 1 should avoid changing familiar behavior unless required for baseline safety or product framing.

### Rebranding scope
- Rebranding in Phase 1 should be light-touch: text, descriptions, labels, and small visual accents can change.
- The familiar popup/app layout should remain largely intact; do not do a major facelift or navigation reshuffle in this phase.
- Existing import capabilities may be described softly as part of the companion tool, but should not be framed as an obsolete “legacy mode.”

### Product messaging
- The popup/app copy should be utilitarian rather than marketing-heavy.
- Users should primarily see the product as `NotebookLM++`, not as a transitional rename explanation from the old extension.
- The interface should include one short line that makes it clear the current import tools remain available and working.
- Phase 1 should not hint at upcoming export functionality in the UI; avoid teasing buttons, roadmap hints, or “coming soon” messaging.

### Success bar for this phase
- From a user-facing perspective, success means the familiar import workflow still feels intact.
- The new product identity should be visible, but not at the cost of introducing confusion or friction into existing flows.

### Claude's Discretion
- Exact copywriting for the short continuity line.
- Exact placement of the new `NotebookLM++` brand within popup/app surfaces.
- Specific iconography or accent updates, as long as they stay within a light-touch rebrand.

</decisions>

<specifics>
## Specific Ideas

- Keep the product utilitarian and operational, not over-positioned.
- Use the new brand immediately as `NotebookLM++`.
- Avoid explicit transition messaging like “formerly Add to NotebookLM” unless planning later proves it is needed for trust or discoverability.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- [popup/popup.js](/home/kosya/vibecoding/notebooklplusplus/popup/popup.js#L30): the popup already acts as the main operational entry point with notebook/account loading, add actions, and status messaging.
- [app/app.js](/home/kosya/vibecoding/notebooklplusplus/app/app.js#L576): the internal app/settings surface already holds account, theme, and feature toggles, so it can absorb light-touch product framing without new architecture.
- [background.js](/home/kosya/vibecoding/notebooklplusplus/background.js#L495): install-time defaults and context menu setup already provide a baseline place to preserve existing behavior while Phase 1 introduces safer auth/state patterns.

### Established Patterns
- [manifest.json](/home/kosya/vibecoding/notebooklplusplus/manifest.json#L9): the extension currently depends on `tabs`, `storage`, `activeTab`, `scripting`, `contextMenus`, and `debugger`, so Phase 1 baseline work should explicitly review which of these remain justified.
- [background.js](/home/kosya/vibecoding/notebooklplusplus/background.js#L29): NotebookLM access currently relies on extracting page tokens from NotebookLM HTML, which is an important trust/baseline constraint for future export auth design.
- [background.js](/home/kosya/vibecoding/notebooklplusplus/background.js#L283): account selection currently leans on Google account-list parsing, so Phase 1 planning should account for continuity between existing account UX and future official auth.
- [background.js](/home/kosya/vibecoding/notebooklplusplus/background.js#L455): PDF export currently uses the strong `debugger` permission; baseline planning should decide whether that permission remains acceptable in the companion trust model.
- [popup/popup.js](/home/kosya/vibecoding/notebooklplusplus/popup/popup.js#L155): the popup already surfaces account context, which makes it the natural place to preserve continuity while rebranding carefully.

### Integration Points
- Main user continuity point: [popup/popup.js](/home/kosya/vibecoding/notebooklplusplus/popup/popup.js#L30)
- Secondary product/settings framing point: [app/app.js](/home/kosya/vibecoding/notebooklplusplus/app/app.js#L583)
- Baseline auth/state logic anchor: [background.js](/home/kosya/vibecoding/notebooklplusplus/background.js#L25)
- Permission scope anchor: [manifest.json](/home/kosya/vibecoding/notebooklplusplus/manifest.json#L9)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-companion-baseline*
*Context gathered: 2026-03-03*
