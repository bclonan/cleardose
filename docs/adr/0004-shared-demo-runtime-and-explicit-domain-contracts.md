# ADR 0004: Share demo execution and make comparison and state rules explicit

## Status

Accepted

## Context

The old shortcut runner displayed timed steps but did not invoke the registered tool handlers. The tool guide, shortcut cards, and workflow viewer also described different slices of the same system. A polished demo needs one request path and inspectable evidence. It must still work when browser WebMCP is absent.

Medication comparison and workflow interaction had a second problem. A page could pair unrelated records, and a linear state list could not explain valid branches or human-only actions. Price order and array position are not safe substitutes for domain or workflow rules.

## Decision

Programmatic Replay, the WebMCP Explorer, and the Live State Inspector share the existing application boundaries.

- `WebMcpToolRegistry` keeps each executor for local invocation as well as browser registration. Explorer and replay calls use `invoke()` and reach the same tool handler, Pinia action, facade or workflow runtime, API service, and DAO.
- Replay scenarios are frozen service fixtures. They contain prompt variants, expected results, mock disclosures, capability ids, structured inputs, stable highlight targets, and named bounded observations.
- Replay observes only declared application summaries and stable DOM ids or counts. It does not capture unrestricted page text or form values.
- The capability catalog owns schemas, permissions, routes, prompt variants, deterministic errors, related tools, scenarios, and machine ids. The Explorer renders this catalog beside live registry state.
- Comparison eligibility comes from explicit UDI relationship records with purpose-specific permissions. Same-drug provider comparison is allowed. Discussion-only records are never ranked as equivalents.
- Provider, location, inventory, pricing, and delivery fixtures remain in `src/services/api/udi` and use a fixed demo clock.
- Workflow definitions declare nodes, branching transitions, action input schemas, human-only actions, and recovery edges. Agent dispatch requires the observed version and a unique request id.
- State tools inspect truth, history, actions, and transitions separately. One tool may dispatch one declared action. No tool solves an entire workflow.

## Consequences

The visible demo and browser agent can be compared call for call. A browser without WebMCP can still run the local replay and Explorer console. Failures remain part of the trace and return typed recovery data.

The catalog and scenario fixtures contain more metadata, and contract validation must catch drift. State mutation now requires an inspect-then-dispatch sequence. That extra call is intentional because it exposes stale state and keeps human-only actions out of agent control.

All data remains fictional and local. The design does not add a pharmacy, prescriber, insurer, payment, geolocation, or clinical data connection.
