# ClearDose project and goal

**ClearDose**  
*Transparent prescriptions, agent-ready.*

## Goal

Deliver a complete, branded Vue 3 reference storefront that demonstrates a transparent prescription journey backed by a local Universal Drug Index, fictional prices, customer account, prescriptions, orders, checkout, and provider handoff. The same business capabilities must be safely callable from human UI and browser agents through one understandable facade/service path.

## Product principles

1. **Transparent by default:** show medication price, retail comparison, savings, shipping, prescription status, and the next step before commitment.
2. **One shared workflow:** people and agents use the same Pinia actions and application facade, preventing divergent behavior.
3. **Replaceable edges:** browser storage, data repositories, UI adapters, and WebMCP transport can be swapped independently.
4. **Safe sandbox:** all data and transactions are fictional, local, resettable, and explicitly not for medical use.
5. **Extension-first:** adding a component tool or backend adapter should require composition, not page rewrites.
6. **Clinical humility:** related records are not substitutes, missing interaction flags do not mean safe, and every clinical question escalates to a licensed professional.
7. **Observable agency:** tool calls and UI actions expose state, event ids, and bounded context locally so people can understand what an agent completed.
8. **Deterministic demonstrations:** every imperative tool, declarative form, and prompt chain has a finite-state-machine analog with explicit scope.
9. **User-owned memory:** ClearDose may prepare context, but only the user may copy, save, or hand it to an external agent.
10. **Safe end-user composition:** locally authored capabilities use a non-executable template language, closed inputs, explicit registration, and a visible review gate.

## Included experience

- Home, medication catalog, search, detail, variants, and transparent price breakdown
- Cart quantity/removal and mock order summary
- Sign in, create account, profile, prescriptions, orders, order details, and delivery state
- Four-step checkout and order confirmation
- Provider note preview and prescription-routing education
- Side-by-side medication price comparison and a dedicated interactive WebMCP hackathon explainer
- A 52-record deterministic UDI that expands to 156 packages and 624 fictional provider offers, with explicit comparison rules, three mock locations, related-record, synthetic interaction-review, and local procurement examples
- Optional route-aware voice guidance, visible transcripts, tool inspector, shared page highlighting, autofill-ready forms, and a WCAG 2.2 AAA engineering target
- A DuckDB-Wasm/OPFS workflow event store, cross-tab event mirroring, concurrent-flow viewer, structured site→agent→site exchange, printable doctor-question card, and negative failure fixtures
- A dedicated prompt-shortcut workbench with seven judge-ready chains, static and dynamic machine panes, editable prescription recovery, and a user-controlled memory packet
- A four-step Capability Studio with persistent local templates, optional voice dictation, safe EJS-shaped rendering, dynamic tool/workflow registration, preview, import/export, and live machine evidence
- Pinia store, DTOs, isolated mock API/fixtures, browser DAOs, facade, component registry, 25 built-in imperative WebMCP tools, nine declarative form capabilities, deterministic tests, and Chrome-compatible eval fixtures

## Non-goals

This project is not a pharmacy, clinical system, medical device, benefits engine, identity provider, or payment processor. It must never handle real prescriptions, protected health information, clinical decisions, money, or fulfillment.
