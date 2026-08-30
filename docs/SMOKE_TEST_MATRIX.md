# Smoke test matrix

Run date: 2026-08-30

Target: production preview at `http://127.0.0.1:4173/`

Browser: Codex in-app Chromium session

`PASS` means the listed behavior was exercised in the rendered build. `PARTIAL` means automated or source evidence passed but the full manual check was not run. `NOT CONFIGURED` means no repository automation exists for that layer.

## Required matrix

| Area | Test | Expected | Result | Evidence |
| --- | --- | --- | --- | --- |
| Landing | Initial load | No errors | PASS | Home showed the sandbox boundary, 52 medication concepts, 3 locations, search, and the judge link. |
| Navigation | Every nav destination | Valid route | PASS | All 19 named routes loaded directly with one main landmark and the expected route content. |
| Search | Valid medication | Results | PASS | Typed `lisi`, used Arrow Down and Enter, and reached the Lisinopril detail route. |
| Search | Unknown medication | Empty state | PARTIAL | Domain and UI contracts cover empty results. The final rendered pass did not repeat this case. |
| Compare | Valid exact-package comparison | Comparison | PASS | Lisinopril 10 mg, quantity 60 returned exact-package provider offers. |
| Compare | Invalid pair | Blocked and explained | PASS | A native Lisinopril plus Atorvastatin call returned `INCOMPATIBLE_COMPARISON` with retry and recovery details. |
| Availability | Change ZIP | Updated results | PASS | Baltimore showed a $38.95 delivered total and 1 to 2 day shipping. Remote showed $42.95 and 4 to 5 day shipping. |
| Availability | Out of stock | Recovery options | PARTIAL | Automated fixture coverage passed. The rendered pass used the service-failure recovery instead of an out-of-stock card. |
| Prompt cards | Copy | Correct prompt | PARTIAL | Full prompts and visible Copy controls were inspected on route cards. Clipboard output was not used as release evidence. |
| Replay | Start | Runs visibly | PASS | The six-step replay completed through the shared handlers. |
| Replay | Pause | Stops | PASS | Pause stopped after the active call and the same primary control became Resume. |
| Replay | Step | One action | PASS | Step executed exactly one action and left replay paused. |
| Replay | Reset | Original fixture | PASS | Reset returned replay to `IDLE` and restored focus to Reset. |
| MCP Explorer | List tools | Registry matches | PASS | Explorer showed 34 canonical catalog entries and 25 browser registrations. Its local replay count remained visible as a separate live-registry value. |
| MCP Explorer | Try It | Real tool execution | PASS | Seeded `cleardose_search_drug_index` returned one Lisinopril result, timing, and bounded state changes. |
| State | Inspect | Correct state | PASS | The viewer showed three seeded flows, current state, version, and event history. |
| State | Branch | Valid next actions | PASS | A legal retry moved the selected failure flow from `error` to `checking_availability`. |
| State | Illegal transition | Structured failure | PASS | `COMPARE` from `checking_availability` returned `INVALID_TRANSITION` without changing the flow. |
| Failure | Service error | UI recovers | PASS | `MOCK_SERVICE_FAILED` exposed `RETRY_CHECK_AVAILABILITY`; dispatching it advanced the same versioned flow. |
| Accessibility | Keyboard | Core flow usable | PASS | Search suggestions, route focus, replay controls, Explorer success and error focus, checkout errors, and checkout step focus were exercised by keyboard. |
| Responsive | Mobile viewport | No major breakage | PASS | Home, Explorer, comparison, state lab, and Studio passed at 320, 390, 768, 1024, and 1366 pixel widths. No page-level horizontal scrolling remained at 320. |

## Route inventory

Each route loaded directly in the production preview. The check recorded the document title, primary heading, visible content, and one main landmark.

| Route | Result |
| --- | --- |
| `/#/` | PASS |
| `/#/medications` | PASS |
| `/#/medications/lisinopril` | PASS |
| `/#/cart` | PASS |
| `/#/login` | PASS |
| `/#/create-account` | PASS |
| `/#/account` | PASS |
| `/#/account/prescriptions` | PASS |
| `/#/account/orders` | PASS |
| `/#/account/orders/CLR-10482` | PASS, expected unauthenticated empty state |
| `/#/checkout` | PASS |
| `/#/checkout/confirmation/CLR-10482` | PASS |
| `/#/contact-doctor` | PASS |
| `/#/compare` | PASS |
| `/#/demo` | PASS |
| `/#/udi` | PASS |
| `/#/flow-lab` | PASS |
| `/#/shortcuts` | PASS |
| `/#/studio` | PASS |

## Console and network

| Check | Result | Evidence |
| --- | --- | --- |
| Console exceptions and warnings | PASS | No error or warning entries appeared after the full interaction pass. |
| Required application assets | PASS | The final Studio inventory contained the same-origin built JavaScript and CSS assets. No required asset failure appeared. |
| Unexpected real service calls | PASS | No pharmacy, clinician, insurer, payment, analytics, or patient-record endpoint appeared. |
| Native WebMCP registration | PASS | The browser exposed all 25 registered tools. A native search call returned the seeded Lisinopril record. |
| Browser without WebMCP | PARTIAL | Progressive fallback has automated coverage. The final rendered session used a WebMCP-capable browser. |

## Accessibility limits

The core keyboard path passed, but this is not a WCAG conformance report. A screen reader, automated contrast scanner, 200 percent zoom pass, reduced-motion visual pass, and Windows forced-colors review were not completed. Those items remain `PARTIAL` in the release report.

## Automation limits

Automated end-to-end browser tests: `NOT CONFIGURED`.

Automated accessibility scanner: `NOT CONFIGURED`.
