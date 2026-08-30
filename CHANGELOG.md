# Changelog

## 0.3.0 — 2026-08-30

### Added

- `/#/studio` four-step Capability Studio for local document tools and deterministic workflows.
- Safe EJS-shaped renderer with escaped paths, bounded conditionals, closed inputs, prototype blocking, and no JavaScript evaluation.
- Persistent local template DAO, starter templates, explicit dynamic registration, import/export, preview, voice guidance, and generated human-review artifacts.
- Eighth declarative form capability plus `user-generated` tool category and dynamic workflow definitions in the live viewer.
- Regression tests for template safety, explicit registration, closed schemas, generated artifacts, and clipboard fallback.

### Changed

- Reworked prompt guide and shortcut cards around full human-language examples that can be read, spoken, copied, or played aloud.
- Standardized prompt, question-card, recovery, provider-note, and memory copy behavior on one resilient clipboard service.
- Polished shortcut actions and added a responsive three-pane Studio workbench.
- Expanded the canonical catalog from 21 to 22 built-in capabilities.
- Kept header actions inside common 1366-pixel desktop viewports and labeled the Studio import control.
- Normalized checkout input through a plain DTO so Vue proxies cannot break final mock-order creation.
- Added a bounded clipboard timeout and kept Studio starter identity through the first save to prevent duplicate-looking drafts.

### Safety

- Saving or previewing a user template never registers it; imports always return to draft and registration requires a separate visible action.
- User templates cannot run raw EJS or JavaScript and generated documents stop in human review.

## 0.2.0 — 2026-08-30

### Added

- Dedicated `/#/shortcuts` hackathon workbench with seven copyable single- and multi-step prompt chains.
- Timed visual shortcut analog, live machine contract pane, and DuckDB-backed event/context viewer.
- Canonical 21-capability catalog with categories, imperative/declarative tags, prompts, names, and machine ids.
- Generic dynamic machine API with required `role`, `situation`, and `step` scope.
- `cleardose_prepare_prescription_follow_up` and reusable editable recovery panel.
- `cleardose_prepare_agent_memory_packet` with explicit clipboard and File System Access/download export.
- LocalDrugIndexApi backed by seeded DuckDB-Wasm or the explicit memory adapter.
- Prescription-required negative fixture, capability-contract validation, and new eval/refusal cases.
- ADRs for capability naming/machine scope and human-controlled memory files.

### Changed

- Expanded the imperative WebMCP registry from 12 to 14 tools.
- Categorized the floating prompt guide and included seven declarative form capabilities.
- WebMCP transport now strips catalog-only metadata before browser registration.
- Tool flows record capability id, category, interaction type, and machine contract in bounded context.

### Safety

- Recovery results recommend a next tool instead of silently triggering an external side effect.
- Memory packets remain in human review until the user explicitly copies or saves them.

## 0.1.0

- Initial Vue 3 storefront, mock commerce journey, UDI, WebMCP tools, workflow lab, DuckDB-Wasm persistence, structured question-card exchange, and accessibility work.
