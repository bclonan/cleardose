# ClearDose

**Transparent prescriptions, agent-ready.**

A complete Vue 3 prescription-commerce sandbox with a local Universal Drug Index, fictional prices, customer and checkout flows, a Pinia application store, clean DTO/DAO boundaries, replaceable adapters, and an extensible WebMCP plugin.

## Run

```bash
npm install
npm run dev
```

Use `demo@patient.test` / `demo1234`, or create a fictional local account. Run `npm test` for deterministic behavior, `npm run evals:contracts` for the exported tool/eval contract gate, and `npm run build` for the production bundle.

## Architecture

The project keeps one readable local-first path:

`Vue component or WebMCP tool → Pinia action → ClearDoseFacade → mock API / UniversalDrugIndex → BrowserStateDao for mutable state`

Pages contain no persistence or seed-data access. DTOs sanitize and freeze records before they enter the store; the customer DTO deliberately omits the demo password. The composition root at `src/app/createClearDosePlugin.js` wires Pinia, adapters, facade, globally registered components, and default WebMCP tools.

Host apps can import the supported extension API from `src/cleardose.js`.

## WebMCP

The plugin progressively registers nine single-purpose tools through `document.modelContext`: UDI search, exact entry lookup, fictional price comparison, related-record discovery, synthetic interaction review, local procurement planning, accessible highlighting, cart read, and add to cart. UI and agents call the same Pinia actions, so state stays synchronized. Browsers without WebMCP continue to work normally.

Reusable components accept adapter overrides plus imperative and declarative WebMCP configuration. The global agent center exposes the live tool manifest and an optional route-aware voice journey with a persistent transcript. See [docs/WEBMCP_PLUGIN.md](docs/WEBMCP_PLUGIN.md) for extension examples.

## Project documentation

- [Project goal](PROJECT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [User stories](docs/USER_STORIES.md)
- [WebMCP plugin guide](docs/WEBMCP_PLUGIN.md)
- [Accessibility target](docs/ACCESSIBILITY.md)
- [Mock API boundary](docs/MOCK_API.md)
- [Bulk data sources and import plan](docs/DATA_SOURCES.md)
- [WebMCP evals](docs/EVALS.md)
- [Agent/contributor instructions](AGENTS.md)

## Safety boundary

Everything is fictional and stored only in the browser. ClearDose is not a pharmacy, does not provide medical advice, and does not transmit prescriptions, contact providers, fulfill medication, or process payments.
