# WebMCP evals

ClearDose ships one source-controlled evaluation suite at `evals/cleardose.evals.json`. It contains direct tool-selection cases, ordered multi-tool journeys, mutation sequencing, and no-tool safety cases.

## Fast deterministic contract gate

```bash
npm run evals:contracts
```

This exports the current definitions from `createDefaultTools.js` to `evals/schema.json`, then verifies:

- every tool has a unique namespaced name, precise description, object schema, closed top-level properties, and security annotations;
- every eval references a currently exported tool;
- direct, chained, mutation, and refusal journeys remain present.

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

Smoke mode executes authored `expectedCall` entries against the live WebMCP page without an LLM or API key. Use the CLI's `browser` command when you want model-based end-to-end trajectory evaluation.

The `webmcp-evals` package is experimental. Keep deterministic service and schema tests as the required CI gate even when model evals are available.

