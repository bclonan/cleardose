# ClearDose

**Transparent prescriptions, agent-ready.**

ClearDose is a Vue 3 prescription ecommerce-flow prototype designed around clear prices, visible next steps, and a shared patient-and-agent journey. It is a static sandbox: medication prices, customers, prescriptions, pharmacy identifiers, payments, and orders are all fictional or illustrative.

## Included screens

1. Home and medication search
2. Filterable medication catalog
3. Medication detail, variant picker, price comparison, and cost breakdown
4. Cart and prescription explanation
5. Sign in and customer registration
6. Account overview and editable delivery profile
7. Prescription list and readiness states
8. Order history, order detail, and tracking timeline
9. Four-step checkout: delivery, prescription source, payment path, and review
10. Order confirmation and next steps
11. Patient/provider prescription handoff and generated note preview

## Demo account

- Email: `demo@patient.test`
- Password: `demo1234`

The sign-in screen also has a one-click entry button. Use **Reset demo data** in the footer to restore seeded prescriptions, customer details, and order history.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Architecture

- `src/views/` — route-level screens
- `src/components/` — reusable storefront components
- `src/data/mockDb.js` — seeded medication and patient records
- `src/composables/usePharmacyStore.js` — domain actions and browser persistence
- `src/router.js` — hash routing for reliable static hosting
- `src/styles/main.css` — responsive visual system

The UI calls explicit store operations such as `addToCart`, `authenticate`, `createCustomer`, `placeOrder`, and `customerPrescriptions`. That boundary is intentionally suitable for a later WebMCP adapter: tools can invoke the same domain operations without scraping or simulating clicks.

## Safety boundary

ClearDose is a fictional interface prototype, not a pharmacy, and must never receive real prescriptions, health data, insurance information, or payment details.
