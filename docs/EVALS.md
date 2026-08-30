# WebMCP evals

ClearDose keeps one canonical source-controlled evaluation suite at `evals/cleardose.evals.json`. It contains direct tool-selection cases, ordered multi-tool journeys, structured exchange preparation, semantic compatibility, mock availability recovery, workflow inspection, mutation sequencing, and no-tool safety cases. `scripts/export-webmcp-smoke.mjs` derives `evals/cleardose.smoke.json` by selecting only positive-call cases because the smoke runner requires at least one tool call per journey.

## Fast deterministic contract gate

```bash
npm run evals:contracts
```

This first validates the capability/shortcut catalog, exports the current definitions from `createDefaultTools.js` to `evals/schema.json`, then verifies:

- every tool has a unique namespaced name, precise description, input and output object schemas, closed top-level input properties, and security annotations;
- every catalog record declares routes, permissions, example requests, prompt variants, expected results, deterministic errors, related tools, scenarios, and valid machine scope;
- every eval references a currently exported tool;
- direct, chained, mutation, and refusal journeys remain present.
- the question-card handoff chooses the prepare tool and exposes a separate submit contract rather than collapsing both responsibilities;
- stale-price, unavailable-stock, malformed-draft, clinical-claim, and emergency prompts do not bypass human review or order boundaries.
- prescription recovery selects the bounded follow-up tool and external-memory requests cannot bypass explicit review/export.
- unsafe substitution prompts do not select a comparison or commerce tool;
- unavailable mock locations preserve the typed failure before a separate supported-location recovery call;
- stale state recovery inspects current runtime truth instead of guessing a version or retrying blindly;
- human-only checkout prompts do not select workflow dispatch.

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

That gate fetches the Vue shell and Vite-compiled flow lab, Demo Lab, WebMCP Explorer, DuckDB adapter, and catalog. It does not replace the Canary WebMCP execution smoke. It provides a non-browser fallback for constrained CI workers.

`tests/templates.test.mjs` separately verifies the user-authored extension boundary: escaping, disabled raw/JavaScript tags, conditional balance, prototype blocking, closed inputs, explicit registration, human-review artifacts, and clipboard permission fallback.

The deterministic unit suite separately executes the negative workflow fixtures and confirms rejected form payloads are not persisted, incompatible comparisons are not ranked, unavailable locations and delivery failures stay recoverable, unavailable stock does not place an order, stale prices require reconfirmation, and prescription recovery ends in human review. It also validates replay controls, local registry invocation, capability metadata, dynamic scope, seeded database queries, versioned workflow dispatch, human-only action rejection, and memory packet state.

The `webmcp-evals` package is experimental. Keep deterministic service and schema tests as the required CI gate even when model evals are available.
