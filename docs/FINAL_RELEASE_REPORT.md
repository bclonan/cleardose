# Final release report

Date: 2026-08-30

Branch: `reduce`

## What was audited

Independent read-only passes covered repository architecture, dependencies, routes, state, persistence, mock data, WebMCP registration, capability metadata, replay, first-use UX, accessibility, browser QA, and submission readiness. Findings were recorded in [FINALIZATION_TASKBOARD.md](./FINALIZATION_TASKBOARD.md) before broad edits began.

## What was consolidated

- One active Vue, Vite, and Pinia application stack remains.
- `capabilityCatalog.js` is the canonical manifest for Explorer, schemas, prompts, routes, permissions, scenarios, and registration metadata.
- UI, browser WebMCP, Explorer, and Programmatic Replay call the same local registry handlers.
- Demo route normalization now lives in one domain helper.
- Cart capacity, voice preferences, declarative form observation, clipboard behavior, and workflow input naming each have one owner.
- The role matrix, testing record, smoke matrix, demo guide, submission checklist, and submission draft now use the same counts and commands.

## What was removed

- 81 unused React, Next, shadcn, Cloudflare Worker, D1, Drizzle, and starter asset files
- 33 unused dependencies
- 2 unreachable demo launcher components plus obsolete registry entries, tests, and styles
- Next and React lint and TypeScript settings that did not check the shipped Vue interface
- shell-only install and build wrappers that did not work consistently on Windows

The repository now has 14 direct packages: 5 runtime dependencies and 9 development dependencies.

## What was fixed

- Browser registration now includes declared output schemas.
- Generic structured output schemas have finite bounded depth. Contract validation rejects recursion.
- Workflow dispatch input names, counts, and string values are bounded at registration and validated again at runtime.
- Declarative autosubmit metadata matches actual visible form behavior.
- Exact package comparison no longer promises a fallback it does not perform.
- Seed replacement removes stale DuckDB and memory rows.
- Conflicting location id and postal code inputs return `LOCATION_MISMATCH`.
- Runtime inspection caps every returned collection.
- Authored memory and template text stays out of persistence. Only bounded operational metadata remains.
- Template save, preview, import, registration, and unload remain separate actions.
- Cart schemas and domain behavior share the 100-line and 3-unit limits.
- Mobile Agent tools naming, replay focus, Explorer focus, route focus, checkout errors, add-to-cart feedback, home combobox behavior, and Studio landmarks were corrected.
- Home counts now match the 52 concepts and 3 locations in the seed.
- Provider handoff copy no longer asks anyone to send fictional routing details.
- The compact header and Explorer receipts no longer cause page-level horizontal scrolling at 320 pixels.
- Explorer jump controls and the skip link preserve the current hash route and move focus to their intended content.

## What was intentionally left unchanged

- The established component, Pinia, facade, repository, API, UDI, DAO, and workflow architecture
- Browser-local DuckDB-Wasm and OPFS persistence, memory fallback, and `BroadcastChannel` replication
- Hash-history routing for static hosting
- Visible human control over checkout, external contact, clipboard, file writes, generated documents, and user-authored capability registration
- The local-only fictional safety boundary
- The initial bundle structure. Route splitting is useful, but it is not worth changing the stable application loader during the submission freeze.
- Automated browser E2E and accessibility tooling. The manual production-browser pass was completed instead of adding a rushed second test stack.

## Tests executed

| Verification | Result | Detail |
| --- | --- | --- |
| Clean install | PASS | `npm ci` installed 181 packages from the lockfile. |
| Build | PASS | Vite produced the static application. |
| Typecheck | PASS | `vue-tsc --noEmit`. |
| Lint | PASS | Vue and JavaScript files, zero warnings. |
| Unit | PASS | Included in 99 passing repository tests. |
| Integration | PASS | Included in the same 99-test serial suite. |
| Capability contracts | PASS | 34 catalog entries, 25 tool contracts, 23 eval journeys, 15 smoke journeys. |
| App smoke | PASS | Shell plus 17 compiled modules. |
| Dependency tree | PASS | `npm ls --depth=0`. |
| Diff integrity | PASS | `git diff --check`, line-ending notices only. |
| E2E | NOT CONFIGURED | No repository Playwright or Cypress suite. |
| Accessibility | PARTIAL | Core keyboard path passed. No scanner, screen reader, forced-colors, full zoom, or full target-size audit. |
| Browser smoke | PASS | All named routes and the critical judge path passed in the production preview. |
| Console | PASS | No errors or warnings after the interaction pass. |
| Network | PASS | No failed required assets or real pharmacy, clinician, insurer, payment, analytics, or patient-record calls observed. |
| Responsive | PASS | Critical routes passed at 320, 390, 768, 1024, and 1366 pixel widths. |
| Deployment | PARTIAL | The Sites build loads for the owner. Public judge access is not authorized. |

## Browser scenarios executed

- Direct load of all 19 named routes
- Keyboard search from `lisi` to the Lisinopril detail page
- Native browser WebMCP registration and native Lisinopril search
- Explorer seeded success, malformed JSON, visible error, recovery, timing, and focus
- Replay step, reset, run, pause, resume, restart, completion, and call inspection
- Baltimore and Remote exact-package comparison
- Unrelated medication rejection
- Human-review doctor discussion card
- Service failure, legal retry, illegal transition rejection, and workflow reset
- Add to mock cart with live feedback
- Delivery and benefit-form checkout validation
- Local-only mock order completion with no transmission or charge
- Responsive checks of home, Explorer, comparison, state lab, and Studio

## Known limitations

- The hosted URL is owner-only.
- No project license has been selected.
- Official hackathon and Devpost event data is absent.
- Automated browser E2E and accessibility scanning are not configured.
- The 914.51 kB initial JavaScript file triggers Vite's chunk-size advisory.
- Formal WCAG conformance has not been assessed.

## Remaining post-hackathon work

- Add stable browser E2E coverage for the judge path and important recovery paths.
- Add automated contrast checks, then complete screen-reader, zoom, forced-colors, and target-size review.
- Split route code and measure cold-route loading again.
- Consider clearing stale state selections in the Live State Inspector after a legal transition changes the valid action set.

## Final architecture summary

```text
Vue view or reusable component
  -> Pinia action
  -> ClearDoseFacade
  -> repository adapter
  -> fictional API and Universal Drug Index
  -> browser commerce DAO

Visible UI, WebMCP, Explorer, or replay
  -> one registered local handler
  -> versioned WorkflowRuntime
  -> DuckDB-Wasm and OPFS, or explicit memory fallback
  -> BroadcastChannel
  -> Live State Inspector
```

The facade remains the application API. Views do not import seed data or persistence. WebMCP exposes bounded capabilities and legal actions, not hidden completion tools.

## Final registered WebMCP tool inventory

The final browser session registered these 25 imperative tools:

1. `cleardose_search_drug_index`
2. `cleardose_get_drug_index_entry`
3. `cleardose_find_compatible_options`
4. `cleardose_compare_medication_options`
5. `cleardose_compare_drug_prices`
6. `cleardose_find_related_drugs`
7. `cleardose_get_drug_availability`
8. `cleardose_compare_drug_availability`
9. `cleardose_estimate_delivery`
10. `cleardose_review_demo_interaction_flags`
11. `cleardose_build_procurement_plan`
12. `cleardose_prepare_doctor_question_card_request`
13. `cleardose_submit_doctor_question_card_draft`
14. `cleardose_prepare_prescription_follow_up`
15. `cleardose_prepare_agent_memory_packet`
16. `cleardose_inspect_workflow_runtime`
17. `cleardose_inspect_workflow_state`
18. `cleardose_get_workflow_history`
19. `cleardose_get_available_workflow_actions`
20. `cleardose_get_workflow_transition`
21. `cleardose_dispatch_workflow_transition`
22. `cleardose_reset_workflow_state`
23. `cleardose_highlight_section`
24. `cleardose_get_cart`
25. `cleardose_add_to_cart`

The canonical catalog also contains nine declarative forms for global, home, UDI, medication catalog, comparison, provider note, question card, and Studio fields. Their exact routes and submit behavior are listed in [ROLE_SCENARIOS.md](./ROLE_SCENARIOS.md).

## Final route inventory

| Route | Purpose |
| --- | --- |
| `/#/` | Home and medication search |
| `/#/medications` | Medication catalog |
| `/#/medications/:slug` | Medication details |
| `/#/cart` | Local mock cart |
| `/#/login` | Fictional sign-in |
| `/#/create-account` | Fictional local account creation |
| `/#/account` | Local patient summary |
| `/#/account/prescriptions` | Fictional prescription list |
| `/#/account/orders` | Local mock orders |
| `/#/account/orders/:id` | Mock order details |
| `/#/checkout` | Human-controlled mock checkout |
| `/#/checkout/confirmation/:id` | Local confirmation |
| `/#/contact-doctor` | Provider handoff preview |
| `/#/compare` | Semantic package and provider comparison |
| `/#/demo` | WebMCP Explorer and replay entry |
| `/#/udi` | Universal Drug Index |
| `/#/flow-lab` | Live State Inspector and failures |
| `/#/shortcuts` | Judge prompt workbench |
| `/#/studio` | Safe local Capability Studio |

## Submission readiness

The implementation and local release evidence are complete. Submission is still blocked by three owner or event decisions:

1. Authorize a public judge URL and rerun the production path there.
2. Choose a project license and confirm attribution requirements.
3. Configure the official hackathon or Devpost event details and required fields.

NOT READY FOR SUBMISSION
