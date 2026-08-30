# ADR 0001: Capability naming and machine scope

- Status: Accepted
- Date: 2026-08-30

## Context

ClearDose exposes imperative tools, declarative forms, prompt-guide examples, eval cases, and workflow visualizations. Independent lists drifted easily and made it unclear whether a name referred to a browser tool, product capability, or state machine.

## Decision

Maintain one canonical capability catalog. Registered tools use `cleardose_<verb_noun>`. Stable capability ids use `cleardose.<category>.<verb_noun>`. Static machines use `machine.tool|form.<kebab-name>.v1`; dynamic instances use `machine.dynamic.<scope-name>.v1`. Events use uppercase snake case. Persisted ids use type prefixes such as `flow_`, `evt_`, `call_`, and `memory_`.

Every record declares a category, `imperative` or `declarative`, an example prompt, and a machine. Dynamic machines must declare `role`, `situation`, and `step`, and must use two or more unique snake_case states.

## Consequences

- The registry, prompt guide, shortcut validator, eval exporter, and machine pane share identifiers.
- Adding an imperative tool without a catalog record fails during definition decoration.
- Catalog-only metadata is stripped before `document.modelContext.registerTool()` so the transport remains standards-focused.
- Dynamic definitions live in persisted flow context, avoiding a database migration while preserving replayability.
