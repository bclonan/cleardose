# Judge demo guide

This six-minute path uses visible controls and seeded local data. It does not need an external agent, real account, or external service. The final production-preview browser pass completed the search, Explorer, comparison, replay, state, failure, and recovery steps described here. Checkout validation was tested separately and is recorded in the smoke matrix.

## Start

Use Node.js 22.13.0 or newer. From the repository root:

```text
npm ci
npm run build
npm run start -- --host 127.0.0.1 --port 4173 --strictPort
```

Open `http://127.0.0.1:4173/#/`.

## Six-minute path

### 1. Establish the boundary, about 30 seconds

On `/#/`, point out the sandbox notice, 52 seeded medication concepts, and 3 deterministic demo locations. The patient can search normally. The agent-facing demo is one click away through `Run the judge demo`.

Try the keyboard search before moving on:

1. Enter `lisi` in the medication search.
2. Press Arrow Down.
3. Press Enter.
4. Confirm that the Lisinopril page opens and the route heading receives visible focus.

Return home and select `Run the judge demo`.

### 2. Run one structured tool, about 60 seconds

In the WebMCP Explorer, select `cleardose_search_drug_index`. Under `Local request console`, choose `Seeded success`. Confirm the request:

```json
{
  "query": "lisinopril",
  "limit": 5
}
```

Select `Invoke tool`. The receipt reports `Completed`, shows one Lisinopril record, records elapsed time, and lists bounded state changes. The browser also registers this same handler through `document.modelContext` when WebMCP is available.

Now replace the request with `{` and invoke it. The Explorer should show a visible parsing error and return focus to the editor. Choose `Seeded success` and run it again to show recovery.

### 3. Run and inspect Programmatic Replay, about 60 seconds

In a prompt card, select `Run programmatic replay`.

1. Select Step. Exactly one action runs and replay stays paused.
2. Select Reset. Replay returns to `IDLE`.
3. Select Run, then Pause. The same primary button becomes Resume and keeps focus.
4. Select Resume. The six-step scenario completes.
5. Open `Inspect calls` and show ordered input, output, timing, highlights, and bounded state changes.

Replay uses the same registry handlers as Explorer and browser WebMCP. It is not a timed animation over fake results.

### 4. Show exact-package comparison, about 90 seconds

Open `/#/compare` and use:

- anchor medication: Lisinopril;
- purpose: provider price;
- exact package: 10 mg, quantity 60;
- mock location: Baltimore demo area, 21201.

Select `Update semantic comparison`. In the accepted seed, the best delivered total is $38.95, pickup is 125 minutes, shipping is 1 to 2 days, and distance is 1.6 miles.

Change only the location to Remote demo area, 59001, then update again. The delivered total becomes $42.95, pickup and distance are unavailable, and shipping is 4 to 5 days.

Select `Build a doctor discussion card`. The card uses trusted local price and sample information, remains in human review, and has no send action.

For a controlled invalid case, use the Explorer request that compares `med_lisinopril` with `med_atorvastatin`. ClearDose returns `INCOMPATIBLE_COMPARISON` and does not rank the pair.

### 5. Show state, failure, and recovery, about 90 seconds

Open `/#/flow-lab`. In `Executable failure fixtures`, find `Mock availability service fails` and select `Execute failure`.

The Live State Inspector records:

- state `error`;
- code `MOCK_SERVICE_FAILED`;
- `retryable: true`;
- recovery action `RETRY_CHECK_AVAILABILITY`;
- a new event id and version.

Select the recovery transition in the state graph and dispatch it with the displayed version. The same flow moves to `checking_availability`.

An agent can ask to dispatch `COMPARE` from that state. ClearDose rejects it as `INVALID_TRANSITION`, recommends inspecting valid actions, and leaves the flow unchanged.

### 6. Close on the reusable pattern, about 30 seconds

Return to `/#/demo` and switch between the `Imperative` and `Declarative` filters.

- The 25 imperative tools accept structured requests and return structured local results.
- The 9 declarative tools populate visible forms on declared routes. Six auto-submit the visible form, while three stop for a person to review and submit.
- Programmatic Replay, the Explorer, and the Live State Inspector expose the same application activity at different levels.
- `/#/studio` applies this pattern to safe, user-authored local document tools and workflows.

The medication store is the concrete demo. The reusable result is an application architecture where agents see contracts and legal actions instead of guessing from the DOM.

## Recovery during a live demo

Do not enter real data or call an external service.

1. Use Replay Reset for a replay failure.
2. Use the state viewer's reset control for a selected workflow failure. Reset adds an event and preserves history.
3. Reload the exact hash route for a rendering problem.
4. Run the same seeded example once more.
5. If it still fails, record the route, viewport, visible error, console entry, and failed request.

See [ROLE_SCENARIOS.md](./ROLE_SCENARIOS.md), [SMOKE_TEST_MATRIX.md](./SMOKE_TEST_MATRIX.md), and [TESTING.md](./TESTING.md) for the complete evidence and limits.
