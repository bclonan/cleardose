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

`CdAccountNav`, `CdAgentReadyHost`, `CdMedicationCard`, `CdStatusBadge`, and `CdWebMcpStatus` are registered globally. Every reusable component accepts:

| Prop | Type | Purpose |
|---|---|---|
| `adapter` | object | Override display/routing behavior for that component |
| `mcpTools` | array | Register additional tools while the component is mounted |
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

## Default tools

| Tool | Mutation | Purpose |
|---|---:|---|
| `cleardose_search_medications` | No | Search name, brand, category; sort and limit results |
| `cleardose_get_medication` | No | Return one medication and all mock price variants |
| `cleardose_get_cart` | No | Read items and transparent totals |
| `cleardose_add_to_cart` | Yes | Add an exact variant through the same Pinia action as the UI |

## Add a tool

Add a definition to `createDefaultTools.js`, use a bounded JSON Schema, set annotations accurately, and invoke a store action. The registry prefixes names, records status, and provides an `AbortSignal` so tools can be unregistered cleanly.

The implementation follows the W3C Community Group draft and uses `document.modelContext.registerTool()`. See the [current WebMCP draft](https://webmachinelearning.github.io/webmcp/) and [Chrome's WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp).
