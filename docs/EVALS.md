# WebMCP evals

ClearDose keeps one canonical source-controlled evaluation suite at `evals/cleardose.evals.json`. It contains direct tool-selection cases, ordered multi-tool journeys, structured exchange preparation, workflow inspection, mutation sequencing, and no-tool safety cases. `scripts/export-webmcp-smoke.mjs` derives `evals/cleardose.smoke.json` by selecting only positive-call cases because the smoke runner requires at least one tool call per journey.

## Fast deterministic contract gate

```bash
npm run evals:contracts
```

This exports the current definitions from `createDefaultTools.js` to `evals/schema.json`, then verifies:

- every tool has a unique namespaced name, precise description, object schema, closed top-level properties, and security annotations;
- every eval references a currently exported tool;
- direct, chained, mutation, and refusal journeys remain present.
- the question-card handoff chooses the prepare tool and exposes a separate submit contract rather than collapsing both responsibilities;
- stale-price, unavailable-stock, malformed-draft, clinical-claim, and emergency prompts do not bypass human review or order boundaries.

Run `npm test` as well. Unit tests execute the UDI and tool logic deterministically; evals measure model selection and sequencing.

## Model-based local eval

The experimental Chrome Labs CLI supports Gemini, Ollama, and Vercel AI SDK backends. Configure the provider environment described by that project, then run:

```bash
npm run evals:local -- --backend ollama --model <local-model>
```

Or omit the extra flags after configuring a supported hosted backend:

```bash
npm run evals:local
```

The local command evaluates the static tool schema without opening the site.

## Browser smoke eval

Start the app in one terminal, then run the deterministic browser suite in another:

```bash
npm run dev -- --host 127.0.0.1 --port 4173
npm run evals:smoke
```

Smoke mode executes the generated positive-call `expectedCall` entries against the live WebMCP page without an LLM or API key. Refusal cases remain in the canonical model/contract suite. Use the CLI's `browser` command when you want model-based end-to-end trajectory evaluation.

The Chrome Labs runner currently launches the Chrome Canary channel. On environments without that binary, keep the dev server running and use the app-level compilation smoke gate:

```bash
npm run smoke:app
```

That gate fetches the Vue shell and Vite-compiled flow lab, prompt guide, DuckDB adapter, and WebMCP catalog. It does not replace the Canary WebMCP execution smoke; it provides an explicit non-browser fallback for constrained CI workers.

The deterministic unit suite separately executes the three negative workflow fixtures and confirms rejected form payloads are not persisted, unavailable stock does not place an order, and stale prices require reconfirmation.

The `webmcp-evals` package is experimental. Keep deterministic service and schema tests as the required CI gate even when model evals are available.
