# ClearDose

**Transparent prescriptions, agent-ready.**

A Vue 3 prescription-commerce sandbox with a local Universal Drug Index, fictional provider offers, customer and checkout flows, a WebMCP Explorer, deterministic Programmatic Replay, and a branching Live State Inspector. A safe Capability Studio supports local user-authored tools without turning templates into executable code.

## Run

```bash
npm install
npm run dev
```

Use `demo@patient.test` / `demo1234`, or create a fictional local account. Run `npm test` for deterministic behavior, `npm run evals:contracts` for the exported tool/eval contract gate, and `npm run build` for the production bundle. With the dev server on port 4173, `npm run smoke:app` verifies the live shell and compiled feature modules. `npm run evals:smoke` requires Chrome Canary.

## Architecture

The project keeps one readable local-first path:

`Vue component or WebMCP tool → Pinia action → ClearDoseFacade → mock API / UniversalDrugIndex → BrowserStateDao for commerce state`

`UI, WebMCP, or scenario → WorkflowRuntime → DuckDB-Wasm / OPFS → BroadcastChannel → live viewer`

`Demo card → ProgrammaticReplayRuntime → WebMcpToolRegistry.invoke() → the same tool handler → bounded observations`

Pages contain no persistence or seed-data access. DTOs sanitize and freeze records before they enter the store; the customer DTO deliberately omits the demo password. The composition root at `src/app/createClearDosePlugin.js` wires Pinia, adapters, facade, globally registered components, and default WebMCP tools.

Host apps can import the supported extension API from `src/cleardose.js`.

## Local flow lab

Open `/#/flow-lab` to run multiple workflows beside the Live State Inspector. The inspector shows the application's current truth, a branching graph, valid agent actions, human-only actions, disabled branches, event ids, chronological history, and bounded context. Its interaction tools inspect one flow, explain a transition, dispatch one versioned action, or reset state while preserving history. They do not solve a workflow in one call.

DuckDB-Wasm boots from its official jsDelivr distribution and seeds all 52 fictional drug records into a browser-local OPFS database alongside workflow instances, events, structured exchanges, and generated cards. The UDI expands to 156 packages and 624 fictional provider offers across four providers and three mock locations. After the engine assets load, queries and stored data remain on the device. If the engine, OPFS, or a writable file is unavailable, the affected tab reports a visible memory fallback while `BroadcastChannel` continues mirroring live events.

The question-card demo implements a two-call exchange: `prepare_doctor_question_card_request` returns bounded UDI facts, a template-literal instruction, and an exact expected response schema; `submit_doctor_question_card_draft` accepts only structured neutral questions and produces a printable patient-reviewable card. ClearDose derives displayed price facts from its UDI rather than accepting agent-authored prices.

The same page contains executable negative fixtures for invalid health-data-style forms, incompatible comparisons, unavailable locations, provider failures, missed delivery windows, stale fictional prices, prescription-required recovery, denied permission, timeout, duplicate action, unsupported external fulfillment, and no seeded equivalent. Each fixture runs a bounded seeded operation before recording its observed error in the workflow history. Permission, timeout, and the mock-service outage are explicit injected failures. The duplicate and no-equivalent cases exercise the real state guard and compatibility model. Recoverable errors return a code, retryability, the next tool to consider, and bounded recovery input.

## Demo lab

Programmatic Replay, the WebMCP Explorer, and the Live State Inspector recur across the site. Every route-aware demo card includes Run demo, Copy prompt, and Inspect calls actions plus human, voice, and advanced prompt variants. A replay calls the same local registry handlers used by WebMCP. It records structured requests, responses, timing, stable highlights, and bounded application or DOM changes. Pause, resume, single-step, restart, and reset are real controls.

Open `/#/demo` for the WebMCP Explorer. It lists the canonical capabilities with live browser-registration status, input and output schemas, example requests, typed errors, permissions, routes, related tools, and linked scenarios. Try It invokes the chosen local handler and shows its response, elapsed time, and state change. Malformed examples are included so errors and recovery can be demonstrated instead of hidden.

## Hackathon prompt shortcuts

Open `/#/shortcuts` for the judge workbench. Its scenario cards use Programmatic Replay, so each displayed step invokes a registered local tool handler and writes real workflow evidence. The workbench still distinguishes local replay from an external browser agent.

Every demo card keeps the complete prompt visible and offers human, voice, and advanced wording. Copy uses a permission-aware fallback. The page also contains prescription-recovery and agent-memory surfaces. A prescription gate returns administrative steps plus an editable prompt. A memory packet can be reviewed, copied, or saved as Markdown using the File System Access API when supported and a download otherwise. ClearDose never sends context to an external agent or writes a file without a visible human action.

## Capability Studio

Open `/#/studio` to create a local WebMCP document tool or deterministic workflow. A four-step voice-supported guide collects identity, a closed input schema, role/situation/step scope, and an EJS-shaped template. The renderer supports only escaped path interpolation, comments, and one-level bounded conditionals; it never evaluates JavaScript. Previewing and saving do not register anything. Loading is a separate explicit action, imported templates return to draft review, and generated documents remain in `human_review`.

## WebMCP

The plugin progressively registers 25 single-purpose imperative tools through `document.modelContext` and catalogs nine declarative forms. The 34-capability catalog owns names, categories, schemas, permissions, prompts, errors, routes, related tools, and machine ids. Explicitly approved user-authored tools are added under `cleardose_user_*` at runtime. UI, WebMCP, Explorer calls, and replay calls meet at the same application services. Browsers without WebMCP still receive the complete human interface and local replay.

Reusable components accept adapter overrides plus imperative and declarative WebMCP configuration. The persistent Demo Lab exposes route prompts, replay, and state inspection without making WebMCP support mandatory. See [docs/WEBMCP_PLUGIN.md](docs/WEBMCP_PLUGIN.md) for extension examples.

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
- [Hackathon shortcuts](docs/HACKATHON_SHORTCUTS.md)
- [Capability Studio](docs/CAPABILITY_STUDIO.md)
- [Capability naming ADR](docs/adr/0001-capability-naming-and-machine-scope.md)
- [Human-controlled memory ADR](docs/adr/0002-human-controlled-agent-memory-files.md)
- [Safe capability templates ADR](docs/adr/0003-safe-user-authored-capability-templates.md)
- [Shared demo runtime ADR](docs/adr/0004-shared-demo-runtime-and-explicit-domain-contracts.md)
- [Hackathon entry](HACKATHON_ENTRY.md)
- [Changelog](CHANGELOG.md)
- [Agent/contributor instructions](AGENTS.md)

## Safety boundary

Everything is fictional and stored only in the browser. ClearDose is not a pharmacy, does not provide medical advice, and does not transmit prescriptions, contact providers, fulfill medication, or process payments.
