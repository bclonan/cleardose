import { shortcutReplayScenarios } from "./shortcutReplayScenarios.js";
import { normalizeDemoRoute } from "../../../domain/shared/demoRoute.js";

const SEEDED_MOCK_DISCLOSURE = Object.freeze({
  label: "Seeded local mock",
  detail: "This replay uses fictional medication, provider, price, availability, location, and workflow data. It contacts no pharmacy, clinician, insurer, payment service, or patient record.",
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function toolStep(id, title, capabilityId, input, options = {}) {
  return {
    id,
    title,
    kind: "tool",
    capabilityId,
    toolName: capabilityId.split(".").at(-1),
    input,
    mocked: true,
    pauseAfterMs: 450,
    observe: [],
    ...options,
  };
}

function scenario(definition) {
  const capabilityIds = [...new Set(definition.steps.map((step) => step.capabilityId).filter(Boolean))];
  return deepFreeze({
    mocked: true,
    mockDisclosure: SEEDED_MOCK_DISCLOSURE,
    recoveryScenarioIds: [],
    ...definition,
    capabilityIds,
  });
}

export const demoScenarios = Object.freeze([
  scenario({
    id: "drug-search",
    title: "Find one exact medication record",
    summary: "Search the seeded drug index, carry the returned id into a detail call, and show the same record in the visible interface.",
    routes: ["/", "/medications", "/udi", "/demo", "/shortcuts"],
    prompts: {
      human: "Find lisinopril and show me its exact fictional package details.",
      voice: "Find lisinopril, then read back the exact package details you found.",
      advanced: "Search the local ClearDose drug index for lisinopril. Use the returned drug id to fetch the normalized record and package variants. Return structured fictional data only and identify the visible section that changed.",
    },
    expectedResult: {
      summary: "One normalized lisinopril record with its stable demo id and seeded package variants.",
      checks: ["The detail request uses the id returned by search.", "No page text is scraped.", "Every result is labeled fictional."],
    },
    recoveryScenarioIds: ["failure-and-recovery"],
    steps: [
      toolStep("search", "Search the local index", "cleardose.discovery-and-pricing.search_drug_index", { query: "lisinopril", limit: 5 }, {
        highlightTargets: { "/": "medication-search", "/medications": "medication-search", "/udi": "udi-search", "/demo": "tool-catalog", "/shortcuts": "prompt-chain" },
        observe: ["route.current", "drug-search.results", "workflow.current"],
      }),
      toolStep("detail", "Fetch the exact record", "cleardose.discovery-and-pricing.get_drug_index_entry", {
        drugId: { $from: "steps.search.response.structuredContent.drugs.0.id" },
      }, {
        highlightTargets: { "/": "medication-search", "/medications": "medication-search", "/udi": "udi-results", "/demo": "tool-catalog", "/shortcuts": "shortcut-observatory" },
        observe: ["drug-search.selection", "workflow.current"],
      }),
    ],
  }),
  scenario({
    id: "semantic-comparison",
    title: "Compare compatible medication options",
    summary: "Ask the compatibility model what may be compared, then compare only eligible seeded options and explain why they belong together.",
    routes: ["/compare", "/demo", "/shortcuts"],
    prompts: {
      human: "Show me comparable lisinopril options and explain why the comparison is valid.",
      voice: "Compare compatible lisinopril options and tell me why they belong in the same comparison.",
      advanced: "Use ClearDose compatibility data to find price-comparable options for med_lisinopril. Compare only eligible records or provider offers. Include relationship reasons, package facts, and the fictional-data disclaimer. Reject unrelated medications.",
    },
    expectedResult: {
      summary: "A rankable comparison made only from options that pass explicit compatibility rules.",
      checks: ["Every selection has a relationship reason.", "Unrelated medications are excluded.", "Price does not imply clinical interchangeability."],
    },
    recoveryScenarioIds: ["failure-and-recovery"],
    steps: [
      toolStep("compatible", "Find eligible options", "cleardose.discovery-and-pricing.find_compatible_options", { drugId: "med_lisinopril", purpose: "price" }, {
        highlightTargets: { "/compare": "comparison-results", "/demo": "tool-catalog", "/shortcuts": "prompt-chain" },
        observe: ["comparison.compatibility", "workflow.current"],
      }),
      toolStep("compare", "Compare the eligible facts", "cleardose.discovery-and-pricing.compare_medication_options", {
        drugIds: ["med_lisinopril"], purpose: "price", postalCode: "21201",
      }, {
        highlightTargets: { "/compare": "comparison-results", "/demo": "tool-catalog", "/shortcuts": "shortcut-observatory" },
        observe: ["comparison.selection", "comparison.results", "workflow.current"],
      }),
    ],
  }),
  scenario({
    id: "availability-within-three-days",
    title: "Find a compatible option that arrives in three days",
    summary: "Combine explicit compatibility, provider inventory, and delivery estimates for the seeded Baltimore location.",
    routes: ["/udi", "/compare", "/demo", "/shortcuts"],
    prompts: {
      human: "Find the cheapest compatible lisinopril option that can arrive within three days.",
      voice: "Find a compatible lisinopril option that can reach the demo location in three days.",
      advanced: "For med_lisinopril at demo-baltimore, inspect the exact package availability, compare eligible shipping offers with a three-day deadline, then estimate the selected delivery. Rank only compatible seeded options and explain any exclusions.",
    },
    expectedResult: {
      summary: "A fictional in-stock shipping option that meets the three-day deadline, plus excluded offers and their reasons.",
      checks: ["The location is the seeded demo location.", "Availability and price are both considered.", "The delivery estimate is labeled fictional."],
    },
    recoveryScenarioIds: ["failure-and-recovery"],
    steps: [
      toolStep("availability", "Read provider availability", "cleardose.shopping-and-procurement.get_drug_availability", {
        drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", locationId: "demo-baltimore",
      }, {
        highlightTargets: { "/udi": "udi-results", "/compare": "comparison-results", "/demo": "tool-catalog", "/shortcuts": "prompt-chain" },
        observe: ["availability.location", "availability.offers", "workflow.current"],
      }),
      toolStep("deadline", "Compare the three-day options", "cleardose.shopping-and-procurement.compare_drug_availability", {
        drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", locationId: "demo-baltimore", fulfillmentMode: "shipping", maxDeliveryDays: 3,
      }, {
        observe: ["availability.results", "workflow.current"],
      }),
      toolStep("delivery", "Estimate the selected delivery", "cleardose.shopping-and-procurement.estimate_delivery", {
        drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", locationId: "demo-baltimore", fulfillmentMode: "shipping",
      }, {
        highlightTargets: { "/udi": "udi-results", "/compare": "comparison-results", "/demo": "tool-catalog", "/shortcuts": "shortcut-observatory" },
        observe: ["availability.delivery", "workflow.current"],
      }),
    ],
  }),
  scenario({
    id: "checkout-cost-review",
    title: "Review the mock checkout cost",
    summary: "Add one exact seeded package, inspect fictional availability and delivery, read the transparent cart total, and stop before checkout commitment.",
    routes: ["/cart", "/account/prescriptions", "/checkout", "/demo", "/shortcuts"],
    prompts: {
      human: "Add the exact lisinopril demo package, check delivery, and show me the total before checkout.",
      voice: "Add the seeded lisinopril package, read its availability, delivery estimate, and total, then stop before placing anything.",
      advanced: "Add med_lisinopril variant lisinopril-5mg-30 to the local demo cart. Check its seeded provider availability and shipping estimate for demo-baltimore, then read item-level cost, subtotal, shipping, total, and the fulfillment gate. Do not place an order, enter payment data, or contact a pharmacy.",
    },
    expectedResult: {
      summary: "A local cart with one exact package, provider availability, a delivery estimate, transparent totals, and a prescription review gate.",
      checks: ["The exact variant is used for cart and fulfillment calls.", "No order, payment, reservation, or provider contact occurs.", "The patient keeps the final checkout action."],
    },
    steps: [
      toolStep("add", "Add the exact package", "cleardose.shopping-and-procurement.add_to_cart", { drugId: "med_lisinopril", variantId: "lisinopril-5mg-30" }, {
        highlightTargets: { "/cart": "route-demo-scenarios", "/account/prescriptions": "route-demo-scenarios", "/checkout": "checkout-flow", "/demo": "tool-catalog", "/shortcuts": "prompt-chain" },
        observe: ["cart.summary", "workflow.current"],
      }),
      toolStep("availability", "Check seeded provider availability", "cleardose.shopping-and-procurement.get_drug_availability", {
        drugId: "med_lisinopril", variantId: "lisinopril-5mg-30", locationId: "demo-baltimore",
      }, {
        highlightTargets: { "/cart": "cart-summary", "/account/prescriptions": "route-demo-scenarios", "/checkout": "cart-summary", "/demo": "tool-catalog", "/shortcuts": "prompt-chain" },
        observe: ["availability.offers", "cart.summary", "workflow.current"],
      }),
      toolStep("delivery", "Estimate fictional delivery", "cleardose.shopping-and-procurement.estimate_delivery", {
        drugId: "med_lisinopril", variantId: "lisinopril-5mg-30", locationId: "demo-baltimore", fulfillmentMode: "shipping",
      }, {
        highlightTargets: { "/cart": "cart-summary", "/account/prescriptions": "route-demo-scenarios", "/checkout": "cart-summary", "/demo": "tool-catalog", "/shortcuts": "prompt-chain" },
        observe: ["availability.delivery", "cart.summary", "workflow.current"],
      }),
      toolStep("cart", "Read the transparent total", "cleardose.shopping-and-procurement.get_cart", {}, {
        highlightTargets: { "/cart": "cart-summary", "/account/prescriptions": "route-demo-scenarios", "/checkout": "cart-summary", "/demo": "tool-catalog", "/shortcuts": "shortcut-observatory" },
        observe: ["cart.summary", "workflow.current"],
      }),
    ],
  }),
  scenario({
    id: "human-control-boundary",
    title: "Inspect the human-control boundary",
    summary: "Read the local mock cart and workflow history without filling a form, signing in, placing an order, sending a message, or changing account data.",
    routes: ["/account/orders", "/login", "/create-account", "/account", "/checkout", "/checkout/confirmation"],
    prompts: {
      human: "Show me what the demo can inspect here without taking the action for me.",
      voice: "Read the safe local state, then stop before any sign-in, checkout, message, or order action.",
      advanced: "Read the local fictional cart and recent bounded workflow history. Do not populate identity or payment fields, authenticate, place an order, contact anyone, or claim that this page changed. Explain which visible action remains under human control.",
    },
    expectedResult: {
      summary: "A read-only local state trace that leaves every identity, checkout, communication, and order action untouched.",
      checks: ["No form field is populated or submitted.", "No order, payment, sign-in, or message action runs.", "The trace says that the visible human action remains pending."],
    },
    steps: [
      toolStep("cart", "Read the local mock cart", "cleardose.shopping-and-procurement.get_cart", {}, {
        highlightTargets: { "/login": "route-demo-scenarios", "/create-account": "route-demo-scenarios", "/account": "route-demo-scenarios", "/account/orders": "route-demo-scenarios", "/checkout": "route-demo-scenarios", "/checkout/confirmation": "route-demo-scenarios" },
        observe: ["cart.summary", "workflow.current"],
      }),
      toolStep("history", "Read bounded local workflow history", "cleardose.interface-and-observability.inspect_workflow_runtime", { limit: 20 }, {
        highlightTargets: { "/login": "route-demo-scenarios", "/create-account": "route-demo-scenarios", "/account": "route-demo-scenarios", "/account/orders": "route-demo-scenarios", "/checkout": "route-demo-scenarios", "/checkout/confirmation": "route-demo-scenarios" },
        observe: ["workflow.current", "workflow.history"],
      }),
    ],
  }),
  scenario({
    id: "doctor-discussion-card",
    title: "Build a structured doctor discussion card",
    summary: "Gather compatible-option, price, and availability facts, then complete the two-call question-card exchange for human review.",
    routes: ["/compare", "/contact-doctor", "/flow-lab", "/demo", "/shortcuts"],
    prompts: {
      human: "Show discussion-only options, expected pricing, availability, common side effects, and a short card I can discuss with my doctor.",
      voice: "Prepare a short lisinopril discussion card with explicitly related records, price, availability, and questions for my doctor.",
      advanced: "Gather structured discussion-only facts for med_lisinopril. Include compatible options, seeded prices and availability, common informational side effects, warnings, and two neutral clinician questions. Use the exact question-card response schema and leave the result in human review. Do not diagnose or recommend a medication change.",
    },
    expectedResult: {
      summary: "A two-question local draft whose displayed medication facts come from trusted seeded data, not generated prose.",
      checks: ["Clinical text remains informational sample data.", "The exchange id comes from the prepare call.", "The card stops in human review."],
    },
    steps: [
      toolStep("compatible", "Gather discussion-only options", "cleardose.discovery-and-pricing.find_compatible_options", { drugId: "med_lisinopril", purpose: "doctor_discussion" }, {
        highlightTargets: { "/contact-doctor": "provider-handoff", "/flow-lab": "question-card", "/demo": "tool-catalog", "/shortcuts": "prompt-chain" },
        observe: ["doctor.context", "workflow.current"],
      }),
      toolStep("prepare", "Prepare the structured handoff", "cleardose.patient-and-clinician.prepare_doctor_question_card_request", {
        drugId: "med_lisinopril",
        concerns: ["What cost and availability facts should I understand?", "What common side effects and warnings should we discuss?"],
      }, {
        observe: ["doctor.exchange", "workflow.current"],
      }),
      toolStep("submit", "Submit the bounded draft", "cleardose.patient-and-clinician.submit_doctor_question_card_draft", {
        exchangeId: { $from: "steps.prepare.response.structuredContent.exchangeId" },
        title: "Questions about my fictional lisinopril options",
        questions: ["Which benefits, risks, and monitoring needs should we discuss before I consider any change?", "How should the seeded cost and availability differences factor into our discussion?"],
      }, {
        highlightTargets: { "/contact-doctor": "provider-handoff", "/flow-lab": "question-card", "/demo": "tool-catalog", "/shortcuts": "shortcut-observatory" },
        observe: ["doctor.card", "workflow.current"],
      }),
    ],
  }),
  scenario({
    id: "state-branching-demo",
    title: "Inspect and choose a valid state branch",
    summary: "Discover the seeded state-interaction flow, inspect its valid actions, explain the COMPARE branch, dispatch it with version protection, and read the resulting history.",
    routes: ["/flow-lab", "/studio", "/demo", "/shortcuts"],
    prompts: {
      human: "Show what the demo believes now, what can happen next, and take the compare branch.",
      voice: "Inspect the current demo state, list the valid choices, then run the compare choice.",
      advanced: "Find the active state-interaction-demo flow. Inspect its current truth and version, list available actions, inspect the COMPARE transition, then dispatch COMPARE with the observed version and a unique request id. Finish by returning the bounded event history. Do not invoke human-only actions.",
    },
    expectedResult: {
      summary: "The flow moves from search_complete through the declared COMPARE branch with a versioned, idempotent dispatch.",
      checks: ["START_CHECKOUT remains human-only.", "The dispatch uses the inspected flow id and version.", "History contains the resulting event."],
    },
    steps: [
      toolStep("discover", "Find the seeded state flow", "cleardose.interface-and-observability.inspect_workflow_runtime", { limit: 40 }, {
        highlightTargets: { "/flow-lab": "workflow-runtime", "/studio": "studio-runtime", "/demo": "tool-catalog", "/shortcuts": "shortcut-observatory" },
        observe: ["workflow.current", "workflow.history"],
      }),
      toolStep("inspect", "Inspect current truth", "cleardose.interface-and-observability.inspect_workflow_state", {
        flowId: { $from: "steps.discover.response.structuredContent.runtime.flows", $find: { path: "definitionId", equals: "state-interaction-demo" }, $select: "id" },
      }, { observe: ["workflow.current", "workflow.actions"] }),
      toolStep("actions", "List valid actions", "cleardose.interface-and-observability.get_available_workflow_actions", {
        flowId: { $from: "steps.inspect.response.structuredContent.flow.id" },
      }, { observe: ["workflow.actions"] }),
      toolStep("transition", "Explain the compare branch", "cleardose.interface-and-observability.get_workflow_transition", {
        flowId: { $from: "steps.inspect.response.structuredContent.flow.id" }, action: "COMPARE",
      }, { observe: ["workflow.actions"] }),
      toolStep("dispatch", "Dispatch the compare branch", "cleardose.interface-and-observability.dispatch_workflow_transition", {
        flowId: { $from: "steps.inspect.response.structuredContent.flow.id" },
        action: "COMPARE",
        input: {},
        expectedVersion: { $from: "steps.inspect.response.structuredContent.version" },
        requestId: "state-demo-compare-1",
      }, { observe: ["workflow.current", "workflow.actions", "workflow.history"] }),
      toolStep("history", "Read the resulting history", "cleardose.interface-and-observability.get_workflow_history", {
        flowId: { $from: "steps.inspect.response.structuredContent.flow.id" }, limit: 20,
      }, {
        highlightTargets: { "/flow-lab": "workflow-runtime", "/studio": "studio-runtime", "/demo": "tool-catalog", "/shortcuts": "shortcut-observatory" },
        observe: ["workflow.current", "workflow.history"],
      }),
    ],
  }),
  scenario({
    id: "failure-and-recovery",
    title: "Reject malformed input and recover",
    summary: "Send one intentionally incomplete request, show the structured error, then recover through search and a valid detail request.",
    routes: ["/medications", "/udi", "/compare", "/contact-doctor", "/flow-lab", "/demo", "/shortcuts"],
    prompts: {
      human: "Show me what happens when a tool request is malformed, then recover safely.",
      voice: "Run a bad drug detail request, explain the error, and recover with a valid search.",
      advanced: "Invoke the exact drug-entry tool without its required drugId and inspect the structured INVALID_INPUT response. Do not hide or retry the failure. Then explicitly search for lisinopril and use the returned id for a valid detail call.",
    },
    expectedResult: {
      summary: "A visible INVALID_INPUT trace followed by a separate, successful recovery path.",
      checks: ["The failure remains in history.", "Recovery is an explicit later call.", "No side effect occurs."],
    },
    steps: [
      toolStep("malformed", "Trigger the bounded input error", "cleardose.discovery-and-pricing.get_drug_index_entry", {}, {
        expectedError: { code: "INVALID_INPUT" },
        recovery: { scenarioId: "failure-and-recovery", stepId: "search-valid", label: "Search for a valid exact id." },
        highlightTargets: { "/medications": "medication-search", "/udi": "udi-search", "/compare": "comparison-results", "/checkout": "checkout-flow", "/contact-doctor": "provider-handoff", "/flow-lab": "failure-lab", "/demo": "tool-catalog", "/shortcuts": "shortcut-observatory" },
        observe: ["workflow.current", "workflow.history"],
      }),
      toolStep("search-valid", "Choose the recovery call", "cleardose.discovery-and-pricing.search_drug_index", { query: "lisinopril", limit: 5 }, {
        observe: ["drug-search.results", "workflow.current"],
      }),
      toolStep("detail-valid", "Retry with the returned id", "cleardose.discovery-and-pricing.get_drug_index_entry", {
        drugId: { $from: "steps.search-valid.response.structuredContent.drugs.0.id" },
      }, {
        observe: ["drug-search.selection", "workflow.current", "workflow.history"],
      }),
    ],
  }),
  scenario({
    id: "full-patient-review",
    title: "Trace the full patient review path",
    summary: "Search for one medication, resolve its exact package, validate the comparison rule, check seeded availability, add the package, and stop at the transparent cart review.",
    routes: ["/demo", "/shortcuts"],
    prompts: {
      human: "Find lisinopril, review the exact package and provider options, add it to the mock cart, and stop before checkout.",
      voice: "Walk through the lisinopril demo from search to cart review. Read each result and stop before any checkout action.",
      advanced: "Search the local index for lisinopril, fetch the exact returned record, verify price-comparison eligibility, compare same-drug provider offers, inspect exact-package availability in demo-baltimore, add that package to the local cart, read the total, and inspect the resulting workflow events. Do not place an order, submit payment, or contact a provider.",
    },
    expectedResult: {
      summary: "A complete local trace ending at cart review, with one exact package, fictional provider facts, transparent cost, and no checkout commitment.",
      checks: ["Each call uses a prior structured result where needed.", "The package stays exact across availability and cart calls.", "The replay stops before payment or order placement."],
    },
    recoveryScenarioIds: ["failure-and-recovery"],
    steps: [
      toolStep("search", "Search the seeded index", "cleardose.discovery-and-pricing.search_drug_index", { query: "lisinopril", limit: 3 }, {
        highlightTargets: { "/demo": "tool-catalog", "/shortcuts": "prompt-chain" },
        observe: ["drug-search.results", "workflow.current", "workflow.history"],
      }),
      toolStep("detail", "Resolve the exact record", "cleardose.discovery-and-pricing.get_drug_index_entry", {
        drugId: { $from: "steps.search.response.structuredContent.drugs.0.id" },
      }, { observe: ["drug-search.selection", "workflow.current"] }),
      toolStep("compatible", "Verify provider comparison eligibility", "cleardose.discovery-and-pricing.find_compatible_options", {
        drugId: { $from: "steps.search.response.structuredContent.drugs.0.id" }, purpose: "price",
      }, { observe: ["comparison.compatibility", "workflow.current"] }),
      toolStep("compare", "Compare same-drug providers", "cleardose.discovery-and-pricing.compare_medication_options", {
        drugIds: [{ $from: "steps.search.response.structuredContent.drugs.0.id" }], purpose: "price", locationId: "demo-baltimore",
      }, { observe: ["comparison.results", "workflow.current"] }),
      toolStep("availability", "Check the exact package", "cleardose.shopping-and-procurement.get_drug_availability", {
        drugId: { $from: "steps.search.response.structuredContent.drugs.0.id" },
        variantId: { $from: "steps.detail.response.structuredContent.drug.variants.0.id" },
        locationId: "demo-baltimore",
      }, { observe: ["availability.offers", "workflow.current"] }),
      toolStep("cart-add", "Add the reviewed package", "cleardose.shopping-and-procurement.add_to_cart", {
        drugId: { $from: "steps.search.response.structuredContent.drugs.0.id" },
        variantId: { $from: "steps.detail.response.structuredContent.drug.variants.0.id" },
      }, { observe: ["cart.summary", "workflow.current"] }),
      toolStep("cart-review", "Read the pre-checkout total", "cleardose.shopping-and-procurement.get_cart", {}, {
        observe: ["cart.summary", "workflow.current", "workflow.history"],
      }),
      toolStep("inspect", "Inspect the full event trace", "cleardose.interface-and-observability.inspect_workflow_runtime", { limit: 40 }, {
        highlightTargets: { "/demo": "tool-catalog", "/shortcuts": "shortcut-observatory" },
        observe: ["workflow.current", "workflow.history"],
      }),
    ],
  }),
  scenario({
    id: "webmcp-explorer-tour",
    title: "Trace a WebMCP call from request to state",
    summary: "Run a compact search and detail chain, then inspect the workflow events created by the same registered handlers.",
    routes: ["/demo", "/shortcuts"],
    prompts: {
      human: "Run a WebMCP search and show me the calls, results, timing, and state changes.",
      voice: "Search for lisinopril, open the exact record, and explain every tool call and state change.",
      advanced: "Invoke search_drug_index for lisinopril, pass its returned id to get_drug_index_entry, then inspect recent workflow events. Show each closed-schema request, structured response, elapsed time, bounded state change, and mock label.",
    },
    expectedResult: {
      summary: "Two deterministic local WebMCP calls and an inspection result that contains their workflow evidence.",
      checks: ["The same registry handlers serve browser and replay calls.", "Input and output stay structured.", "Timing and state changes are visible."],
    },
    recoveryScenarioIds: ["failure-and-recovery"],
    steps: [
      toolStep("search", "Invoke the search tool", "cleardose.discovery-and-pricing.search_drug_index", { query: "lisinopril", limit: 3 }, {
        highlightTargets: { "/demo": "tool-catalog", "/shortcuts": "prompt-chain" },
        observe: ["drug-search.results", "workflow.current", "workflow.history"],
      }),
      toolStep("detail", "Invoke the detail tool", "cleardose.discovery-and-pricing.get_drug_index_entry", {
        drugId: { $from: "steps.search.response.structuredContent.drugs.0.id" },
      }, { observe: ["drug-search.selection", "workflow.current", "workflow.history"] }),
      toolStep("inspect", "Inspect the generated evidence", "cleardose.interface-and-observability.inspect_workflow_runtime", { limit: 20 }, {
        highlightTargets: { "/demo": "tool-catalog", "/shortcuts": "shortcut-observatory" },
        observe: ["workflow.current", "workflow.history"],
      }),
    ],
  }),
]);

const scenariosById = new Map([...demoScenarios, ...shortcutReplayScenarios].map((item) => [item.id, item]));

export function getDemoScenario(id) { return scenariosById.get(String(id)) ?? null; }

export function getDemoScenariosForRoute(route) {
  const path = normalizeDemoRoute(route);
  return demoScenarios.filter((item) => item.routes.includes(path));
}
