# Mock API and fixture boundary

All simulated server behavior is isolated under `src/services/api`:

```text
src/services/api/
├── createMockPharmacyApi.js
├── index.js
└── mock/
    ├── MockPharmacyApi.js
    └── seedData.js
```

`seedData.js` contains fictional fixtures only. `MockPharmacyApi` owns raw catalog, customer, cart, prescription, and order request behavior. Repository adapters call that service and convert raw results into immutable DTOs. The browser DAO only serializes mock state.

To replace the mock server, implement the same API methods with HTTP calls and pass the resulting data adapter to `createClearDosePlugin({ dataAdapter })`. Route pages and components do not import fixtures or persistence.
