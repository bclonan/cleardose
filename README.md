# Cost Plus Drugs Flow Demo

An unofficial Vue 3 ecommerce-flow prototype inspired by the patient experience at Cost Plus Drugs. It is a static sandbox: medication prices, customers, prescriptions, pharmacy identifiers, payments, and orders are all fictional or illustrative.

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

This project is not a pharmacy, is not affiliated with Mark Cuban Cost Plus Drug Company, and must never receive real prescriptions, health data, insurance information, or payment details.
