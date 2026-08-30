# ClearDose Agent Guide

## Mission

Build and extend **ClearDose — Transparent prescriptions, agent-ready.** as a fictional, local-only prescription commerce sandbox. Preserve the full patient journey while making every meaningful action reusable by both Vue components and WebMCP tools.

## Non-negotiable boundaries

- Never connect this demo to a real pharmacy, prescriber, payment processor, insurance plan, or patient record.
- Never request or persist real protected health information. All identities, prescriptions, prices, credentials, and transactions are fictional.
- Keep the visible sandbox disclaimers and avoid language that implies clinical advice or fulfillment.
- Do not expose passwords through DTOs, Pinia state, tool results, logs, or UI components.

## Architecture rules

- Pages orchestrate presentation only. They may call Pinia actions and read DTOs; they must not read `localStorage`, import seed data, or contain persistence logic.
- Pinia is the reactive application boundary. All mutations flow `component/tool → Pinia action → ClearDoseFacade → repository adapter → API service → DAO`.
- The facade is framework-independent and is the only high-level API consumed by stores or integrations.
- Raw server-like behavior and fictional fixtures belong only in `src/services/api`. Repositories adapt that API, the DAO owns serialization, and DTO mappers sanitize data crossing into the application layer.
- Keep normalized drug identity, deterministic fictional offers, related-record groups, synthetic interaction fixtures, and procurement planning centralized in `src/services/api/udi`. Do not duplicate UDI rules in pages, Pinia, or WebMCP definitions.
- Keep workflow definitions, negative fixtures, and structured-exchange contracts in `src/services/api`; runtime coordination belongs in `src/services/workflows`, and persistence belongs in `src/infrastructure/persistence`.
- Every observed transition must have a unique event id, an explicit source, a valid definition state, and a bounded context snapshot. Never record passwords, real health information, or unrestricted page content.
- DuckDB-Wasm/OPFS is the primary event store. Preserve the explicit memory fallback and cross-tab `BroadcastChannel` path; a database failure must not break the patient UI.
- Reusable components accept the shared props in `src/presentation/agentReadyProps.js` and use `useAgentReadyComponent` so adapters and component-scoped tools can be composed without rewriting the component.
- Register reusable components in `src/app/componentRegistry.js`; default WebMCP tools belong in `src/infrastructure/webmcp/tools/createDefaultTools.js`.
- Treat `src/infrastructure/webmcp/catalog/capabilityCatalog.js` as the canonical capability manifest. Every imperative tool and declarative form needs one catalog entry, category, prompt, interaction tag, and machine id.
- Drug reads used by tools must pass through `LocalDrugIndexApi` and the configured workflow DAO; do not bypass the seeded DuckDB path with page data.

## WebMCP rules

- Use the current `document.modelContext.registerTool()` API, not legacy `navigator.modelContext` examples.
- Treat WebMCP as progressive enhancement. The Vue app must work when the browser API is absent or permission is denied.
- Every tool needs a stable namespaced name, precise description, bounded JSON Schema, deterministic structured output, and correct annotations.
- Give each tool one non-overlapping purpose. Distinguish declarative tools that populate visible UI from imperative tools that return structured data.
- Validate types, required fields, ranges, enums, nested objects, and unknown properties in executable code; schemas guide agents but are not a security boundary.
- Return only the information needed for the next step, update shared UI state after mutations, and classify failures with a concise code and retryability signal.
- Read-only tools must set `readOnlyHint: true`. Mutating tools must clearly describe the local state change and call the same Pinia action used by the UI.
- Registration must be lifecycle-safe through `AbortSignal`; component-scoped tools unregister on unmount.
- Do not create agent tools that place an order, simulate payment, or disclose customer data without an explicit interaction/approval design.
- Structured exchanges must return an exact response tool name and closed JSON Schema. The site must validate the second call, derive display facts from trusted local data, and leave generated content in human review.
- Interaction-review tools must expose incomplete coverage and require professional verification. Related-record tools must never claim equivalence or recommend substitution.
- Imperative and declarative tools must share namespaced contracts without making form completion dependent on experimental browser support.
- Naming follows ADR 0001: `cleardose_<verb_noun>` for registered tools, `cleardose.<category>.<verb_noun>` for capability ids, and `machine.<scope>.<name>.v1` for machine ids. Events are `UPPER_SNAKE_CASE`; instance ids use `flow_`, `evt_`, `call_`, `exchange_`, `card_`, or `memory_`.
- Static tool/form machines and dynamic shortcut machines must declare `role`, `situation`, and `step` scope. Dynamic state arrays are unique, deterministic, and validated before a flow starts.
- Error tools return actionable structured recovery and a recommended next tool. They must not secretly chain external side effects; a user or agent explicitly chooses the next call.
- Memory and document tools may prepare reviewable artifacts only. Clipboard writes, File System Access pickers, downloads, and any transfer to another agent require a visible user action.
- User-authored capability templates are data, never executable code. Preserve `SafeEjsTemplateEngine` restrictions: escaped path interpolation, comments, and one-level `if` blocks only. Reject raw output, JavaScript, nesting, unmatched tags, and prototype paths.
- Saving, previewing, importing, and registering are separate actions. Imported templates must be unregistered drafts; dynamically registered tools use `cleardose_user_<name>` and workflows use `machine.dynamic.user-workflow-<name>.v1`.
- Use `ClipboardService` for every copy surface so permission denial falls back safely and failures remain visible. Example prompts must remain visible in full and readable aloud; never make clipboard access the only way to use a prompt.

## Accessibility rules

- Maintain the WCAG 2.2 AAA engineering target documented in `docs/ACCESSIBILITY.md`; never make a formal conformance claim without a human audit.
- Preserve semantic landmarks, skip navigation, route titles, visible focus, enhanced contrast, 44-pixel controls, transcripts, reduced-motion behavior, and forced-colors support.
- Voice guidance is optional progressive enhancement. Every spoken instruction needs an equivalent persistent transcript and keyboard controls.
- Every user-data field needs a stable label, `name`, appropriate `type`, and correct `autocomplete` token. Do not disable autofill without a specific safety reason.

## Change checklist

1. Add or update DTOs and repository behavior before changing pages.
2. Expose the use case on `ClearDoseFacade`, then the Pinia store.
3. Add UI and WebMCP adapters that call the same store action.
4. Register new components/tools in their registries.
5. Add tests for facade behavior, sanitized DTOs, schemas, runtime validation, fallback behavior, and registration cleanup.
6. Update `evals/cleardose.evals.json`, run `npm run evals:contracts`, and add refusal cases for unsafe requests.
7. Update `docs/USER_STORIES.md` and `docs/WEBMCP_PLUGIN.md` when behavior changes.
8. For workflow changes, add state/context tests, negative scenarios, and update `docs/LOCAL_WORKFLOW_RUNTIME.md`.
9. Run `scripts/validate-capability-catalog.mjs` through `npm run evals:contracts`; every shortcut step must reference a real capability.
10. Update `CHANGELOG.md` and the applicable ADR when a naming, safety, persistence, or orchestration contract changes.
11. Run the internal browser regression checklist for route, copy, storefront, recovery, shortcut, and Studio flows before deployment.

## Commands

- `npm run dev` — local Vite development
- `npm test` — architecture and WebMCP contract tests
- `npm run evals:contracts` — regenerate and validate the static tool/eval contract
- `npm run build` — production build
- `npm run lint` — lint the repository
