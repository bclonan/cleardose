# Finalization task board

This board consolidates three independent read-only audits covering the seven requested workstreams: repository and architecture, WebMCP, data and state, judge UX, accessibility, QA, and submission readiness. Status changes require the listed acceptance check, not the presence of a file or control.

Status values are `OPEN`, `IN PROGRESS`, `BLOCKED`, `DEFERRED`, and `VERIFIED`.

## P0 submission blockers

### STATE-001: Keep authored memory text out of persistence

- Problem: The memory-packet tool accepts free-form goals, facts, decisions, and next steps, then stores the complete packet in the workflow database. A user could enter real health information even though ClearDose forbids retaining it.
- Evidence: `src/infrastructure/webmcp/tools/createDefaultTools.js`, `src/services/api/documents/agentMemoryPacket.js`, `src/services/workflows/WorkflowRuntime.js`, `src/infrastructure/persistence/DuckDbWasmDao.js`, and `src/views/HackathonShortcutsView.vue`.
- Expected behavior: The immediate local result may contain the authored packet for review, but persisted events and artifact rows contain metadata only. The form warns users to enter fictional data.
- Acceptance criteria: A unique sentinel appears in the immediate result and nowhere in DAO snapshots, workflow history, or stored artifact content.
- Owner: Data, state, and privacy workstream.
- Test requirement: Add workflow and persistence regression tests, then run `npm test`.
- Status: VERIFIED. Sentinel regression tests confirm authored packet and template text remains only in the immediate review result. Persisted events and artifacts contain counts and operational metadata.

### DOC-001: Complete the release documentation set

- Problem: The repository lacked the required finalization board, role scenarios, smoke matrix, testing guide, demo guide, submission checklist, submission draft, and final release report.
- Evidence: The prior `README.md` documentation index and the pre-audit `docs` inventory.
- Expected behavior: One linked, consistent documentation set describes only verified behavior and clearly marks missing external facts.
- Acceptance criteria: Create every required document, validate relative links, and reconcile feature counts and commands against the final code.
- Owner: Integration lead and documentation workstream.
- Test requirement: Link check plus a clean-read walkthrough of README setup and the judge demo.
- Status: VERIFIED. The required board, role matrix, smoke matrix, testing guide, demo guide, checklist, submission draft, screenshots, and release report exist and share current counts and status labels.

### SUBMIT-001: Verify a public production URL

- Problem: A hosted Sites URL exists, but access is owner-only. A judge cannot open it without a change to the access policy.
- Evidence: `https://cleardose-demo.bclonancode.chatgpt.site` loads for the owner. Sites access inspection reports no groups or external visitors.
- Expected behavior: A judge can open one recorded URL and complete the critical demo without local setup.
- Acceptance criteria: Verify the production URL at desktop and mobile widths, including console, network, replay, Explorer, and state inspection. Record it in final documentation.
- Owner: Release owner.
- Test requirement: Fresh browser acceptance run against the public URL.
- Status: BLOCKED on owner authorization. The private deployment can be refreshed safely, but making it public changes external access and requires explicit approval.

## P1 important quality fixes

### REPO-001: Remove the abandoned React and Cloudflare starter

- Problem: The Vue application shares the repository with an unused Next, React, shadcn, Vinext, Cloudflare Worker, and D1 starter plus its dependency tree.
- Evidence: `components/ui`, `hooks`, `lib`, `worker`, `db`, `drizzle`, `examples/d1`, `next.config.ts`, `components.json`, `drizzle.config.ts`, `postcss.config.mjs`, the Vinext install scripts, and unrelated packages in `package.json`.
- Expected behavior: Vue, Vite, Pinia, and the local DuckDB workflow store are the only application stack. Static hosting metadata remains intact.
- Acceptance criteria: Remove unused tracked files and packages. A clean install, typecheck, lint, build, unit suite, contract suite, and smoke run pass.
- Owner: Repository and build workstream.
- Test requirement: `npm ci`, all package quality gates, and `git diff --check`.
- Status: VERIFIED. Removed 81 unused starter files and 33 unused dependencies. Clean install and every active Vue quality gate pass.

### QA-001: Make lint cover Vue files

- Problem: The current Next and React ESLint configuration returns no config for `src/App.vue`, so the reported lint pass excludes the shipped interface.
- Evidence: `eslint.config.mjs`, `package.json`, and `eslint --print-config src/App.vue` returning `undefined`.
- Expected behavior: ESLint parses Vue single-file components and applies Vue and JavaScript rules without React rules.
- Acceptance criteria: `npm run lint` passes, and a temporary invalid Vue fixture fails lint.
- Owner: Build and QA workstream.
- Test requirement: Positive lint run and isolated negative-fixture proof.
- Status: VERIFIED. ESLint now parses Vue single-file components and runs with zero warnings.

### QA-002: Add a Vue-aware typecheck gate

- Problem: There is no typecheck script. The existing TypeScript configuration targets Next and TSX, then fails inside the unused Worker and D1 files.
- Evidence: `package.json`, `tsconfig.json`, `db/index.ts`, and `worker/index.ts`.
- Expected behavior: One documented Vue-aware no-emit command checks the active application and build configuration.
- Acceptance criteria: The command passes and a temporary invalid Vue binding or import makes it fail.
- Owner: Build and QA workstream.
- Test requirement: `npm run typecheck` plus an isolated negative-fixture proof.
- Status: VERIFIED. `npm run typecheck` runs `vue-tsc --noEmit` and passes.

### QA-003: Replace source-marker smoke confidence with rendered acceptance evidence

- Problem: `scripts/smoke-live-app.mjs` fetches the shell and source markers. It does not run controls or inspect console, network, keyboard, or responsive behavior.
- Evidence: `scripts/smoke-live-app.mjs` and the absence of an automated rendered-flow or accessibility script.
- Expected behavior: The production-like build receives a fresh browser run across every route and the critical judge flow. Automated gaps remain explicit.
- Acceptance criteria: Record route, console, network, keyboard, replay, Explorer, state, failure, reset, and responsive results in `docs/SMOKE_TEST_MATRIX.md`.
- Owner: QA and release workstream.
- Test requirement: Production preview browser run and the existing app smoke command.
- Status: VERIFIED. The production preview passed all 19 routes and the critical judge path. The rendered record is in `docs/SMOKE_TEST_MATRIX.md`.

### MCP-001: Register browser output schemas

- Problem: Catalog and local registry snapshots contain `outputSchema`, but the browser adapter omits it from `document.modelContext.registerTool()`.
- Evidence: `src/infrastructure/webmcp/BrowserWebMcpAdapter.js`, `src/infrastructure/webmcp/WebMcpToolRegistry.js`, and the capability catalog.
- Expected behavior: Browser registrations receive the exact declared input and output schemas.
- Acceptance criteria: A registration test captures and compares the output schema.
- Owner: WebMCP workstream.
- Test requirement: Extend `tests/webmcp.test.mjs` and run `npm test` plus contract evals.
- Status: VERIFIED. Browser registration includes catalog output schemas and the registration test compares them.

### MCP-002: Bound structured output schemas recursively

- Problem: Several output schemas allow arbitrary nested values through `additionalProperties: true`, and the contract validator checks only the root object.
- Evidence: `src/infrastructure/webmcp/catalog/capabilityCatalog.js` and `scripts/validate-webmcp-evals.mjs`.
- Expected behavior: Generic structured values have finite depth, bounded strings and arrays, and explicit object rules.
- Acceptance criteria: Contract validation rejects an unbounded schema and accepts every shipped example and actual result shape.
- Owner: WebMCP contracts workstream.
- Test requirement: `npm run evals:contracts` and WebMCP schema tests.
- Status: VERIFIED. Generic structured output uses eight finite bounded levels. Contract validation rejects recursive schema references.

### MCP-003: Make declarative autosubmit metadata truthful

- Problem: Canonical metadata says every declarative capability waits for human submission, but six declared forms call `requestSubmit()` during Try It and replay.
- Evidence: `capabilityCatalog.js`, `DeclarativeToolRunner.js`, `src/App.vue`, `HomeView.vue`, `DrugIndexView.vue`, `MedicationsView.vue`, and `ComparisonPanel.vue`.
- Expected behavior: The catalog states whether each form autosubmits and derives its permissions and expected response from that behavior.
- Acceptance criteria: Metadata and runtime receipts agree for all nine forms.
- Owner: WebMCP and UI workstream.
- Test requirement: Declarative catalog and replay tests for autosubmit and populate-only forms.
- Status: VERIFIED. Catalog permissions, expected responses, Try It receipts, and replay metadata distinguish autosubmit from populate-only behavior.

### MCP-004: Correct the price comparison package contract

- Problem: The tool description promises a closest-package fallback, but the domain correctly returns `PACKAGE_NOT_FOUND` for an unknown exact package.
- Evidence: `createDefaultTools.js`, `UniversalDrugIndex.js`, and capability recovery metadata.
- Expected behavior: Documentation and errors state that exact package identity is required and give a useful next action.
- Acceptance criteria: Invalid strength or quantity returns the documented typed error and recovery metadata.
- Owner: WebMCP and medication domain workstream.
- Test requirement: Registered-handler and local-index tests.
- Status: VERIFIED. Exact package identity is required and missing packages return documented recovery metadata.

### DATA-001: Replace stale DuckDB seed rows

- Problem: Seeding uses only insert-or-replace, so a drug removed from a later seed remains searchable in an existing browser database.
- Evidence: `src/infrastructure/persistence/DuckDbWasmDao.js` initialization and seeding queries.
- Expected behavior: Each seed version produces the exact current drug set and reports the stored row count.
- Acceptance criteria: Initialize seed A, then seed B, and confirm A-only identifiers disappear.
- Owner: Data and persistence workstream.
- Test requirement: Local-index and persistence migration regression tests.
- Status: VERIFIED. Seed replacement removes records absent from the current fixture in DuckDB and memory adapters.

### DATA-002: Reject conflicting location inputs

- Problem: Availability tools accept both `locationId` and `postalCode`, then silently prefer the identifier when the two disagree.
- Evidence: Availability schemas in `createDefaultTools.js` and `resolveDemoLocation()` in `availabilityFixtures.js`.
- Expected behavior: Matching pairs resolve; conflicting pairs return deterministic `LOCATION_MISMATCH` recovery.
- Acceptance criteria: Availability, comparison, and delivery calls all reject the same mismatch.
- Owner: Medication availability workstream.
- Test requirement: Availability and registered-tool tests for matching and conflicting pairs.
- Status: VERIFIED. Availability, comparison, and delivery reject mismatched location id and postal code with `LOCATION_MISMATCH`.

### STATE-002: Bound runtime inspection results

- Problem: The inspection limit caps events only. Repeated replay can grow flows, cards, artifacts, and memory packet summaries without a response limit.
- Evidence: `WorkflowRuntime.inspect()` and the inspect-tool schema.
- Expected behavior: Every returned collection has a documented cap and deterministic newest-first or chronological ordering.
- Acceptance criteria: More than the cap can be stored, while the response remains bounded and ordered.
- Owner: Workflow state workstream.
- Test requirement: Workflow and Explorer response-size tests.
- Status: VERIFIED. Flows, events, cards, artifacts, and memory summaries have deterministic caps and ordering.

### A11Y-001: Preserve the mobile Agent tools accessible name

- Problem: Mobile CSS hides the only text inside the Agent tools button, leaving an unnamed control in the accessibility tree.
- Evidence: `AgentControlCenter.vue` and the mobile rules in `src/styles/main.css`.
- Expected behavior: The button has a stable computed name at every width.
- Acceptance criteria: A 390-pixel browser snapshot exposes `Agent tools` in the button name.
- Owner: Accessibility and UI workstream.
- Test requirement: Mobile accessibility-tree check.
- Status: VERIFIED. The rendered control exposed `Agent tools (25)` at mobile widths.

### A11Y-002: Keep replay focus stable and announce status

- Problem: Run and Pause replace each other, focus falls to the document body, and start or completion is not announced.
- Evidence: `ProgrammaticReplayPanel.vue`.
- Expected behavior: Replay retains predictable keyboard focus and announces running, paused, resumed, completed, restarted, and reset states.
- Acceptance criteria: A keyboard-only replay never loses focus and the live region reports every state.
- Owner: Demo UX and accessibility workstream.
- Test requirement: Component contract tests plus browser keyboard verification.
- Status: VERIFIED. Step, reset, run, pause, resume, restart, and completion kept one stable primary focus target and updated the live status.

### A11Y-003: Announce Explorer results without losing focus

- Problem: Successful and failed invocations update a receipt without a useful live announcement, and the Invoke button loses focus.
- Evidence: `WebMcpExplorer.vue`.
- Expected behavior: Focus remains on a stable control or moves to a named result heading. A status message gives result, timing, and state-change summary.
- Acceptance criteria: Success and failure runs both expose the announcement and predictable focus.
- Owner: WebMCP UI and accessibility workstream.
- Test requirement: Explorer tests and browser keyboard verification.
- Status: VERIFIED. Success and malformed input produced visible announcements and predictable focus restoration.

### A11Y-004: Show route-change focus

- Problem: The router focuses `#main-content`, but CSS explicitly removes its outline.
- Evidence: `src/App.vue` and `src/styles/main.css`.
- Expected behavior: Keyboard users can see the focused main region or route heading after navigation.
- Acceptance criteria: Primary route changes show a visible focus indicator without altering pointer layouts.
- Owner: App shell and accessibility workstream.
- Test requirement: Browser keyboard route checks.
- Status: VERIFIED. Direct search navigation focused the destination heading with a visible outline.

### A11Y-005: Finish or simplify the home search combobox

- Problem: The field declares combobox, listbox, and option roles without Arrow, Enter, Escape, active-descendant, or selection behavior.
- Evidence: `src/views/HomeView.vue`.
- Expected behavior: Implement the full keyboard pattern or use a plain search field with ordinary result links.
- Acceptance criteria: The final semantics and keyboard behavior agree.
- Owner: Storefront and accessibility workstream.
- Test requirement: Keyboard and accessibility-tree browser checks.
- Status: VERIFIED. Arrow keys, active descendant, Enter, and Escape match the declared combobox semantics.

### A11Y-006: Announce checkout steps and associate validation errors

- Problem: Checkout replaces step content without focus or an announcement, and validation text is not linked to the invalid field.
- Evidence: `src/views/CheckoutView.vue`.
- Expected behavior: Step changes update the current-step semantics and announcement. Invalid submission identifies and focuses the first invalid field.
- Acceptance criteria: The complete and invalid checkout paths work with only the keyboard.
- Owner: Patient-flow and accessibility workstream.
- Test requirement: Browser checkout checks and focused unit coverage where practical.
- Status: VERIFIED. Invalid delivery and benefit steps focused the first field, set `aria-invalid`, and associated the alert. Review step focus also passed.

### A11Y-007: Announce add-to-cart confirmation

- Problem: A short-lived visual message is silent to assistive technology.
- Evidence: `src/views/MedicationDetailView.vue`.
- Expected behavior: A persistent-enough live status reports the added item and cart count while button focus remains stable.
- Acceptance criteria: Browser accessibility state exposes the confirmation before it clears.
- Owner: Storefront and accessibility workstream.
- Test requirement: Browser status and focus check.
- Status: VERIFIED. Button focus remained stable and the live status named the package and new cart count.

### A11Y-010: Remove the nested main landmark

- Problem: `CapabilityStudioView.vue` renders a `main` element inside the application shell's `main` element.
- Evidence: `src/App.vue` and `src/views/CapabilityStudioView.vue`.
- Expected behavior: Every route has one top-level main landmark.
- Acceptance criteria: The Studio accessibility tree contains one main landmark.
- Owner: Accessibility and Studio workstream.
- Test requirement: Static markup check and browser accessibility-tree check.
- Status: VERIFIED. Studio and every other named route rendered one main landmark.

### UX-001: Replace unsupported home metrics

- Problem: The home page claims more than 1,000 medications and a 50-state experience, while the seed has 52 medications and three fictional locations.
- Evidence: `HomeView.vue`, `drugConcepts.js`, and `availabilityFixtures.js`.
- Expected behavior: Judge-facing claims use exact seeded counts or plainly scoped demo wording.
- Acceptance criteria: A data-to-copy test prevents unsupported counts from returning.
- Owner: Demo UX and domain workstream.
- Test requirement: Architecture or catalog contract test plus browser copy review.
- Status: VERIFIED. Home reads and displays 52 medication concepts and 3 deterministic locations from the store summary.

### UX-002: Keep provider handoff copy inside the sandbox boundary

- Problem: The doctor handoff page instructs users to request a real e-prescription and displays a fictional routing identifier despite nearby no-send copy.
- Evidence: `src/views/ContactDoctorView.vue`.
- Expected behavior: Every provider action is framed as a local preview. No copy asks someone to send fictional routing data.
- Acceptance criteria: Safety review finds no real-world action instruction, and unsafe tool requests remain refused.
- Owner: Domain safety and product copy workstream.
- Test requirement: Copy contract test and browser review.
- Status: VERIFIED. The page no longer asks users to send fictional routing data and repeats the local-preview boundary.

### DOC-002: Reconcile README, agent guide, and submission copy

- Problem: The README lacks the final judge sequence, verified deployment status, Node requirement, and final testing matrix. `AGENTS.md` does not identify generated files or a release definition of done.
- Evidence: `README.md`, `AGENTS.md`, and `HACKATHON_ENTRY.md`.
- Expected behavior: README is the entry point, existing specialist docs stay canonical, and release facts agree across files.
- Acceptance criteria: A clean-checkout reader can install, test, and run the local judge demo without author guidance.
- Owner: Documentation workstream.
- Test requirement: Manual documentation rehearsal and relative-link check.
- Status: VERIFIED. README, agent guide, testing evidence, judge guide, and submission draft agree on commands, counts, access, and limitations.

### SUBMIT-003: Capture verified submission media

- Problem: The repository has no screenshots or demo video, and README has no visual preview.
- Evidence: Tracked media inventory and `README.md`.
- Expected behavior: At least the main demo, Explorer, and state inspector have current screenshots taken from the final build.
- Acceptance criteria: Referenced files render in README and match the accepted UI.
- Owner: UX and submission workstream.
- Test requirement: Open each media link from the repository and inspect it.
- Status: VERIFIED. Home, Explorer, and Live State Inspector screenshots were captured from the final production-preview build and inspected.

## P2 polish

### ARCH-001: Centralize route normalization

- Problem: Seven files repeat detail-route normalization and one omits order details.
- Evidence: Replay runtime, scenario catalogs, and demo components.
- Expected behavior: One helper normalizes route names for scenario lookup and replay.
- Acceptance criteria: Medication, order, confirmation, query, and hash inputs share one result.
- Owner: Replay runtime workstream.
- Test requirement: Focused route-normalization unit tests.
- Status: VERIFIED. Seven consumers now use `src/domain/shared/demoRoute.js`, with detail, query, hash, and confirmation tests.

### ARCH-002: Move preference persistence and document observation behind lifecycle-safe services

- Problem: Agent Control Center accesses `localStorage` directly, and the plugin adds a document submit listener without disposal.
- Evidence: `AgentControlCenter.vue` and `createClearDosePlugin.js`.
- Expected behavior: Storage denial is harmless and plugin teardown removes global listeners.
- Acceptance criteria: Denied storage does not break the dialog; reinstalling the plugin does not duplicate events.
- Owner: Application architecture workstream.
- Test requirement: Storage-denial and lifecycle tests.
- Status: VERIFIED. Storage denial falls back safely and app teardown disposes the declarative observer.

### REPO-002: Resolve unreachable legacy demo components

- Problem: `PromptGuide.vue` and `HackathonLauncher.vue` remain registered and styled but no route mounts them.
- Evidence: `componentRegistry.js`, `docs/PROMPT_GUIDE.md`, and related CSS and tests.
- Expected behavior: Mount them intentionally or remove the unreachable code and claims.
- Acceptance criteria: Every globally registered demo component has a documented consumer.
- Owner: Demo UX workstream.
- Test requirement: Reachability review and route smoke.
- Status: VERIFIED. Removed the two unreachable launchers, their registry entries, obsolete styles, and stale tests.

### DEP-003: Measure and reduce the eager bundle

- Problem: The production build emits one JavaScript asset around 908 KB and one stylesheet around 167 KB before compression.
- Evidence: Current `npm run build` output and eager route imports in `src/router.js`.
- Expected behavior: Measure after dependency cleanup and lazy-load route views if the warning remains material.
- Acceptance criteria: Build report is recorded and every cold route still loads.
- Owner: Frontend build workstream.
- Test requirement: Production build plus route-by-route smoke.
- Status: DEFERRED. Final JavaScript is 914.51 kB before gzip and 250.96 kB after gzip. Every cold route loaded, so route splitting remains post-hackathon work.

### STATE-003: Align workflow ZIP naming with tool naming

- Problem: A workflow transition uses `zip`, while its related availability tool uses `postalCode`.
- Evidence: `workflowDefinitions.js` and `createDefaultTools.js`.
- Expected behavior: Related transition and tool contracts share one field name or an explicit mapping.
- Acceptance criteria: A compatibility assertion covers every related tool.
- Owner: Workflow contracts workstream.
- Test requirement: Workflow schema tests.
- Status: VERIFIED. Workflow and tool contracts now use `postalCode`.

### MCP-005: Keep template save status tied to actual registration

- Problem: The service can preserve `autoRegister` during save and report registered before registry mutation.
- Evidence: `CapabilityTemplateService.js`.
- Expected behavior: Save produces a draft; register is the only registration action.
- Acceptance criteria: Direct service tests cannot create a registered status through save alone.
- Owner: Capability Studio workstream.
- Test requirement: Template service tests.
- Status: VERIFIED. Save creates a draft. Register and unload are explicit separate actions.

### DATA-003: Align cart schema and domain limits

- Problem: The cart output schema caps 100 items, while the mock domain can hold 156 distinct variants.
- Evidence: Capability catalog and `MockPharmacyApi.js`.
- Expected behavior: Enforce one shared cart-line limit or raise the schema bound to the domain maximum.
- Acceptance criteria: The 100th and 101st additions follow the documented rule.
- Owner: Commerce domain workstream.
- Test requirement: Cart and tool contract tests.
- Status: VERIFIED. Shared domain limits allow 100 lines and 3 units per line. The 101st line fails without mutation.

### MCP-006: Complete the Studio declarative schema

- Problem: The declarative Studio capability cannot describe input fields or workflow states present in the visible form.
- Evidence: Capability catalog and `CapabilityStudioView.vue`.
- Expected behavior: The contract fully describes a fresh draft or clearly limits itself to editing prepared drafts.
- Acceptance criteria: A fresh-draft replay produces a valid, runnable saved draft.
- Owner: Capability Studio workstream.
- Test requirement: Template and replay tests.
- Status: VERIFIED. Declarative replay prepares only a fresh one-input document draft and cannot save or register it.

### A11Y-008: Meet the 44-pixel target consistently

- Problem: Several rendered controls and links fall below the project's 44-pixel engineering target.
- Evidence: Browser measurements across the brand, cart, filters, Explorer, Studio, and footer.
- Expected behavior: Non-inline controls meet 44 by 44 CSS pixels or use valid target spacing.
- Acceptance criteria: Target-size sampling passes at 390, 768, and 1280 pixels.
- Owner: Design system workstream.
- Test requirement: Rendered measurement audit.
- Status: DEFERRED. Core controls were keyboard tested, but a complete target-size measurement at every requested width was not recorded.

### A11Y-009: Add an enforceable contrast gate

- Problem: The documented AAA target has no automated contrast check, and placeholder text is below 7:1 on white.
- Evidence: `src/styles/main.css` and `docs/ACCESSIBILITY.md`.
- Expected behavior: Targeted normal text meets the documented contrast goal, with forced-colors behavior still intact.
- Acceptance criteria: Automated scan plus manual forced-colors review.
- Owner: Design system and QA workstream.
- Test requirement: Contrast scanner and browser review.
- Status: DEFERRED. Automated contrast scanning and manual forced-colors review are not configured for this freeze.

### UX-003: Put the judge demo above the fold

- Problem: The home page leads with storefront search, while the explicit WebMCP judge path begins on `/demo`.
- Evidence: `HomeView.vue`.
- Expected behavior: Home keeps its patient task and adds one clear `Run the judge demo` route.
- Acceptance criteria: First-time users can find the judge path at desktop and mobile widths.
- Owner: Demo UX workstream.
- Test requirement: Browser discovery check.
- Status: VERIFIED. `Run the judge demo` was visible and usable at desktop and mobile widths.

## Won't fix or post-hackathon

### SUBMIT-002: Project license choice

- Problem: No root project license or `package.json` license field exists.
- Evidence: Repository root and package manifest.
- Decision: The release audit can report the absence, but choosing an open-source license grants legal rights and requires the repository owner's decision.
- Acceptance criteria: The owner chooses a license and confirms any attribution requirements before it is added.
- Owner: Repository owner.
- Test requirement: Manual license and attribution review.
- Status: BLOCKED on owner choice.

### QA-004: Automated end-to-end and accessibility suites

- Problem: No Playwright, Cypress, or automated accessibility runner is configured.
- Evidence: Package scripts and test inventory.
- Decision: Complete the required manual production-browser acceptance now. Keep automated E2E and accessibility status explicit rather than adding a rushed second test stack.
- Acceptance criteria: Post-hackathon work adds a stable rendered-flow suite and automated scan without replacing manual assistive-technology review.
- Owner: QA workstream.
- Test requirement: Future CI run.
- Status: DEFERRED.

## Verified complete

- The working branch `reduce` started clean and separate from `main`.
- All 19 named routes map to existing Vue views, and the catch-all redirects to home.
- Presentation does not import raw seed fixtures. Pinia, facade, repositories, mock API, UDI, and DAOs form one documented application path.
- The canonical catalog has 34 unique capabilities: 25 imperative tools and nine declarative forms.
- Tool input schemas are closed and runtime validation rejects unknown properties.
- Imperative WebMCP, Explorer Try It, and Programmatic Replay invoke the same local registry handlers.
- Versioned state dispatch rejects stale writes, duplicates, invalid edges, and human-only actions with structured errors.
- The seeded UDI contains 52 drug records, 156 packages, 624 offers, four providers, and three fictional locations with stable identifiers.
- Comparison eligibility uses explicit relationships. Unrelated medications return typed incompatibility instead of a misleading ranking.
- Final gates pass: clean install, production build, Vue lint, Vue typecheck, 99 tests, 34-capability catalog validation, 25 tool contracts, 23 eval journeys, 15 smoke journeys, live app smoke, dependency inspection, and diff check.
- The production-preview browser pass loaded all 19 named routes and exercised the critical judge path, native WebMCP, keyboard focus, console, observed network activity, and responsive layouts.
- Current release media includes the home, WebMCP Explorer, Live State Inspector, and the generated social card.
- No application TODO, FIXME, HACK, debugger, temporary backup file, or debug logging was found.
- The app retains visible fictional-data, no-medical-advice, no-real-fulfillment, and human-control boundaries.
