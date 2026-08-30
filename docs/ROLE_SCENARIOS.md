# Role scenarios

This file defines the release acceptance stories for each ClearDose role. It does not replace the [judge demo path](./DEMO_GUIDE.md) or the [test plan](./TESTING.md).

ClearDose is a fictional, local-only sandbox. A successful story must not contact a pharmacy, clinician, insurer, payment processor, or patient record. Seeded clinical fields are incomplete informational samples. They never establish equivalence, recommend a substitution, or replace professional review.

## Evidence labels

- **Automated** means a repository test or contract gate checks the underlying behavior. It does not mean the rendered browser flow has been accepted.
- **Source-audited** means the route, component, catalog entry, schema, or seeded fixture was checked in source.
- **Rendered** means the final production-preview pass exercised that story. Stories without this label rely on automated and source evidence only.

## Patient and consumer

| Story | Acceptance outcome | Main route and seeded case | Evidence |
| --- | --- | --- | --- |
| PATIENT-001 | A patient searches for a medication and reaches matching local records. | `/#/` or `/#/udi`; search `lisinopril`, which resolves to `med_lisinopril`. | Automated search coverage; source-audited UI; rendered PASS. |
| PATIENT-002 | A patient compares the same indexed medication and exact package across fictional providers. The result keeps price, pickup, shipping, and stock facts tied to the selected package and location. | `/#/compare`; `med_lisinopril`, `lisinopril-10mg-60`, `demo-baltimore`. | Automated comparison and availability coverage; rendered PASS. |
| PATIENT-003 | A patient can review an explicitly seeded discussion relationship. The UI labels `med_losartan` as discussion only and never calls it equivalent to or a substitute for `med_lisinopril`. | `/#/compare`; anchor Lisinopril, purpose `Doctor discussion`, allowed record Losartan. | Automated compatibility coverage; source-audited labels. |
| PATIENT-004 | An unrelated pair is rejected with `INCOMPATIBLE_COMPARISON`, a retryable flag, and a useful recovery tool. No ranking is produced. | `/#/demo`; run the `Rejected unrelated pair` request for `med_lisinopril` and `med_atorvastatin`. | Automated negative-case coverage; rendered PASS through native tool invocation. |
| PATIENT-005 | A patient can request the lowest-total compatible fictional plan. The result remains a local review plan and does not place an order. | `/#/demo`; `cleardose_build_procurement_plan` with the seeded balanced or lowest-total example. | Automated procurement coverage; source-audited contract. |
| PATIENT-006 | A patient can require delivery within a bounded deadline. Matching offers include an arrival window, while a missed deadline returns `DELIVERY_WINDOW_MISSED`. | `/#/demo`; Lisinopril 10 mg, quantity 60, Baltimore, shipping within 3 days. The negative seed uses Atorvastatin 40 mg, quantity 90, Remote, within 3 days. | Automated availability coverage; source-audited Explorer fixtures. |
| PATIENT-007 | Changing the fictional location changes provider distance, shipping cost, and delivery results without storing free-form location data. | `/#/compare`; compare `demo-baltimore` at 21201 with `demo-remote` at 59001. | Automated location coverage; rendered PASS. |
| PATIENT-008 | A patient can create an informational doctor discussion card from trusted seeded facts. The card stays in human review and nothing is sent. | `/#/compare`; select `Build a doctor discussion card`. | Automated structured-exchange coverage; rendered PASS. |

## Doctor and clinical discussion demo

The second required doctor story refers to "equivalent seeded alternatives." ClearDose does not make that claim. Acceptance requires the safer behavior below: only explicit seeded discussion relationships appear, and the result says they are not equivalent or interchangeable.

| Story | Acceptance outcome | Main route and seeded case | Evidence |
| --- | --- | --- | --- |
| DOCTOR-001 | The discussion view identifies the exact selected medication and package. | `/#/compare`; `med_lisinopril`, `lisinopril-10mg-60`. | Automated DTO and comparison coverage; rendered PASS. |
| DOCTOR-002 | The view lists only explicit seeded discussion relationships, labels coverage as incomplete, and states that the records are not equivalent or substitutes. | `/#/compare`; Lisinopril with Losartan under `Doctor discussion`. | Automated compatibility coverage; source-audited labels. |
| DOCTOR-003 | Fictional price, stock, pickup, shipping, and delivery facts remain attached to a seeded location and provider. | `/#/compare`; Baltimore demo area, 21201. | Automated availability coverage; rendered PASS. |
| DOCTOR-004 | Common side-effect and warning fields display as incomplete sample data and require professional review. | `/#/compare`; inspect the Lisinopril fact card. | Automated sanitized DTO coverage; source-audited labels. |
| DOCTOR-005 | The local two-call exchange produces a structured question card with neutral questions and leaves it in `human_review`. | `/#/flow-lab`; Lisinopril, Losartan, fictional concerns. | Automated exchange and schema coverage; rendered PASS through the comparison card path. |

## WebMCP agent

| Story | Acceptance outcome | Main route and contract | Evidence |
| --- | --- | --- | --- |
| AGENT-001 | An agent can discover route-relevant declarative forms and the route-independent imperative catalog. | Any route; inspect the capability manifest and current route status. | Automated catalog contracts; rendered PASS. |
| AGENT-002 | An agent can inspect bounded flows, event ids, current states, versions, and context without receiving profile data or passwords. | `cleardose_inspect_workflow_runtime` and `cleardose_inspect_workflow_state`. | Automated runtime and sanitization coverage; source-audited schemas. |
| AGENT-003 | A valid bounded request reaches the same Pinia, facade, API, and workflow path used by the visible UI. | `cleardose_search_drug_index` with `{"query":"lisinopril","limit":5}`. | Automated integration and WebMCP coverage; rendered native-tool PASS. |
| AGENT-004 | The response is deterministic structured data with `ok`, bounded result fields, and structured failure fields when needed. | Run the seeded Lisinopril search, then a seeded negative request. | Automated schema coverage; rendered success and failure PASS. |
| AGENT-005 | An agent can list valid, human-only, and disabled actions for an exact flow version. | `cleardose_get_available_workflow_actions`. | Automated workflow coverage; source-audited contract. |
| AGENT-006 | An agent can dispatch one declared non-human transition with the current version and a unique request id. | `cleardose_dispatch_workflow_transition` after reading the current state. | Automated transition and persistence coverage; source-audited contract. |
| AGENT-007 | An undeclared action, stale version, duplicate request, or human-only action fails with a stable code and no hidden side effect. | Explorer seeded failures for `cleardose_get_workflow_transition` and `cleardose_dispatch_workflow_transition`. | Automated negative-state coverage; rendered illegal-transition PASS. |
| AGENT-008 | The failure response names a legal recovery. The agent can inspect current actions or reset the local flow without erasing history. | `cleardose_get_available_workflow_actions`, `cleardose_get_workflow_history`, then `cleardose_reset_workflow_state` when allowed. | Automated recovery coverage; rendered recovery and reset PASS. |

## Developer

| Story | Acceptance outcome | Main route and action | Evidence |
| --- | --- | --- | --- |
| DEV-001 | A developer can open the WebMCP Explorer without an external agent. | `/#/demo`, then `Inspect tools`. | Rendered PASS. |
| DEV-002 | The Explorer lists all 34 built-in capabilities and reports their interaction model and route status. | `/#/demo`; use `All`, `Imperative`, and `Declarative` filters. | Automated 25 plus 9 catalog contract; rendered PASS. |
| DEV-003 | A developer can inspect closed input and output schemas, permissions, machine id, related tools, and deterministic errors. | Select any Explorer item and open its schema details. | Automated schema contracts; source-audited UI. |
| DEV-004 | A developer can load a predefined success or failure request. | Select `Seeded success`, `Rejected unrelated pair`, or another named fixture. | Rendered seeded-success PASS; other named fixtures are source-audited. |
| DEV-005 | A developer can edit JSON parameters and receives an inline error for malformed or invalid input. | Explorer `Tool parameters` editor. | Automated validation coverage; rendered malformed-JSON PASS. |
| DEV-006 | Invoking a local tool exposes the structured response and any bounded state changes. Declarative tools edit only visible fields on their declared route. | Explorer `Invoke tool`. | Automated contracts; rendered imperative PASS. Declarative rendering has automated evidence. |
| DEV-007 | A developer can inspect the replay request, response, call order, event ids, resulting state, and history. | `Run programmatic replay`, then `Inspect calls`; compare with the Live State Inspector. | Automated replay coverage; rendered PASS. |

## Hackathon judge

| Story | Acceptance outcome | Main route and proof point | Evidence |
| --- | --- | --- | --- |
| JUDGE-001 | Within about one minute, the judge can identify the product as a fictional local prescription-shopping sandbox and see 52 seeded medication concepts and 3 demo locations. | `/#/`. | Rendered content PASS; the one-minute target was not timed. |
| JUDGE-002 | The judge can run the demo using visible controls only. No external agent, account, or network integration is required. | Follow [DEMO_GUIDE.md](./DEMO_GUIDE.md). | Automated local handlers; rendered critical-path PASS. |
| JUDGE-003 | The judge can run a deterministic prompt replay and inspect every local call. | `/#/demo`; `Run programmatic replay`, then `Inspect calls`. | Automated replay coverage; rendered PASS. |
| JUDGE-004 | The judge can distinguish visible DOM form population from an imperative structured tool call. | Explorer declarative filter and imperative local console. | Automated contract separation; rendered catalog and imperative PASS. |
| JUDGE-005 | The judge can inspect names, routes, schemas, examples, status, and failures for the full catalog. | `/#/demo`. | Automated full-catalog contracts; rendered catalog listing and Try It PASS. |
| JUDGE-006 | The judge can see state version, valid next actions, blocked actions, and event history change after a legal transition. | `/#/flow-lab`; Live State Inspector. | Automated workflow coverage; rendered PASS. |
| JUDGE-007 | The judge can execute a deterministic failure and see the failure code plus recovery action. | `/#/flow-lab`; `Mock availability service fails`, then `Execute failure`. | Automated failure coverage; rendered PASS. |
| JUDGE-008 | The judge can see that the same catalog, replay, state, and human-review pattern also supports user-authored document tools and workflows. | `/#/studio`; inspect the local Capability Studio boundaries. | Automated template safety coverage; rendered route PASS. |

## Built-in capability inventory

The canonical catalog contains 34 built-ins. The automated catalog contract checks the count, unique names, schemas, routes, and registration metadata.

### Imperative tools, 25

Every imperative tool has route scope `*`. The browser API is progressive enhancement. The Explorer can invoke the same wrapped local handlers when `document.modelContext` is unavailable.

| # | Qualified name | Category |
| ---: | --- | --- |
| 1 | `cleardose_search_drug_index` | Discovery and pricing |
| 2 | `cleardose_get_drug_index_entry` | Discovery and pricing |
| 3 | `cleardose_find_compatible_options` | Discovery and pricing |
| 4 | `cleardose_compare_medication_options` | Discovery and pricing |
| 5 | `cleardose_compare_drug_prices` | Discovery and pricing |
| 6 | `cleardose_find_related_drugs` | Discovery and pricing |
| 7 | `cleardose_get_drug_availability` | Shopping and procurement |
| 8 | `cleardose_compare_drug_availability` | Shopping and procurement |
| 9 | `cleardose_estimate_delivery` | Shopping and procurement |
| 10 | `cleardose_review_demo_interaction_flags` | Discovery and pricing |
| 11 | `cleardose_build_procurement_plan` | Shopping and procurement |
| 12 | `cleardose_prepare_doctor_question_card_request` | Patient and clinician |
| 13 | `cleardose_submit_doctor_question_card_draft` | Patient and clinician |
| 14 | `cleardose_prepare_prescription_follow_up` | Patient and clinician |
| 15 | `cleardose_prepare_agent_memory_packet` | Documents and memory |
| 16 | `cleardose_inspect_workflow_runtime` | Interface and observability |
| 17 | `cleardose_inspect_workflow_state` | Interface and observability |
| 18 | `cleardose_get_workflow_history` | Interface and observability |
| 19 | `cleardose_get_available_workflow_actions` | Interface and observability |
| 20 | `cleardose_get_workflow_transition` | Interface and observability |
| 21 | `cleardose_dispatch_workflow_transition` | Interface and observability |
| 22 | `cleardose_reset_workflow_state` | Interface and observability |
| 23 | `cleardose_highlight_section` | Interface and observability |
| 24 | `cleardose_get_cart` | Shopping and procurement |
| 25 | `cleardose_add_to_cart` | Shopping and procurement |

### Declarative forms, 9

Declarative forms write only to visible form fields. `Populate only` means a person must use the visible submit control.

| # | Qualified name | Route | Submit behavior |
| ---: | --- | --- | --- |
| 1 | `cleardose_navigate_to_drug_search` | `global` | Auto-submit |
| 2 | `cleardose_navigate_to_mobile_drug_search` | `global` | Auto-submit |
| 3 | `cleardose_navigate_to_home_drug_search` | `/` | Auto-submit |
| 4 | `cleardose_filter_visible_drug_index` | `/udi` | Auto-submit |
| 5 | `cleardose_filter_visible_medication_catalog` | `/medications` | Auto-submit |
| 6 | `cleardose_populate_visible_price_comparison` | `/compare` | Auto-submit |
| 7 | `cleardose_prepare_provider_note` | `/contact-doctor` | Populate only |
| 8 | `cleardose_populate_question_card_demo` | `/flow-lab` | Populate only |
| 9 | `cleardose_compose_dynamic_capability_template` | `/studio` | Populate only |

See [TESTING.md](./TESTING.md) for command-level evidence and [SMOKE_TEST_MATRIX.md](./SMOKE_TEST_MATRIX.md) for the rendered acceptance record.
