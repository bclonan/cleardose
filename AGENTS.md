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

## Commands

- `npm run dev` — local Vite development
- `npm test` — architecture and WebMCP contract tests
- `npm run evals:contracts` — regenerate and validate the static tool/eval contract
- `npm run build` — production build
- `npm run lint` — lint the repository
