# Hackathon submission draft

This is local submission copy. The repository has no saved Devpost event state, deadline, rules, judging criteria, or submission endpoint, so no official form was opened or sent.

## Project name

ClearDose

## One-line pitch

Transparent prescriptions, agent-ready.

## What it does

ClearDose is a fictional prescription shopping sandbox where the visible Vue interface, browser-native WebMCP tools, a Try It console, and deterministic demo replays all use the same application commands.

A patient can search 52 seeded medication concepts, choose an exact package, compare fictional provider price and fulfillment facts, change location, inspect discussion-only related records, and prepare a doctor question card for human review. The app shows recent bounded workflow history and declared transitions in a local state inspector. It never contacts a pharmacy, clinician, insurer, payment service, or patient record.

## The problem

Browser agents often have to infer identity, state, and allowed actions from changing page structure. That is brittle. It is also a poor fit for a medication journey where the difference between an exact package, a discussion-only relationship, and an unrelated drug matters.

## The solution

ClearDose exposes small, bounded capabilities through `document.modelContext.registerTool()`. Tools return exact identifiers, closed structured data, typed errors, valid next actions, and human-control annotations. Declarative capabilities populate visible forms. Imperative capabilities call shared local handlers. Neither path gets a hidden shortcut around the application state model.

Programmatic Replay makes the same capability path demonstrable without an external agent. The WebMCP Explorer shows the contracts and executes seeded requests. The Live State Inspector shows what changed and what may happen next.

## Why the medication demo

The demo naturally combines exact search, structured comparison, location-sensitive availability, price, delivery timing, branching decisions, human review, and failure recovery. It makes weak automation obvious. Comparing unrelated records or acting on stale workflow state should fail, not produce a plausible-looking answer.

All clinical fields are incomplete fictional samples. ClearDose does not recommend treatment or substitution.

## Key features

- 52 fictional medication concepts, 156 exact packages, and 624 deterministic offers across four providers and three locations
- 34 canonical capabilities, split into 25 imperative tools and 9 declarative forms
- Programmatic Replay with start, pause, resume, single-step, restart, reset, timing, and call inspection
- Interactive WebMCP Explorer with schemas, examples, permissions, typed failures, route status, and Try It
- Branching Live State Inspector with event ids, versions, legal actions, blocked actions, failure states, and recovery
- Exact-package provider comparison and explicit discussion-only relationships
- Two-call doctor question-card exchange that derives displayed facts from trusted local data and stops in human review
- Safe local Capability Studio where templates remain data and registration is a separate visible action
- DuckDB-Wasm and OPFS event persistence with a visible memory fallback and cross-tab `BroadcastChannel` updates

## WebMCP usage

Representative capabilities include:

- `cleardose_search_drug_index`
- `cleardose_find_compatible_options`
- `cleardose_compare_medication_options`
- `cleardose_get_drug_availability`
- `cleardose_build_procurement_plan`
- `cleardose_prepare_doctor_question_card_request`
- `cleardose_submit_doctor_question_card_draft`
- `cleardose_inspect_workflow_state`
- `cleardose_get_available_workflow_actions`
- `cleardose_dispatch_workflow_transition`

The browser registered all 25 imperative tools in the final acceptance session. A native `cleardose_search_drug_index` call returned the seeded Lisinopril record.

## Architecture

Vue components and WebMCP tools call Pinia actions. Pinia calls a framework-independent facade, repositories, the mock API, the Universal Drug Index, and browser DAOs. Replay and Explorer requests invoke the same local tool registry used for browser registration. Workflow events pass through one versioned runtime and persist in DuckDB-Wasm or its explicit memory fallback.

## Challenges solved

The hardest part was keeping four representations in agreement: the visible UI, browser tool registration, replay evidence, and workflow history. ClearDose now derives them from one capability catalog and one handler path.

The second challenge was bounding local evidence without losing useful detail. Schemas have finite depth, runtime inspection caps every collection, event snapshots omit authored health-style text, and stale or duplicate actions fail before mutation.

The third challenge was preserving human control. Discussion cards, memory packets, template registration, file writes, checkout, and external contact all stop at a visible review or user action.

## Demo

Hosted build: `https://cleardose-demo.bclonancode.chatgpt.site`

Current access: owner-only. A public judge URL still requires owner authorization.

Run the local six-minute path in [DEMO_GUIDE.md](./DEMO_GUIDE.md).

## Testing

The release passes lint, Vue type checking, 99 repository tests, capability contract validation, production build, app smoke, dependency-tree inspection, and a production-preview browser pass across all 19 routes. The repository does not have automated browser E2E or automated accessibility scanning. See [TESTING.md](./TESTING.md) and [SMOKE_TEST_MATRIX.md](./SMOKE_TEST_MATRIX.md).

## What's next

- Choose a project license and review attributions.
- Authorize public Sites access and rerun the judge path on that URL.
- Add stable automated browser journeys and an accessibility scanner.
- Split the large initial JavaScript bundle after the submission freeze.

## Event fields not configured

- Hackathon name and Devpost URL
- Submission deadline
- Category or track
- Required video URL
- Team members
- Source-code visibility requirement
- Submission form answers and judging criteria
