# ClearDose Agent Guide

## Mission

Build and extend ClearDose, transparent prescriptions, agent-ready, as a fictional local-only prescription commerce sandbox. Preserve the full patient journey while making every meaningful action reusable by both Vue components and WebMCP tools.

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

## Canonical directories

- `src/views` contains route presentation. Views orchestrate store actions and sanitized DTOs only.
- `src/components` contains reusable UI, replay, Explorer, state, and agent-ready components.
- `src/stores` and `src/composables` expose the reactive Pinia boundary.
- `src/domain` contains shared limits and pure domain rules that do not belong to the mock API.
- `src/services/api` owns fictional fixtures, UDI behavior, workflow definitions, structured exchanges, and server-like mock behavior.
- `src/services/workflows` owns replay and versioned runtime coordination.
- `src/services/templates` owns safe user-authored template behavior.
- `src/infrastructure/persistence` owns browser serialization, DuckDB-Wasm, OPFS, memory fallback, and cross-tab replication.
- `src/infrastructure/webmcp` owns the capability catalog, browser adapter, local registry, declarative runner, and registered tool handlers.
- `tests` contains the Node unit, integration, architecture, and contract suite.
- `evals` contains WebMCP schemas and journeys. `evals/schema.json` and `evals/cleardose.smoke.json` are generated. Do not edit them by hand.
- `docs` contains canonical architecture, testing, demo, role, accessibility, and release evidence.

Do not recreate the removed React, Next, Cloudflare Worker, D1, shadcn, or Drizzle starter. The active stack is Vue, Vite, Pinia, and browser-local DuckDB-Wasm.

## Coding conventions

- Prefer plain JavaScript modules with small exported functions and explicit dependency injection at the composition root.
- Keep route normalization in `src/domain/shared/demoRoute.js`.
- Keep shared cart capacity in `src/domain/cart/cartLimits.js`.
- Use `ClipboardService`, `VoicePreferenceService`, and `DeclarativeFormObserver` instead of direct page-level browser persistence or global listener code.
- Keep deterministic seed ids. Do not add random values to replay inputs, expected outputs, or domain fixtures.
- Add one focused test for every corrected contract or regression.
- Keep documentation specific. Record counts and observed behavior, and label missing automation as `NOT CONFIGURED`.

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

- `npm ci`. Clean lockfile install.
- `npm run dev`. Local Vite development.
- `npm run lint`. JavaScript and Vue lint gate.
- `npm run typecheck`. Vue-aware no-output type check.
- `npm test`. Architecture, domain, state, persistence, replay, UI contract, and WebMCP tests.
- `npm run evals:contracts`. Regenerate and validate static tool and eval contracts.
- `npm run build`. Production build.
- `npm run smoke:app`. Live shell and compiled-module smoke.
- `npm ls --depth=0`. Direct dependency-tree check.
- `git diff --check`. Whitespace and patch-integrity check.

## Definition of done

A change is done only when:

1. UI, WebMCP, and replay still meet at the same store and application handler path.
2. New or changed tools have canonical catalog metadata, closed bounded schemas, runtime validation, structured errors, and correct annotations.
3. New mutations use versioned state where needed and preserve visible human control.
4. Fictional-data, no-clinical-advice, and no-real-fulfillment boundaries remain visible and tested.
5. Focus, labels, live feedback, keyboard operation, reduced-motion behavior, and responsive layout are considered for every changed control.
6. Relevant tests pass, then lint, typecheck, full tests, contract evals, build, app smoke, dependency check, and diff check pass before release.
7. The production-like build is exercised in a real browser. Record route, console, network, keyboard, responsive, success, and failure results in `docs/SMOKE_TEST_MATRIX.md`.
8. Documentation and capability counts match the final code. Update `CHANGELOG.md` for user-visible or contract changes.
