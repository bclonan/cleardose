# ClearDose

**Transparent prescriptions, agent-ready.**

A complete Vue 3 prescription-commerce sandbox with a fictional database, customer and checkout flows, a Pinia application store, clean DTO/DAO boundaries, replaceable repository/component adapters, and an extensible WebMCP plugin.

## Run

```bash
npm install
npm run dev
```

Use `demo@patient.test` / `demo1234`, or create a fictional local account. Run `npm test` for architecture and WebMCP contracts and `npm run build` for the production bundle.

## Architecture

All state changes follow:

`Vue component or WebMCP tool → Pinia action → ClearDoseFacade → repository adapter → BrowserStateDao`

Pages contain no persistence or seed-data access. DTOs sanitize and freeze records before they enter the store; the customer DTO deliberately omits the demo password. The composition root at `src/app/createClearDosePlugin.js` wires Pinia, adapters, facade, globally registered components, and default WebMCP tools.

Host apps can import the supported extension API from `src/cleardose.js`.

## WebMCP

The plugin progressively registers four tools through `document.modelContext`: medication search, medication detail, cart read, and add to cart. UI and agents call the same Pinia actions, so state stays synchronized. Browsers without WebMCP continue to work normally.

Reusable components accept `adapter`, `mcpTools`, `mcpContext`, and `registerMcp` props. See [docs/WEBMCP_PLUGIN.md](docs/WEBMCP_PLUGIN.md) for extension examples.

## Project documentation

- [Project goal](PROJECT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [User stories](docs/USER_STORIES.md)
- [WebMCP plugin guide](docs/WEBMCP_PLUGIN.md)
- [Agent/contributor instructions](AGENTS.md)

## Safety boundary

Everything is fictional and stored only in the browser. ClearDose is not a pharmacy, does not provide medical advice, and does not transmit prescriptions, contact providers, fulfill medication, or process payments.
