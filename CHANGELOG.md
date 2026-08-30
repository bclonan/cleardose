# Changelog

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
