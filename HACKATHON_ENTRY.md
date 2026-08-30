# ClearDose — WebMCP hackathon entry

**Tagline:** Transparent prescriptions, agent-ready.

## What we built

ClearDose is a fictional, local-first Vue 3 prescription-commerce experience where a patient and browser agent use the same typed capabilities. A 52-record Universal Drug Index expands into 156 packages and 468 deterministic fictional offers. It supports search, price comparison, discussion-only related records, synthetic interaction-review fixtures, local procurement planning, cart/account/checkout journeys, structured patient-to-doctor documents, prescription recovery, user-controlled agent memory packets, and a safe studio for locally authoring new document tools and workflows.

The differentiator is observability: the dedicated flow lab renders concurrent XState/Stately-style state paths, exact event ids, transition history, and the bounded context at every step. DuckDB-Wasm stores the drug seed, flows, events, agent exchanges, and cards in browser OPFS. `BroadcastChannel` mirrors activity into a second tab, so a demo operator can put the patient experience and live runtime side by side.

## Why WebMCP

Prescription journeys contain precise identity, price, package, state, and human-approval boundaries that are difficult for an agent to reconstruct from presentation alone. ClearDose registers fourteen single-purpose imperative tools through `document.modelContext.registerTool()` and catalogs eight declarative forms. Every capability has a category, interaction-model tag, visible conversational prompt, closed bounded contract, deterministic machine analog, and graceful unsupported-browser behavior.

Human components and agent tools share Pinia actions and application services. Search returns exact UDI ids for later calls. Comparison never claims therapeutic substitution. Synthetic interaction results expose incomplete coverage. Planning never reserves or orders. Checkout, patient data, and clinical decisions remain human-controlled.

## Site → agent → site “ping-pong”

The question-card exchange demonstrates a reusable two-tool pattern:

1. The site prepares bounded trusted context and returns an instruction plus exact expected response schema.
2. The agent sends a second structured tool call containing only a title and neutral questions.
3. ClearDose revalidates the draft, attaches fictional prices from the local UDI, and renders a printable patient-review card.
4. The patient explicitly reviews it. Nothing is sent to a provider.

The generic `createStructuredExchangeToolPair()` factory and domain template literals make this pattern easy to extend without placing orchestration logic in route pages.

## Judge demo

1. Use the floating **Demo shortcuts** CTA and select **Full judge tour**.
2. Copy its chain into a WebMCP-capable agent, then run the deterministic visual analog. Explain that the simulation and real agent are deliberately distinguished.
3. Inspect the dynamic `role/situation/step` scope, current state, event ids, and context beside the same run.
4. Select **Prescription recovery**. Generate an editable follow-up, review it, and copy it without contacting a prescriber.
5. Prepare a memory packet, inspect every line, then explicitly copy or save the Markdown. Show that nothing is retained automatically.
6. Open **Capability Studio**, preview the visit question-sheet starter, explicitly register it, run it into human review, and inspect its dynamic machine events.
7. Run the negative recovery lab and finish with `cleardose_inspect_workflow_runtime`.

## Architecture

- Vue 3, Vite, Vue Router, and Pinia
- Facade/repository/DTO/DAO boundaries for commerce state
- DuckDB-Wasm with official compatible bundle selection and browser OPFS
- Memory fallback plus same-origin `BroadcastChannel` replication
- Centralized workflow definitions, negative fixtures, and structured exchange contract
- Reusable adapter-ready components registered by one ClearDose plugin
- A canonical 22-capability manifest, seven prompt chains, fourteen built-in imperative tools, eight declarative forms, runtime contract tests, and Chrome-compatible eval fixtures
- Static tool/form machines plus dynamic shortcut machines scoped to a role, situation, and step
- A non-executable EJS-shaped capability template engine with explicit local registration and user-generated namespace isolation
- User-controlled File System Access/download memory export with no silent external agent transfer

## Reliability and accessibility

The site targets WCAG 2.2 AAA engineering practices: semantic landmarks and forms, high contrast, visible focus, minimum target sizes, skip navigation, reduced-motion/forced-colors support, live announcements, keyboard-operable dialogs/timelines, voice transcript fallback, and print-safe question cards. This is an engineering target, not a formal conformance claim.

The test suite covers DTO privacy, UDI counts and boundaries, WebMCP registration/cleanup, closed schemas, runtime input errors, state/context history, structured response validation, and all negative fixtures. The exported eval suite covers direct, ordered, mutation, structured handoff, workflow inspection, and refusal journeys.

## Safety and scope

All people, identifiers, prescriptions, interactions, availability, prices, and transactions are fictional. ClearDose is not a pharmacy, medical device, clinical system, or care recommendation service. It does not accept real health information, contact providers, process payment, validate prescriptions, or place orders.

## References

- [WebMCP best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices)
- [WebMCP user journeys](https://developer.chrome.com/docs/ai/webmcp/use-cases)
- [WebMCP evals](https://developer.chrome.com/docs/ai/webmcp/evals)
- [DuckDB-Wasm client](https://duckdb.org/docs/current/clients/wasm/overview)
- [DuckDB-Wasm Vite and OPFS setup](https://duckdb.org/docs/current/clients/wasm/instantiation)
