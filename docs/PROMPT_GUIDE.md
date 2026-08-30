# Prompt and voice guide

Prompt guidance now lives on each route-aware demo card and in the WebMCP Explorer. The persistent Demo Lab opens the prompts that apply to the current page. `/#/demo` exposes every built-in capability plus explicitly registered local tools.

Each scenario has three complete prompts:

- Human is a short request someone can type or copy.
- Voice is phrased to be spoken and asks for a useful spoken result.
- Advanced names the exact constraints, ordered calls, output facts, and safety boundary.

The card also names the tools it will call, the expected result, and the seeded mock data involved. Run demo starts Programmatic Replay. Copy prompt uses the shared clipboard service and its manual selection fallback. Inspect calls opens the replay trace with structured requests, responses, timing, highlights, and bounded state changes.

The WebMCP Explorer connects prompt guidance to the tool contract. A capability entry shows its input and output schemas, example requests and response, deterministic errors, routes, permissions, related tools, and linked scenarios. Try It accepts edited JSON and invokes the same local handler that WebMCP registers. A malformed example makes input rejection easy to inspect.

Prompt copy names concrete boundaries. It says when data is fictional, when comparison is limited to explicit compatibility records, when clinical facts are sample information, and when the caller must stop for human review. It never asks an agent to order medication, contact a provider, save patient data, bypass a prescription gate, force stale state, or treat a discussion-only record as a substitute.

Speech remains optional. Existing read-aloud and recognition controls always have a visible text transcript and keyboard alternative. ClearDose does not persist spoken input.

## Adding a scenario

Add a frozen record to `src/services/api/demos/demoScenarios.js`. Include routes, all three prompt variants, an expected result with checks, the mock disclosure, capability ids, structured steps, stable highlight targets, named observations, and recovery links where useful. Use prior-step structured output for dependent inputs. Do not scrape visible prose to build the next call.
