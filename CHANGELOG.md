# Changelog

## Unreleased

### Added

- Programmatic Replay controls on demo cards, including run, pause, resume, single-step, restart, reset, request and response inspection, timing, highlights, and bounded state changes.
- A WebMCP Explorer at `/#/demo` with live registration status, schemas, example requests, typed errors, related tools, linked scenarios, and a local Try It console.
- A persistent Live State Inspector with branching graphs, chronological event history, valid and human-only actions, versioned dispatch, transition explanations, and reset without erasing history.
- Explicit comparison relationships plus seeded provider, location, inventory, pricing, and delivery data. Unrelated medications now fail with a structured recovery path.
- Human, voice, and advanced prompt variants for each programmatic scenario.
- Eleven built-in imperative tools for compatibility, availability, delivery, and workflow state interaction.

### Changed

- Replaced the timed shortcut simulation with replay calls that use the same local tool handlers as WebMCP registration.
- Expanded the canonical catalog from 22 to 34 built-in capabilities: 25 imperative tools and nine declarative forms.
- Price and fulfillment comparisons now start from explicit compatibility data and explain why each option may be compared.
- Demo failures return typed codes, retryability, a recommended next tool, and bounded recovery input when recovery is possible.

### Safety

- All provider, location, inventory, delivery, insurance estimate, price, and clinical sample data remains fictional and local.
- Comparison relationships never claim therapeutic equivalence or recommend substitution.
- Workflow dispatch rejects stale versions, duplicate request ids, invalid transitions, and human-only actions. Checkout, review, export, and external contact remain under visible human control.
- Replay observations are bounded to declared application state and stable DOM targets. They do not capture page text, passwords, real health information, or external browser state.

## 0.3.0, 2026-08-30

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

## 0.2.0, 2026-08-30

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
