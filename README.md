# ClearDose

**Transparent prescriptions, agent-ready.**

A complete Vue 3 prescription-commerce sandbox with a local Universal Drug Index, fictional prices, customer and checkout flows, a Pinia application store, clean DTO/DAO boundaries, replaceable adapters, an extensible WebMCP plugin, and a live local-first workflow observatory.

## Run

```bash
npm install
npm run dev
```

Use `demo@patient.test` / `demo1234`, or create a fictional local account. Run `npm test` for deterministic behavior, `npm run evals:contracts` for the exported tool/eval contract gate, and `npm run build` for the production bundle. With the dev server on port 4173, `npm run smoke:app` verifies the live shell and compiled feature modules; `npm run evals:smoke` additionally requires Chrome Canary.

## Architecture

The project keeps one readable local-first path:

`Vue component or WebMCP tool → Pinia action → ClearDoseFacade → mock API / UniversalDrugIndex → BrowserStateDao for commerce state`

`UI, WebMCP, or scenario → WorkflowRuntime → DuckDB-Wasm / OPFS → BroadcastChannel → live viewer`

Pages contain no persistence or seed-data access. DTOs sanitize and freeze records before they enter the store; the customer DTO deliberately omits the demo password. The composition root at `src/app/createClearDosePlugin.js` wires Pinia, adapters, facade, globally registered components, and default WebMCP tools.

Host apps can import the supported extension API from `src/cleardose.js`.

## Local flow lab

Open `/#/flow-lab` to run multiple workflows next to a Stately-style live inspector. It exposes exact event ids, current states, transition history, and the bounded context at each step. DuckDB-Wasm boots from its official jsDelivr distribution and seeds all 52 fictional drug records into a browser-local OPFS database alongside workflow instances, events, structured exchanges, and generated cards. After the engine assets load, queries and stored data remain on the device. If the engine, OPFS, or a writable file is unavailable, the affected tab reports a visible in-memory fallback while `BroadcastChannel` continues mirroring live events.

The question-card demo implements a two-call exchange: `prepare_doctor_question_card_request` returns bounded UDI facts, a template-literal instruction, and an exact expected response schema; `submit_doctor_question_card_draft` accepts only structured neutral questions and produces a printable patient-reviewable card. ClearDose derives displayed price facts from its UDI rather than accepting agent-authored prices.

The same page contains deterministic negative fixtures for invalid health-data-style forms, unavailable demo stock, and stale fictional prices that require reconfirmation.

## WebMCP

The plugin progressively registers twelve single-purpose tools through `document.modelContext`: the original UDI, review, planning, highlighting, and cart capabilities plus workflow inspection and the two-call doctor-question-card exchange. UI and agents call the same Pinia actions, so state stays synchronized. Browsers without WebMCP continue to work normally.

Reusable components accept adapter overrides plus imperative and declarative WebMCP configuration. The global agent center exposes the live tool manifest and an optional route-aware voice journey with a persistent transcript. A floating prompt guide documents every registered tool, offers copyable examples, and uses browser speech recognition as an optional voice-search enhancement. See [docs/WEBMCP_PLUGIN.md](docs/WEBMCP_PLUGIN.md) for extension examples.

## Project documentation

- [Project goal](PROJECT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [User stories](docs/USER_STORIES.md)
- [WebMCP plugin guide](docs/WEBMCP_PLUGIN.md)
- [Accessibility target](docs/ACCESSIBILITY.md)
- [Mock API boundary](docs/MOCK_API.md)
- [Bulk data sources and import plan](docs/DATA_SOURCES.md)
- [WebMCP evals](docs/EVALS.md)
- [Local workflow runtime](docs/LOCAL_WORKFLOW_RUNTIME.md)
- [Prompt and voice guide](docs/PROMPT_GUIDE.md)
- [Hackathon entry](HACKATHON_ENTRY.md)
- [Agent/contributor instructions](AGENTS.md)

## Safety boundary

Everything is fictional and stored only in the browser. ClearDose is not a pharmacy, does not provide medical advice, and does not transmit prescriptions, contact providers, fulfill medication, or process payments.
