# Testing and release evidence

This file separates automated checks, rendered browser evidence, and work that is not configured. The detailed interaction record is in [SMOKE_TEST_MATRIX.md](./SMOKE_TEST_MATRIX.md).

## Evidence terms

- `PASS` means the stated command or manual check completed successfully.
- `PARTIAL` means useful evidence exists but does not cover the whole layer.
- `NOT CONFIGURED` means the repository has no test runner for that layer.

An automated pass is not an accessibility claim. ClearDose targets the engineering practices in [ACCESSIBILITY.md](./ACCESSIBILITY.md), but formal WCAG conformance needs a separate human audit.

## Runtime baseline

- Node.js 22.13.0 or newer
- Vue 3 and Vite with hash-history routes
- Fictional local seed data only
- Production preview at `http://127.0.0.1:4173/`

Use a clean install for release evidence. `npm run install:ci` is a cross-platform wrapper around `npm ci` for environments that need the Sites build wrapper.

## Release commands

Run from the repository root:

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run evals:contracts
npm run build
npm run smoke:app
npm ls --depth=0
git diff --check
```

Final local results on 2026-08-30:

| Layer | Result | Evidence |
| --- | --- | --- |
| Clean install | PASS | 181 packages installed from the lockfile. |
| Lint | PASS | ESLint checked JavaScript and Vue files with zero warnings. |
| Typecheck | PASS | `vue-tsc --noEmit` completed successfully. |
| Unit and integration | PASS | 99 passed, 0 failed. |
| Capability contracts | PASS | 34 catalog entries, 7 shortcut machines, 25 tool contracts, 23 eval journeys, and 15 positive smoke journeys. |
| Production build | PASS | Vite built the static application. |
| App smoke | PASS | The shell and 17 compiled feature modules loaded at `127.0.0.1:5173`. |
| Dependency tree | PASS | `npm ls --depth=0` reported 14 direct packages with no invalid entries. |
| Diff check | PASS | No whitespace errors. Git reported only line-ending conversion notices. |
| Automated browser E2E | NOT CONFIGURED | No Playwright, Cypress, or equivalent repository suite. |
| Automated accessibility scan | NOT CONFIGURED | No axe-core, pa11y, or equivalent runner. |

`npm run test:build` runs the repository tests followed by the production build.

## Test layers

| Layer | Command or method | What it checks | Limit |
| --- | --- | --- | --- |
| Static lint | `npm run lint` | JavaScript and Vue rules across source, tests, scripts, and configuration. | Does not render the app. |
| Type check | `npm run typecheck` | Vue template and module types without output files. | Does not prove domain behavior. |
| Unit and integration | `npm test` | Architecture boundaries, DTO privacy, local index, exact-package comparison, availability, persistence, workflow state, template safety, WebMCP, Explorer contracts, replay, shortcut replay, and static accessibility contracts. | Does not prove layout or assistive-technology behavior. |
| Capability contracts | `npm run evals:contracts` | Names, routes, machine ids, bounded schemas, examples, errors, generated static schema, and evaluation journeys. | Does not grant browser permission or exercise the rendered forms. |
| Production build | `npm run build` | Vite compilation and static asset generation. | Does not prove deployment access. |
| App smoke | `npm run smoke:app` | Starts the app, fetches the shell, and checks compiled feature modules. | It is not a click test. |
| Browser WebMCP smoke | `npm run evals:smoke` | Configured positive WebMCP journeys in a supported Chrome session. | This optional command was not the source of the recorded manual browser pass. |
| Model evaluation | `npm run evals:local` | Optional provider-backed scoring when credentials are configured. | Not part of the offline release gate. |
| Manual browser acceptance | [DEMO_GUIDE.md](./DEMO_GUIDE.md) | Routes, keyboard focus, real tool calls, replay, state, failures, responsive layout, console, and observed network behavior. | It is evidence, not automated regression protection. |

## Browser acceptance result

The production-preview pass loaded all 19 named routes and exercised the critical judge path. It verified:

- home search with Arrow Down and Enter;
- visible route-heading focus;
- all 25 native WebMCP registrations and one native Lisinopril search;
- Explorer success, malformed JSON, error announcement, recovery, timing, and focus;
- replay step, reset, run, pause, resume, restart, completion, and stable primary-control focus;
- exact-package comparison at Baltimore and Remote mock locations;
- a human-review doctor discussion card with no send control;
- a service failure, legal recovery, illegal transition rejection, and state reset;
- checkout validation focus and error associations;
- add-to-cart focus and live announcement;
- one main landmark on each route;
- no page-level horizontal scroll at 320 pixels after the final fix;
- no browser console error or warning during the final interaction pass.

The browser created one local-only mock order while verifying checkout completion. It transmitted nothing and charged nothing. The release screenshots avoid account and order state.

## Responsive evidence

Home, Explorer, comparison, state lab, and Studio were checked at:

- 320 by 800;
- 390 by 844;
- 768 by 1024;
- 1024 by 800;
- 1366 by 900.

At 320 pixels, the first pass found page-level horizontal scrolling from root sizing, the compact header, and a long Explorer receipt. The final CSS fix was rebuilt and rechecked. Document and body scroll widths then matched the 305-pixel client width after the Windows scrollbar.

## Accessibility evidence and limits

The core keyboard path is `PASS`. Visible focus, route focus, active-descendant search navigation, replay focus, Explorer focus, live statuses, checkout field errors, and one main landmark were observed in the browser.

The broader accessibility layer is `PARTIAL`. These checks were not completed:

- screen-reader traversal and announcement wording;
- automated contrast scanning;
- Windows forced-colors review;
- 200 percent zoom review;
- reduced-motion visual review;
- complete 44 by 44 pixel target sampling.

Do not describe ClearDose as WCAG conformant. The project has an engineering target only.

## Build advisory

The production build emits one JavaScript file at 914.51 kB before gzip and 250.96 kB after gzip. Vite reports the chunk-size advisory. All cold routes loaded in the production preview, so route splitting remains post-hackathon work instead of a submission blocker.

## Failure reporting

For a failed command, record the command, exit code, first actionable error, and affected file. For a browser failure, also record the hash route, seeded input, browser, viewport, console output, and failed request. Re-run the failed layer after the fix, then repeat the full release sequence before updating this file.
