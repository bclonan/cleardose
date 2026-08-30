# WebMCP plugin

ClearDose uses the current WebMCP imperative API through a small transport adapter. Browsers without `document.modelContext` receive the full Vue experience; the footer reports that the tool catalog is available but not registered.

## Install and configure

```js
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { createClearDosePlugin } from "./app/createClearDosePlugin";

const pinia = createPinia();
const clearDose = createClearDosePlugin({
  pinia,
  componentPrefix: "Cd",
  persistence: { storageKey: "my-cleardose-sandbox" },
  webMcp: { enabled: true, namespace: "cleardose" },
});

createApp(App).use(pinia).use(clearDose).mount("#app");
```

## Registered components

The plugin registers the commerce, agent-ready form, workflow, Studio, and demo components globally. The demo set includes `CdDemoScenarioCard`, `CdProgrammaticReplayPanel`, `CdDemoLabDock`, `CdRouteDemoSection`, and `CdWebMcpExplorer`. Every reusable agent-ready component accepts:

| Prop | Type | Purpose |
|---|---|---|
| `adapter` | object | Override display/routing behavior for that component |
| `mcpTools` | array | Register additional tools while the component is mounted |
| `imperativeTools` | array | Explicit alias for component-scoped imperative tool definitions |
| `declarativeTool` | object | Standard-form metadata: `name`, `description`, and `autoSubmit` |
| `mcp` | object | Compose `{ tools, declarative }` in one prop |
| `mcpMode` | string | `auto`, `imperative`, `declarative`, or `both` |
| `mcpContext` | object | Compose safe component context into tool execution |
| `registerMcp` | boolean | Disable component-level registration when needed |

```vue
<CdMedicationCard
  :medication="medication"
  :adapter="partnerMedicationCardAdapter"
  :mcp-tools="[comparePartnerPriceTool]"
  :mcp-context="{ partnerId: 'demo-partner' }"
/>
```

A component tool receives `(input, context)`. `context` contains the facade plus the supplied `mcpContext`. Component registrations are namespaced and automatically aborted when the component unmounts.

`CdAgentReadyForm` emits standards-based `toolname`, `tooldescription`, `toolautosubmit`, and slotted `toolparamdescription` attributes while remaining a normal accessible form when WebMCP is absent.

Declarative form names describe visible UI effects such as `cleardose_populate_visible_price_comparison`. Imperative tools describe structured data operations such as `cleardose_compare_drug_prices`. Both use the shared `cleardose_` prefix, while their interaction tags keep their purposes distinct.

## Default tools

| Tool | Mutation | Purpose |
|---|---:|---|
| `cleardose_search_drug_index` | No | Return compact UDI records and exact ids for later calls |
| `cleardose_get_drug_index_entry` | No | Return normalized identity, packages, and fictional offers for one exact id |
| `cleardose_find_compatible_options` | No | List explicit comparison relationships and purpose-specific eligibility for one exact drug |
| `cleardose_compare_medication_options` | No | Compare only explicitly eligible medication records or provider offers and explain the relationship |
| `cleardose_compare_drug_prices` | No | Compare fictional package totals for one to four ids without implying substitution |
| `cleardose_find_related_drugs` | No | Return broad related records for clinician discussion, never equivalence |
| `cleardose_get_drug_availability` | No | Return provider inventory and fulfillment facts for one exact package and mock location |
| `cleardose_compare_drug_availability` | No | Rank eligible seeded pickup or shipping offers against a delivery limit |
| `cleardose_estimate_delivery` | No | Estimate pickup or shipping for one exact provider offer using deterministic local data |
| `cleardose_review_demo_interaction_flags` | No | Review intentionally incomplete synthetic fixtures and require professional verification |
| `cleardose_build_procurement_plan` | No | Select fictional offers for a local plan without reserving or ordering |
| `cleardose_inspect_workflow_runtime` | No | Read concurrent flows, recent event ids, state/context snapshots, cards, and local database status |
| `cleardose_inspect_workflow_state` | No | Read one flow's current truth, version, state metadata, valid actions, human-only actions, and disabled actions |
| `cleardose_get_workflow_history` | No | Return bounded chronological events for one exact flow |
| `cleardose_get_available_workflow_actions` | No | List valid agent actions, human-only actions, and unavailable actions without dispatching |
| `cleardose_get_workflow_transition` | No | Explain one branch, its input schema, target, recovery status, and human-control status |
| `cleardose_dispatch_workflow_transition` | Yes, local | Dispatch one declared agent action with the observed version and a unique request id |
| `cleardose_reset_workflow_state` | Yes, local | Return one flow to its declared initial state while preserving its history |
| `cleardose_prepare_doctor_question_card_request` | Yes, local | Create a bounded site-to-agent exchange with an instruction and exact response schema |
| `cleardose_submit_doctor_question_card_draft` | Yes, local | Validate structured questions and render a patient-reviewable local card |
| `cleardose_prepare_prescription_follow_up` | Yes, local | Prepare actionable administrative steps and an editable prompt without contacting a prescriber |
| `cleardose_prepare_agent_memory_packet` | Yes, local | Prepare a bounded Markdown/structured packet that still requires explicit copy or save |
| `cleardose_highlight_section` | No | Move visible focus to a stable page section or action shared by the human and agent |
| `cleardose_get_cart` | No | Read items and transparent totals |
| `cleardose_add_to_cart` | Yes | Add an exact UDI package through the same Pinia action as the UI |

## Contract rules

- Tools are statically registered because their UDI and local-cart capabilities remain valid across routes. Component-scoped additions still register only while mounted.
- Names use exact verbs and each tool has one purpose. Search returns compact ids; detail returns the fuller record; planning never orders.
- Schemas are descriptive and bounded. Executable code separately rejects invalid types, missing fields, ranges, unknown properties, invalid nested objects, and unknown ids.
- Read-only and untrusted-content annotations are explicit. Cross-origin exposure remains disabled unless a host supplies an exact `exposedTo` allowlist.
- Results contain the minimum structured context needed for a next call. Validation failures return `INVALID_INPUT`. Domain and state failures preserve their typed code, retryability, recommended tool, recovery input, and bounded details.
- Interaction and related-record outputs include domain boundaries in structured content instead of depending only on UI disclaimers.
- Every imperative execution is wrapped by the workflow runtime. The wrapper records queued, running, complete/error, input, and compact structured result states without changing the tool's return contract.
- Browser registration receives only standard WebMCP fields. Category, prompt, interaction tag, and machine metadata remain in the ClearDose registry and never depend on a browser accepting extension keys.
- Human-only workflow actions never appear as dispatchable agent actions. A direct attempt returns `ACTION_REQUIRES_HUMAN`.
- Versioned dispatch rejects stale observations with `STALE_STATE_VERSION`. Unique request ids make retries idempotent and expose duplicate conflicts.

## Canonical capability catalog and naming

`src/infrastructure/webmcp/catalog/capabilityCatalog.js` is the source of truth for 25 built-in imperative and nine declarative capabilities. Explicitly loaded local templates are appended to the runtime registry rather than mutating this static manifest. Use these formats:

| Artifact | Format | Example |
|---|---|---|
| Registered tool | `cleardose_<verb_noun>` | `cleardose_compare_drug_prices` |
| Capability id | `cleardose.<category>.<verb_noun>` | `cleardose.discovery-and-pricing.compare_drug_prices` |
| Static machine | `machine.tool.<kebab-name>.v1` | `machine.tool.compare-drug-prices.v1` |
| Dynamic machine | `machine.dynamic.<scope-name>.v1` | `machine.dynamic.shortcut-price-comparison.v1` |
| User tool | `cleardose_user_<verb_noun>` | `cleardose_user_visit_question_sheet` |
| User workflow | `machine.dynamic.user-workflow-<name>.v1` | `machine.dynamic.user-workflow-prescription-review-loop.v1` |
| Events | `UPPER_SNAKE_CASE` | `HUMAN_REVIEW_REQUIRED` |

The catalog groups discovery and pricing, patient and clinician, shopping and procurement, documents and memory, interface and observability, declarative forms, and user-generated capabilities. Each record also declares input and output schemas, routes, permissions, human, voice, and advanced prompts, expected results, deterministic errors, related tools, and scenario ids. `decorateToolDefinitions()` rejects a built-in imperative definition with no catalog entry. `npm run evals:contracts` validates uniqueness, formats, schemas, metadata, scope, and shortcut references.

## Explorer and local invocation

Open `/#/demo` to inspect the catalog beside the live registry. The WebMCP Explorer shows whether each imperative tool is registered in the browser and whether its handler can be invoked locally. Try It sends the edited request through `WebMcpToolRegistry.invoke()`, then displays the structured response, elapsed time, and bounded state difference. Declarative Try It requests populate the named visible form and use its normal submission behavior.

The selected handler receives a bounded transient copy of the edited request. The Explorer does not retain that copy. Its saved receipt redacts credentials, identity and location fields, user-authored health text, and generated document content. Workflow events apply their own allowlist before they enter DuckDB or the memory fallback.

Doctor-card concern prompts are transient. The exchange record stores only their count and a flag confirming that ClearDose omitted the authored text.

Local invocation does not add a new business layer. Browser WebMCP, the Explorer, and Programmatic Replay all reach the same registered executor. The registry still removes component-scoped executors when their `AbortSignal` ends.

Each scenario in `src/services/api/demos/demoScenarios.js` has a human prompt, voice prompt, advanced prompt, expected result, mock disclosure, tool steps, stable highlight targets, bounded observation names, and optional recovery links. Replay resolves structured references to earlier step output. It never parses visible prose to decide a later call.

## Add a safe local capability

Use `/#/studio` or call `CapabilityTemplateService` through Pinia. Templates declare a kind, stable snake_case name, closed input fields, scope, visible example prompt, voice transcript, body, and workflow states. The body may use `<%= input.field %>`, `<%= context.role %>`, comments, and non-nested `<% if input.field %>...<% endif %>` blocks. Raw output, arbitrary EJS/JavaScript, prototype paths, nested or unmatched blocks, extra input properties, and templates over 12,000 characters are rejected.

`save()` and `render()` never register. `register()` is explicit and persists that local choice. `import()` always clears registration. A generated tool artifact remains in human review. See `docs/CAPABILITY_STUDIO.md` and ADR 0003.

## Recovery and memory contracts

`add_to_cart` may return a `PRESCRIPTION_REQUIRED` fulfillment gate and the recommended next tool. It does not automatically call the follow-up tool because each capability remains single-purpose and externally meaningful actions stay explicit. `prepare_prescription_follow_up` returns steps, a visible form description, and editable prompt with `externalActionTaken: false` in the runtime context.

`prepare_agent_memory_packet` creates a local artifact in `human_review`. Clipboard/file export happens from the UI after a user gesture and is recorded as a later `USER_EXPORTED_MEMORY` event. Tool execution itself never writes a file or an external agent memory.

## Add a structured ping-pong exchange

`createStructuredExchangeToolPair()` turns one exchange definition into non-overlapping prepare and submit tools. Keep the domain template and response schema in `src/services/api/workflows`, then pass bounded handlers from the default tool catalog:

```js
const [prepareTool, submitTool] = createStructuredExchangeToolPair({
  id: "visit_summary",
  prepareSchema,
  responseSchema,
  prepare: safePrepareHandler,
  submit: safeSubmitHandler,
  prepareAnnotations: { readOnlyHint: false, untrustedContentHint: true },
  submitAnnotations: { readOnlyHint: false, untrustedContentHint: false },
});
```

The prepare result should include `exchangeId`, bounded context, a template-literal instruction, `expectedResponse.toolName`, and a closed `expectedResponse.schema`. The submit handler must revalidate the payload and persist only reviewable local state. Never let agent-authored text override trusted UDI facts.

## Add a tool

Add the capability catalog entry first, then add the definition to `createDefaultTools.js`, use a bounded JSON Schema, validate again in executable code, set annotations accurately, and invoke a store action. The registry prefixes names, records status, and provides an `AbortSignal` so tools can be unregistered cleanly. Add direct and open-ended cases to `evals/cleardose.evals.json`, then run `npm run evals:contracts` and `npm test`.

The implementation follows the W3C Community Group draft and uses `document.modelContext.registerTool()`. See the [current WebMCP draft](https://webmachinelearning.github.io/webmcp/), [Chrome's WebMCP best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices), [tool security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools), [WebMCP evals](https://developer.chrome.com/docs/ai/webmcp/evals), and [autofill guidance](https://web.dev/learn/forms/autofill).
