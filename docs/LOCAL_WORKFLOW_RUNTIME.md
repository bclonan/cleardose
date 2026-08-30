# Local workflow runtime

ClearDose includes a local observability layer for human UI actions, WebMCP calls, structured exchanges, and deterministic failure fixtures. Open `/#/flow-lab` to use it.

## Runtime path

```mermaid
flowchart TD
  Source[UI, WebMCP, or fixture] --> Runtime[WorkflowRuntime]
  Runtime --> Store[Pinia snapshot]
  Runtime --> Duck[DuckDB-Wasm]
  Duck --> OPFS[Browser OPFS]
  Runtime --> Tabs[BroadcastChannel]
```

`WorkflowRuntime` is the only transition coordinator. It validates the target against `workflowDefinitions`, merges a bounded context snapshot, creates an event id, updates the flow instance, persists both rows, and notifies subscribers. The Vue viewer reads Pinia only; it never imports DuckDB or fixtures.

## Local tables

| Table | Purpose |
|---|---|
| `drugs` | 52 preseeded fictional UDI records with their package/offer payload |
| `flow_instances` | Current state, status, context, timestamps, and event count per concurrent flow |
| `flow_events` | Immutable transition history with event id, source, correlation id, and context at that step |
| `agent_exchanges` | Bounded site instruction, request context, exact response schema, and exchange status |
| `generated_cards` | Patient-reviewable question cards and memory packet artifacts plus review/export state |

The database opens at `opfs://cleardose-flow-lab.duckdb` and checkpoints writes. ClearDose uses DuckDB's official `getJsDelivrBundles()` and `selectBundle()` bootstrap so the browser receives the compatible engine and worker without putting 34–39 MB binaries into the Site artifact. Engine assets require an initial jsDelivr fetch; SQL execution and all OPFS data remain local to the browser after loading.

## Cross-tab behavior and fallback

Each transition, exchange, and card is published over a same-origin `BroadcastChannel`. The receiving tab applies the same id and payload to its local runtime and viewer. Browser OPFS may allow only one writable owner; if engine loading, initialization, or file access fails, that tab visibly reports `memory-fallback` and continues to receive live channel events. The patient experience and WebMCP tools remain usable.

The fallback is intentionally explicit: it does not claim persistence, and its status includes the failure reason. No remote database is contacted.

## Structured exchange sequence

1. `prepare_doctor_question_card_request` resolves trusted UDI facts, records a flow, and returns the `exchangeId`, bounded context, template-literal instruction, response tool name, and closed JSON Schema.
2. The agent calls `submit_doctor_question_card_draft` with the exchange id, a neutral title, and two to eight question-shaped strings.
3. Runtime validation rejects unknown exchanges, repeat submissions, extra fields, non-question text, and out-of-range arrays.
4. ClearDose derives all displayed fictional price facts from the original request context and renders a local draft.
5. The patient can edit upstream input, print/copy the card, and explicitly mark it reviewed. No medication change, provider message, or order occurs.

## Adding a flow

Add one state definition under `src/services/api/workflows`, expose a Pinia action that calls `startFlow()` and `transition()`, and add deterministic tests for valid/invalid target states and bounded context. Pages should only select the use case and render the result.

For a situation-specific machine, call `startDynamicMachine({ id, title, states, scope, context })`. `scope` must include `role`, `situation`, and `step`; states must be unique snake_case strings. The runtime embeds the definition in context, persists it with the flow, and the live viewer resolves it without importing route-specific code. `startShortcut()` is the reference adapter.

Every imperative call is also represented by a four-state machine from the capability catalog. Declarative forms emit a privacy-minimized machine containing field names—not values—and `valuesPersisted: false`.

## Prescription and memory sequences

Prescription recovery moves `blocked → preparing → human_review`. Its context records the error code, recommended follow-up tool, editable prompt, and `externalActionTaken: false`. A person must initiate any later copy, provider contact, or tool call.

Capability Studio workflows register validated dynamic definitions under `user-workflow-<name>`. Each run embeds its definition, input, rendered guide, template id, and declared scope in bounded context. Studio document tools use the normal tool execution machine and create a separate `dynamic-document` artifact whose visible state is `human_review`.

Memory preparation moves `drafting → human_review`. An explicit clipboard or file action records `USER_EXPORTED_MEMORY` and moves to `exported`. The browser file picker is invoked before asynchronous work so it retains the required user activation; unsupported browsers receive an ordinary Markdown download.

## Privacy boundary

Use fictional data only. Do not put passwords, real patient data, unrestricted DOM text, or model conversation history into event context. The runtime is an explanatory development surface, not an audit log, clinical record, or regulated system.
