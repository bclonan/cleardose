# ClearDose WebMCP hackathon entry

This earlier long-form entry is retained for project history. Use [docs/HACKATHON_SUBMISSION.md](docs/HACKATHON_SUBMISSION.md) for the final submission draft and [docs/FINAL_RELEASE_REPORT.md](docs/FINAL_RELEASE_REPORT.md) for verified release status.

**Tagline:** Transparent prescriptions, agent-ready.

## What we built

ClearDose is a fictional, local-first Vue 3 prescription-commerce experience where a patient and browser agent use the same typed capabilities. A 52-record Universal Drug Index expands into 156 packages and 624 deterministic fictional offers across four providers and three mock locations. It supports explicit semantic comparison, provider inventory, delivery estimates, synthetic interaction-review fixtures, local procurement planning, cart and checkout journeys, structured doctor-discussion documents, prescription recovery, user-controlled memory packets, and a safe studio for locally authoring tools and workflows.

The demo has three recurring parts. Programmatic Replay runs deterministic steps through the same local tool handlers used by WebMCP. The WebMCP Explorer exposes live registration, schemas, examples, errors, timing, and state changes. The Live State Inspector renders branching workflow truth, versioned actions, exact event ids, and bounded context. DuckDB-Wasm stores the drug seed, flows, events, agent exchanges, and cards in browser OPFS. `BroadcastChannel` mirrors activity into a second tab.

## Why WebMCP

Prescription journeys contain precise identity, price, package, state, and human-approval boundaries that an agent should not infer from page layout. ClearDose registers 25 single-purpose imperative tools through `document.modelContext.registerTool()` and catalogs nine declarative forms. Every capability has a category, interaction tag, human, voice, and advanced prompt guidance, bounded input and output contracts, deterministic errors, routes, permissions, related tools, and a machine id.

Human components, Explorer requests, replay steps, and agent tools share Pinia actions and application services. Search returns exact UDI ids for later calls. Compatibility data decides which facts or offers may be compared and gives a reason. Discussion-only relationships are never ranked as equivalents. Synthetic interaction results expose incomplete coverage. Planning never reserves or orders. Checkout, patient data, and clinical decisions remain human-controlled.

## Site to agent to site exchange

The question-card exchange demonstrates a reusable two-tool pattern:

1. The site prepares bounded trusted context and returns an instruction plus exact expected response schema.
2. The agent sends a second structured tool call containing only a title and neutral questions.
3. ClearDose revalidates the draft, attaches fictional prices from the local UDI, and renders a printable patient-review card.
4. The patient explicitly reviews it. Nothing is sent to a provider.

The generic `createStructuredExchangeToolPair()` factory and domain template literals make this pattern easy to extend without placing orchestration logic in route pages.

## Judge demo

1. Open `/#/demo` and select the semantic comparison scenario. Run it once, then pause and single-step it while the `Inspect calls` panel shows each request, response, timing value, highlight, and bounded state change.
2. In the WebMCP Explorer, open `cleardose_compare_medication_options`. Run a valid seeded request, then run a malformed or incompatible request and follow the structured recovery.
3. Change the mock location and run the three-day availability scenario. Compare provider inventory, price components, and delivery windows.
4. Open the Live State Inspector. Select the seeded branching flow, inspect available actions, explain `COMPARE`, and dispatch it with the displayed version and a unique request id.
5. Try `START_CHECKOUT` through the agent dispatch tool. The runtime rejects it as human-only. Use the visible patient control instead if the demo needs to enter checkout review.
6. Run the failure-and-recovery scenario. Keep the original error in history, then choose the recommended next tool.
7. Finish with the doctor discussion card. The generated questions stop in human review, and every clinical statement remains labeled sample data.

## Architecture

- Vue 3, Vite, Vue Router, and Pinia
- Facade/repository/DTO/DAO boundaries for commerce state
- DuckDB-Wasm with official compatible bundle selection and browser OPFS
- Memory fallback plus same-origin `BroadcastChannel` replication
- Centralized workflow definitions, branching state contracts, negative fixtures, replay scenarios, and structured exchange contracts
- Reusable adapter-ready components registered by one ClearDose plugin
- A canonical 34-capability manifest, 25 built-in imperative tools, nine declarative forms, runtime contract tests, and Chrome-compatible eval fixtures
- Static tool and form machines plus branching and dynamic machines scoped to a role, situation, and step
- Explicit comparison relationships and deterministic provider, inventory, price, and delivery fixtures centralized in the UDI service
- One locally invokable tool registry shared by browser registration, Explorer requests, and Programmatic Replay
- A non-executable EJS-shaped capability template engine with explicit local registration and user-generated namespace isolation
- User-controlled File System Access/download memory export with no silent external agent transfer

## Reliability and accessibility

The site targets WCAG 2.2 AAA engineering practices: semantic landmarks and forms, high contrast, visible focus, minimum target sizes, skip navigation, reduced-motion/forced-colors support, live announcements, keyboard-operable dialogs/timelines, voice transcript fallback, and print-safe question cards. This is an engineering target, not a formal conformance claim.

The test suite covers DTO privacy, UDI counts and boundaries, compatibility rejection, location and delivery failures, WebMCP registration and local invocation, replay controls, closed schemas, versioned state dispatch, history, structured response validation, and negative fixtures. The exported eval suite covers direct, ordered, mutation, structured handoff, workflow inspection, recovery, and refusal journeys.

## Safety and scope

All people, identifiers, prescriptions, interactions, availability, prices, and transactions are fictional. ClearDose is not a pharmacy, medical device, clinical system, or care recommendation service. It does not accept real health information, contact providers, process payment, validate prescriptions, or place orders.

## References

- [WebMCP best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices)
- [WebMCP user journeys](https://developer.chrome.com/docs/ai/webmcp/use-cases)
- [WebMCP evals](https://developer.chrome.com/docs/ai/webmcp/evals)
- [DuckDB-Wasm client](https://duckdb.org/docs/current/clients/wasm/overview)
- [DuckDB-Wasm Vite and OPFS setup](https://duckdb.org/docs/current/clients/wasm/instantiation)
