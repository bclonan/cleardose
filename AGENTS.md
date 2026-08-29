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
- Reusable components accept the shared props in `src/presentation/agentReadyProps.js` and use `useAgentReadyComponent` so adapters and component-scoped tools can be composed without rewriting the component.
- Register reusable components in `src/app/componentRegistry.js`; default WebMCP tools belong in `src/infrastructure/webmcp/tools/createDefaultTools.js`.

## WebMCP rules

- Use the current `document.modelContext.registerTool()` API, not legacy `navigator.modelContext` examples.
- Treat WebMCP as progressive enhancement. The Vue app must work when the browser API is absent or permission is denied.
- Every tool needs a stable namespaced name, precise description, bounded JSON Schema, deterministic structured output, and correct annotations.
- Read-only tools must set `readOnlyHint: true`. Mutating tools must clearly describe the local state change and call the same Pinia action used by the UI.
- Registration must be lifecycle-safe through `AbortSignal`; component-scoped tools unregister on unmount.
- Do not create agent tools that place an order, simulate payment, or disclose customer data without an explicit interaction/approval design.
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
5. Add tests for facade behavior, sanitized DTOs, schemas, fallback behavior, and registration cleanup.
6. Update `docs/USER_STORIES.md` and `docs/WEBMCP_PLUGIN.md` when behavior changes.

## Commands

- `npm run dev` — local Vite development
- `npm test` — architecture and WebMCP contract tests
- `npm run build` — production build
- `npm run lint` — lint the repository
