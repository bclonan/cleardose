# User stories

## Shopper and patient

- As a visitor, I can understand ClearDose's fictional/sandbox status before entering data.
- As a visitor, I can search generic names, brand names, and categories so I can find a medication.
- As a visitor, I can sort medications by name, lowest mock price, or largest illustrative savings.
- As a visitor, I can search the local UDI by generic name, brand, class, category, or stable demo identifier.
- As a visitor, I can inspect deterministic package variants and multiple fictional delivered-price offers.
- As a visitor, I can find broadly related records without being told they are equivalent or safe substitutes.
- As a visitor, I can run a clearly synthetic interaction review that never treats missing coverage as evidence of safety.
- As a visitor, I can build a local procurement plan that compares fictional offers without reserving inventory or placing an order.
- As a visitor, I can compare two exact medication variants side by side without being told they are clinical substitutes.
- As a visitor, I can enable optional voice guidance and retain an equivalent visible transcript.
- As a keyboard or assistive-technology user, I can navigate landmarks, forms, the comparison, and the tool dialog without a pointer.
- As a shopper, I can inspect strengths, forms, quantities, retail comparisons, and price components before adding an item.
- As a shopper, I can add a variant, change quantity up to the demo limit, remove it, and see totals update.
- As a shopper, I can keep my cart while signing in or creating a fictional account.
- As a customer, I can use the seeded demo account, update local profile/delivery details, and sign out.
- As a customer, I can see ready, processing, and renewal-needed prescriptions and take the next appropriate action.
- As a customer, I can complete delivery, prescription-source, mock-payment, and review steps.
- As a customer, I can create a local order, view confirmation, track its status, and review order history.
- As a customer, I can reset all demo state from the footer.

## Provider handoff

- As a patient, I can understand how an on-file, provider-sent, or transferred prescription changes fulfillment status.
- As a provider-demo user, I can generate an on-screen routing note without sending email, fax, or health data.

## Agent user

- As a browser agent, I can search compact UDI records and use the returned exact id in later calls.
- As a browser agent, I can inspect one exact record's normalized identity, packages, and fictional offers.
- As a browser agent, I can compare one to four fictional package prices with a clear non-clinical disclaimer.
- As a browser agent, I can find broad related records, review incomplete synthetic interaction flags, and build a local plan without making a clinical or purchase decision.
- As a browser agent, I can highlight a stable section and move visible keyboard focus so the patient and agent discuss the same content.
- As a browser agent, I can read the cart without changing state.
- As a browser agent, I can add an exact variant to the mock cart and see the human UI update through the same Pinia action.
- As a browser agent in a browser without WebMCP, I do not break the human experience.

## Developer

- As a developer, I can install one ClearDose plugin to register Pinia wiring, all shared components, adapters, and default tools.
- As a developer, I can replace persistence or WebMCP transport through constructor options.
- As a developer, I can pass `adapter`, `mcpTools`, `mcpContext`, and `registerMcp` to compose behavior on reusable components.
- As a developer, I can choose imperative, declarative, or combined WebMCP composition through component props.
- As a developer, I can replace the mock API without moving fixture, persistence, or request logic into pages.
- As a developer, I can add a tool definition without importing it into pages.
- As a developer, I can verify facade and WebMCP contracts with automated tests.
- As a developer, I can regenerate a static schema and run direct, chained, mutation, and refusal eval journeys with Chrome Labs' experimental eval CLI.

## Acceptance boundaries

- No flow sends a network request, processes money, contacts a provider, or fulfills medication.
- Passwords remain inside the mock persistence record and never enter DTOs or tool output.
- Every mutation reaches persistence through the facade/repository/API/DAO path.
- Voice, highlighting, declarative tools, and WebMCP registration are progressive enhancements with complete human fallbacks.
- Missing interaction fixtures never produce a “safe” conclusion, and no UDI workflow presents related records as therapeutic equivalents.
