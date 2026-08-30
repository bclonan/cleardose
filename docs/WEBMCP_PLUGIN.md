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

`CdAccountNav`, `CdAgentControlCenter`, `CdAgentReadyForm`, `CdAgentReadyHost`, `CdComparisonPanel`, `CdMedicationCard`, `CdStatusBadge`, `CdWebMcpStatus`, `CdWorkflowLiveViewer`, `CdDoctorQuestionCard`, and `CdPromptGuide` are registered globally. Every reusable component accepts:

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

Declarative form names describe visible UI effects such as `populate_visible_price_comparison`. Imperative tools describe structured data operations such as `compare_drug_prices`. This distinction avoids two tools competing for the same user intent.

## Default tools

| Tool | Mutation | Purpose |
|---|---:|---|
| `cleardose_search_drug_index` | No | Return compact UDI records and exact ids for later calls |
| `cleardose_get_drug_index_entry` | No | Return normalized identity, packages, and fictional offers for one exact id |
| `cleardose_compare_drug_prices` | No | Compare fictional package totals for one to four ids without implying substitution |
| `cleardose_find_related_drugs` | No | Return broad related records for clinician discussion, never equivalence |
| `cleardose_review_demo_interaction_flags` | No | Review intentionally incomplete synthetic fixtures and require professional verification |
| `cleardose_build_procurement_plan` | No | Select fictional offers for a local plan without reserving or ordering |
| `cleardose_inspect_workflow_runtime` | No | Read concurrent flows, recent event ids, state/context snapshots, cards, and local database status |
| `cleardose_prepare_doctor_question_card_request` | Yes, local | Create a bounded site-to-agent exchange with an instruction and exact response schema |
| `cleardose_submit_doctor_question_card_draft` | Yes, local | Validate structured questions and render a patient-reviewable local card |
| `cleardose_highlight_section` | No | Move visible focus to a stable page section or action shared by the human and agent |
| `cleardose_get_cart` | No | Read items and transparent totals |
| `cleardose_add_to_cart` | Yes | Add an exact UDI package through the same Pinia action as the UI |

## Contract rules

- Tools are statically registered because their UDI and local-cart capabilities remain valid across routes. Component-scoped additions still register only while mounted.
- Names use exact verbs and each tool has one purpose. Search returns compact ids; detail returns the fuller record; planning never orders.
- Schemas are descriptive and bounded. Executable code separately rejects invalid types, missing fields, ranges, unknown properties, invalid nested objects, and unknown ids.
- Read-only and untrusted-content annotations are explicit. Cross-origin exposure remains disabled unless a host supplies an exact `exposedTo` allowlist.
- Results contain the minimum structured context needed for a next call. Errors return `INVALID_INPUT` or `TOOL_FAILURE` plus a `retryable` signal.
- Interaction and related-record outputs include domain boundaries in structured content instead of depending only on UI disclaimers.
- Every imperative execution is wrapped by the workflow runtime. The wrapper records queued, running, complete/error, input, and compact structured result states without changing the tool's return contract.

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

Add a definition to `createDefaultTools.js`, use a bounded JSON Schema, validate again in executable code, set annotations accurately, and invoke a store action. The registry prefixes names, records status, and provides an `AbortSignal` so tools can be unregistered cleanly. Add direct and open-ended cases to `evals/cleardose.evals.json`, then run `npm run evals:contracts` and `npm test`.

The implementation follows the W3C Community Group draft and uses `document.modelContext.registerTool()`. See the [current WebMCP draft](https://webmachinelearning.github.io/webmcp/), [Chrome's WebMCP best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices), [tool security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools), [WebMCP evals](https://developer.chrome.com/docs/ai/webmcp/evals), and [autofill guidance](https://web.dev/learn/forms/autofill).
