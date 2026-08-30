# Mock API and fixture boundary

All simulated server behavior is isolated under `src/services/api`:

```text
src/services/api/
├── createMockPharmacyApi.js
├── demos/
│   └── demoScenarios.js
├── index.js
├── local/
│   └── LocalDrugIndexApi.js
├── documents/
│   └── agentMemoryPacket.js
├── recovery/
│   └── recoveryGuidance.js
├── shortcuts/
│   └── hackathonShortcuts.js
├── udi/
│   ├── drugConcepts.js
│   ├── demoInteractionRules.js
│   ├── comparisonCompatibility.js
│   ├── availabilityFixtures.js
│   ├── clinicalSampleFacts.js
│   ├── ClearDoseDomainError.js
│   └── UniversalDrugIndex.js
├── mock/
│   ├── MockPharmacyApi.js
│   ├── negativeScenarios.js
│   └── seedData.js
└── workflows/
    ├── doctorQuestionCardExchange.js
    ├── workflowStateContracts.js
    └── workflowDefinitions.js
```

`seedData.js` contains fictional customer, order, and prescription state only. The UDI folder owns drug concepts, explicit comparison relationships, deterministic package and provider offers, mock locations, inventory, delivery estimates, clinical sample facts, intentionally incomplete interaction fixtures, and local procurement logic. `MockPharmacyApi` exposes those reads beside customer, cart, prescription, and order behavior. Repository adapters convert records into immutable DTOs. The browser DAO only serializes mutable mock state.

To replace the mock server, implement the same API methods with HTTP calls and pass the resulting data adapter to `createClearDosePlugin({ dataAdapter })`. Route pages and components do not import fixtures or persistence.

`LocalDrugIndexApi` adapts the configured DAO's `queryDrugs()` and `getDrug()` methods, so WebMCP search/detail calls exercise the seeded DuckDB table or the explicit memory fallback. It has no dependency on Vue, DuckDB, or page state.

`negativeScenarios.js` contains deterministic invalid-form, unavailable-stock, stale-price, prescription-required, incompatible-comparison, unavailable-location, provider-failure, mock-service, delivery-window, denied-permission, timeout, duplicate-action, unsupported-fulfillment, and no-equivalent cases. `WorkflowRuntime` executes the matching validation or seeded UDI operation, checks the observed error code, and stores bounded evidence on the failure event. Permission, timeout, and the mock-service outage are deliberate injected failures. The duplicate and no-equivalent fixtures exercise the real version guard and compatibility model. `recovery/` maps supported codes to human-reviewed next steps. `documents/` builds bounded memory artifacts. `shortcuts/` contains prompt-chain fixtures and their situation scope. `demos/` owns route-aware Programmatic Replay scenarios. `workflows/` owns branching state definitions, action contracts, human-only markers, recovery edges, and the structured question-card contract. Route pages do not invent event payloads.

`ClearDoseDomainError` carries `code`, `retryable`, `recommendedTool`, `recoveryInput`, and bounded `details`. WebMCP error handling preserves that structure. Availability failures include `LOCATION_UNAVAILABLE`, `PACKAGE_UNAVAILABLE`, `PROVIDER_UNAVAILABLE`, and `DELIVERY_WINDOW_MISSED`. Compatibility failure uses `INCOMPATIBLE_COMPARISON`.

`templates/capabilityTemplateSchema.js` is the server-like validation boundary for locally authored capability records and their inputs. Rendering and registration live in `src/services/templates`; persistence lives in `src/infrastructure/persistence`. The Studio page never reads storage or evaluates a submitted template.
