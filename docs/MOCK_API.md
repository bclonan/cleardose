# Mock API and fixture boundary

All simulated server behavior is isolated under `src/services/api`:

```text
src/services/api/
├── createMockPharmacyApi.js
├── index.js
├── udi/
│   ├── drugConcepts.js
│   ├── demoInteractionRules.js
│   └── UniversalDrugIndex.js
├── mock/
    ├── MockPharmacyApi.js
    ├── negativeScenarios.js
    └── seedData.js
└── workflows/
    ├── doctorQuestionCardExchange.js
    └── workflowDefinitions.js
```

`seedData.js` contains fictional customer/order/prescription state only. The UDI folder owns the drug concepts, deterministic package/offer generator, related-record grouping, intentionally incomplete interaction fixtures, and local procurement logic. `MockPharmacyApi` exposes those reads alongside customer, cart, prescription, and order behavior. Repository adapters convert catalog records into immutable DTOs; the browser DAO only serializes mutable mock state.

To replace the mock server, implement the same API methods with HTTP calls and pass the resulting data adapter to `createClearDosePlugin({ dataAdapter })`. Route pages and components do not import fixtures or persistence.

`negativeScenarios.js` contains deterministic invalid-form, unavailable-stock, and stale-price events. `workflows/` owns state definitions and the structured question-card contract. The runtime consumes these fixtures through Pinia; route pages do not invent event payloads.
