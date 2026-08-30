# Hackathon shortcuts

Open `/#/shortcuts` from the main navigation. The workbench is a judge-facing control surface, not an autonomous agent.

## Replay scenarios

| Scenario | Demonstrates |
|---|---|
| Find one exact medication record | Search output reused as exact detail input |
| Compare compatible medication options | Explicit relationship checks before ranking |
| Find an option that arrives in three days | Mock provider inventory, price, and delivery deadline |
| Review the mock checkout cost | Exact package mutation and transparent cart read without ordering |
| Build a structured doctor discussion card | Trusted local facts, exact response schema, and human review |
| Inspect and choose a valid state branch | Current truth, versioned dispatch, human-only checkout, and history |
| Reject malformed input and recover | Visible typed error followed by an explicit recovery call |
| Trace a WebMCP call from request to state | Shared registry handlers, timing, and workflow evidence |

## External agent calls versus Programmatic Replay

Each scenario displays human, voice, and advanced prompts in full. Copy uses the shared clipboard fallback. An external agent decides which registered tools to call and remains subject to tool validation and human-review gates. The visible prompt remains usable when clipboard or speech APIs are unavailable.

Run programmatic replay never claims to be an external agent. It resolves the scenario's structured input and invokes the same registered local handler that browser WebMCP uses. Each step records its request, response or typed error, timing, mock disclosure, stable highlight, and bounded application or DOM changes. The replay controls can pause, resume, advance one step, restart, or reset the seed.

Each shortcut replay has the same step count and capability order as its visible prompt chain. The runner stops at the first blocked call and never marks later steps complete. Price shortcuts compare providers and packages for one exact indexed medication. Discussion-only medication relationships are not price-ranked.

Inspect calls opens the replay trace. The Live State Inspector shows the `programmatic-replay` workflow and each tool execution machine at the same time. A failure remains in history even after the operator chooses a recovery call.

## Add or revise a scenario

1. Add a route demo to `src/services/api/demos/demoScenarios.js`, or add an exact prompt-chain replay to `src/services/api/demos/shortcutReplayScenarios.js`.
2. Use a kebab-case id and declare the title, summary, routes, mock disclosure, prompt variants, and expected result.
3. Every step must reference an existing `capabilityId`, use a structured request, and name only stable highlight targets and bounded observers.
4. Dependent inputs must read structured output from a prior step. Do not parse visible page text.
5. Add a recovery scenario or explicit expected error where the demo benefits from showing failure.
6. Run `npm run evals:contracts` and `npm test`.
7. For a shortcut, run `tests/shortcut-replay.test.mjs` and confirm that every visible capability id matches the replay at the same index.

## Human-controlled memory

The memory workbench turns reviewed facts, decisions, next steps, and flow references into structured JSON plus Markdown. Preparing a packet does not copy, save, upload, or retain it in an external model. **Copy for my agent** uses the clipboard. **Save Markdown** uses the File System Access picker in a secure supporting browser and a download fallback elsewhere.
