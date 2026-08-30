# ClearDose — WebMCP hackathon entry

**Tagline:** Transparent prescriptions, agent-ready.

## What we built

ClearDose is a fictional, local-first Vue 3 prescription-commerce experience where a patient and browser agent use the same typed capabilities. A 52-record Universal Drug Index expands into 156 packages and 468 deterministic fictional offers. It supports search, price comparison, discussion-only related records, synthetic interaction-review fixtures, local procurement planning, cart/account/checkout journeys, and a structured patient-to-doctor question card.

The differentiator is observability: the dedicated flow lab renders concurrent XState/Stately-style state paths, exact event ids, transition history, and the bounded context at every step. DuckDB-Wasm stores the drug seed, flows, events, agent exchanges, and cards in browser OPFS. `BroadcastChannel` mirrors activity into a second tab, so a demo operator can put the patient experience and live runtime side by side.

## Why WebMCP

Prescription journeys contain precise identity, price, package, state, and human-approval boundaries that are difficult for an agent to reconstruct from presentation alone. ClearDose registers twelve single-purpose tools through `document.modelContext.registerTool()`. Every tool has a closed bounded schema, strict runtime validation, clear read/mutation annotations, deterministic structured output, and graceful unsupported-browser behavior.

Human components and agent tools share Pinia actions and application services. Search returns exact UDI ids for later calls. Comparison never claims therapeutic substitution. Synthetic interaction results expose incomplete coverage. Planning never reserves or orders. Checkout, patient data, and clinical decisions remain human-controlled.

## Site → agent → site “ping-pong”

The question-card exchange demonstrates a reusable two-tool pattern:

1. The site prepares bounded trusted context and returns an instruction plus exact expected response schema.
2. The agent sends a second structured tool call containing only a title and neutral questions.
3. ClearDose revalidates the draft, attaches fictional prices from the local UDI, and renders a printable patient-review card.
4. The patient explicitly reviews it. Nothing is sent to a provider.

The generic `createStructuredExchangeToolPair()` factory and domain template literals make this pattern easy to extend without placing orchestration logic in route pages.

## Three-minute demo

1. Open **WebMCP demo** and show the DOM-vs-tools side-by-side explanation plus the live tool manifest.
2. Open **Flow lab**. Keep the viewer on the right and prepare a lisinopril question-card handoff on the left.
3. Show the returned instruction and response schema, submit the prefilled mock agent response, and print or mark the resulting card reviewed.
4. Open the UDI in a second tab, call or simulate another tool, and watch a concurrent flow/event appear.
5. Run **invalid health-data form**, **package becomes unavailable**, and **price changes before review**. Show that each failure is visible context—not a silent success or automatic order.
6. Open the floating **Prompt guide**, voice-search “workflow,” and copy an example for `inspect_workflow_runtime`.

## Architecture

- Vue 3, Vite, Vue Router, and Pinia
- Facade/repository/DTO/DAO boundaries for commerce state
- DuckDB-Wasm with official compatible bundle selection and browser OPFS
- Memory fallback plus same-origin `BroadcastChannel` replication
- Centralized workflow definitions, negative fixtures, and structured exchange contract
- Reusable adapter-ready components registered by one ClearDose plugin
- Twelve WebMCP tools, declarative form examples, runtime contract tests, and Chrome-compatible eval fixtures

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
