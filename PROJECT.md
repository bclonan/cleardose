# ClearDose project and goal

**ClearDose**  
*Transparent prescriptions, agent-ready.*

## Goal

Deliver a complete, branded Vue 3 reference storefront that demonstrates a transparent prescription-shopping journey with a fictional database, customer account, prescriptions, orders, checkout, and provider handoff. The same business capabilities must be safely callable from human UI and browser agents through one adapter/facade architecture.

## Product principles

1. **Transparent by default:** show medication price, retail comparison, savings, shipping, prescription status, and the next step before commitment.
2. **One shared workflow:** people and agents use the same Pinia actions and application facade, preventing divergent behavior.
3. **Replaceable edges:** browser storage, data repositories, UI adapters, and WebMCP transport can be swapped independently.
4. **Safe sandbox:** all data and transactions are fictional, local, resettable, and explicitly not for medical use.
5. **Extension-first:** adding a component tool or backend adapter should require composition, not page rewrites.

## Included experience

- Home, medication catalog, search, detail, variants, and transparent price breakdown
- Cart quantity/removal and mock order summary
- Sign in, create account, profile, prescriptions, orders, order details, and delivery state
- Four-step checkout and order confirmation
- Provider note preview and prescription-routing education
- Pinia store, DTOs, repository adapters, browser DAO, facade, component registry, WebMCP plugin, default tools, and tests

## Non-goals

This project is not a pharmacy, clinical system, medical device, benefits engine, identity provider, or payment processor. It must never handle real prescriptions, protected health information, clinical decisions, money, or fulfillment.
