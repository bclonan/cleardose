import { availabilitySeedCases } from "../udi/availabilityFixtures";

export const negativeScenarios = Object.freeze([
  Object.freeze({
    id: "invalid-health-form",
    title: "Invalid health-data form payload",
    description: "Reject an agent-ready form when the UDI id is missing and a concern exceeds the declared boundary.",
    definitionId: "agent-ready-form",
    operation: Object.freeze({
      kind: "validate-health-form",
      expectedCode: "INVALID_INPUT",
      input: Object.freeze({ concerns: Object.freeze(["x".repeat(161)]) }),
    }),
    transitions: Object.freeze([
      Object.freeze({ type: "FORM_SUBMITTED", toState: "validating", context: { submittedBy: "demo-agent", containsRealPhi: false } }),
      Object.freeze({ type: "FORM_VALIDATION_REJECTED", toState: "rejected", context: { fieldErrors: { drugId: "Required exact UDI id.", concerns: "Each item must be 160 characters or fewer." }, persisted: false } }),
    ]),
  }),
  Object.freeze({
    id: "out-of-stock",
    title: "Package becomes unavailable",
    description: "Pause a fictional plan when its indexed package changes to unavailable demo stock.",
    definitionId: "procurement-plan",
    operation: Object.freeze({ kind: "get-availability", expectedCode: availabilitySeedCases.packageUnavailable.expectedCode, input: availabilitySeedCases.packageUnavailable.request }),
    transitions: Object.freeze([
      Object.freeze({ type: "PLAN_REQUESTED", toState: "planning", context: { variantId: "lisinopril-5mg-30", orderPlaced: false } }),
      Object.freeze({ type: "DEMO_STOCK_UNAVAILABLE", toState: "reviewing", context: { availability: "unavailable-demo-stock", resolution: "Patient must review another fictional package.", orderPlaced: false } }),
    ]),
  }),
  Object.freeze({
    id: "price-updated",
    title: "Price changes before review",
    description: "Invalidate a stale fictional quote and require the patient to reconfirm the updated amount.",
    definitionId: "procurement-plan",
    operation: Object.freeze({
      kind: "verify-quote",
      expectedCode: "PRICE_VERSION_STALE",
      input: Object.freeze({ drugId: "med_atorvastatin", variantId: "atorvastatin-10mg-30", providerId: "harbor-demo-pharmacy", locationId: "demo-baltimore", quoteVersion: "quote-demo-stale" }),
    }),
    transitions: Object.freeze([
      Object.freeze({ type: "PRICE_QUOTED", toState: "planning", context: { variantId: "atorvastatin-10mg-30", quotedPrice: 11.82, orderPlaced: false } }),
      Object.freeze({ type: "PRICE_VERSION_STALE", toState: "reviewing", context: { quotedPrice: 11.82, currentPrice: 12.47, requiresReconfirmation: true, orderPlaced: false } }),
    ]),
  }),
  Object.freeze({
    id: "prescription-required",
    title: "Prescription required",
    description: "Return actionable administrative steps and an editable agent handoff while keeping external contact under patient control.",
    definitionId: "prescription-follow-up",
    operation: Object.freeze({ kind: "verify-prescription-gate", expectedCode: "PRESCRIPTION_REQUIRED", input: Object.freeze({ drugId: "med_lisinopril" }) }),
    transitions: Object.freeze([
      Object.freeze({ type: "FULFILLMENT_BLOCKED", toState: "preparing", context: { code: "PRESCRIPTION_REQUIRED", orderPlaced: false, externalActionTaken: false } }),
      Object.freeze({ type: "EDITABLE_HANDOFF_PREPARED", toState: "human_review", context: { summary: "Your prescriber must send a valid prescription before fulfillment.", recommendedTool: "cleardose_prepare_prescription_follow_up", orderPlaced: false, externalActionTaken: false } }),
    ]),
  }),
  Object.freeze({
    id: "incompatible-comparison",
    title: "Comparison is not compatible",
    description: "Reject unrelated seeded drug records and expose a declared route back to the result branch.",
    definitionId: "state-interaction-demo",
    operation: Object.freeze({ kind: "compare-medications", expectedCode: "INCOMPATIBLE_COMPARISON", input: Object.freeze({ drugIds: Object.freeze(["med_lisinopril", "med_atorvastatin"]), purpose: "price", locationId: "demo-baltimore" }) }),
    transitions: Object.freeze([
      Object.freeze({ type: "COMPARE", toState: "comparing", context: { leftDrugId: "med_lisinopril", rightDrugId: "med_atorvastatin", comparisonCreated: false } }),
      Object.freeze({ type: "INCOMPATIBLE_COMPARISON", toState: "error", context: { code: "INCOMPATIBLE_COMPARISON", retryable: true, recoveryAction: "RECOVER_TO_RESULTS", comparisonCreated: false } }),
    ]),
  }),
  Object.freeze({
    id: "location-unavailable",
    title: "Location is outside the seeded area",
    description: "Reject an unsupported fictional location without persisting its ZIP or free-form label.",
    definitionId: "state-interaction-demo",
    operation: Object.freeze({ kind: "get-availability", expectedCode: "LOCATION_UNAVAILABLE", input: Object.freeze({ drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", postalCode: "00000" }) }),
    transitions: Object.freeze([
      Object.freeze({ type: "CHECK_AVAILABILITY", toState: "checking_availability", context: { zip: "00000", location: "Outside seeded service area", externalActionTaken: false } }),
      Object.freeze({ type: "LOCATION_UNAVAILABLE", toState: "error", context: { code: "LOCATION_UNAVAILABLE", retryable: true, recoveryAction: "RECOVER_TO_RESULTS", externalActionTaken: false } }),
    ]),
  }),
  Object.freeze({
    id: "mock-service-failure",
    title: "Mock availability service fails",
    description: "Expose a deterministic mock-service error and leave retry or return actions visible.",
    definitionId: "state-interaction-demo",
    operation: Object.freeze({ kind: "mock-service-failure", expectedCode: "MOCK_SERVICE_FAILED", input: Object.freeze({ service: "availability", fixtureId: "mock-service-failure" }) }),
    transitions: Object.freeze([
      Object.freeze({ type: "CHECK_AVAILABILITY", toState: "checking_availability", context: { providerId: "northstar-demo", externalActionTaken: false } }),
      Object.freeze({ type: "MOCK_SERVICE_FAILED", toState: "error", context: { code: "MOCK_SERVICE_FAILED", retryable: true, recoveryAction: "RETRY_CHECK_AVAILABILITY", externalActionTaken: false } }),
    ]),
  }),
  Object.freeze({
    id: "delivery-window-missed",
    title: "Delivery falls outside the requested window",
    description: "Show that no compatible seeded offer meets the requested delivery window, then expose recovery actions.",
    definitionId: "state-interaction-demo",
    operation: Object.freeze({ kind: "compare-availability", expectedCode: availabilitySeedCases.deliveryWindowMissed.expectedCode, input: availabilitySeedCases.deliveryWindowMissed.request }),
    transitions: Object.freeze([
      Object.freeze({ type: "CHECK_AVAILABILITY", toState: "checking_availability", context: { requestedWithinDays: 3, externalActionTaken: false } }),
      Object.freeze({ type: "DELIVERY_WINDOW_MISSED", toState: "error", context: { code: "DELIVERY_WINDOW_MISSED", retryable: true, recoveryAction: "RECOVER_TO_RESULTS", externalActionTaken: false } }),
    ]),
  }),
  Object.freeze({
    id: "provider-unavailable",
    title: "Selected provider is unavailable",
    description: "Reject an exact provider that cannot ship the selected package and return another availability lookup as recovery.",
    definitionId: "state-interaction-demo",
    operation: Object.freeze({ kind: "estimate-delivery", expectedCode: availabilitySeedCases.providerUnavailable.expectedCode, input: availabilitySeedCases.providerUnavailable.request }),
    transitions: Object.freeze([
      Object.freeze({ type: "CHECK_AVAILABILITY", toState: "checking_availability", context: { providerId: "metro-demo-pharmacy", externalActionTaken: false } }),
      Object.freeze({ type: "PROVIDER_UNAVAILABLE", toState: "error", context: { code: "PROVIDER_UNAVAILABLE", retryable: true, recoveryAction: "RETRY_CHECK_AVAILABILITY", externalActionTaken: false } }),
    ]),
  }),
  Object.freeze({
    id: "permission-denied",
    title: "Browser permission is denied",
    description: "Show a denied browser capability without bypassing the visible permission control.",
    definitionId: "failure-fixture",
    operation: Object.freeze({ kind: "mock-structured-failure", expectedCode: "PERMISSION_DENIED", input: Object.freeze({ code: "PERMISSION_DENIED", retryable: false, recommendedAction: "Use the visible browser permission control." }) }),
    transitions: Object.freeze([
      Object.freeze({ type: "FAILURE_ATTEMPTED", toState: "attempting", context: { capability: "browser-permission", externalActionTaken: false } }),
      Object.freeze({ type: "PERMISSION_DENIED", toState: "error", context: { code: "PERMISSION_DENIED", retryable: false, recoveryAction: "REVIEW_BROWSER_PERMISSION", externalActionTaken: false } }),
    ]),
  }),
  Object.freeze({
    id: "mock-service-timeout",
    title: "Mock service times out",
    description: "Return a deterministic timeout and offer a bounded retry without hiding the failed attempt.",
    definitionId: "failure-fixture",
    operation: Object.freeze({ kind: "mock-structured-failure", expectedCode: "MOCK_SERVICE_TIMEOUT", input: Object.freeze({ code: "MOCK_SERVICE_TIMEOUT", retryable: true, recommendedTool: "cleardose_get_drug_availability" }) }),
    transitions: Object.freeze([
      Object.freeze({ type: "FAILURE_ATTEMPTED", toState: "attempting", context: { service: "availability", externalActionTaken: false } }),
      Object.freeze({ type: "MOCK_SERVICE_TIMEOUT", toState: "error", context: { code: "MOCK_SERVICE_TIMEOUT", retryable: true, recoveryAction: "RETRY_LOCAL_AVAILABILITY", externalActionTaken: false } }),
    ]),
  }),
  Object.freeze({
    id: "duplicate-submission",
    title: "Duplicate action is rejected",
    description: "Apply one versioned action, reject the repeated request id, and point back to workflow history.",
    definitionId: "failure-fixture",
    operation: Object.freeze({ kind: "duplicate-action", expectedCode: "DUPLICATE_ACTION", input: Object.freeze({ action: "COMPARE", requestId: "fixture.duplicate.compare.1" }) }),
    transitions: Object.freeze([
      Object.freeze({ type: "FAILURE_ATTEMPTED", toState: "attempting", context: { action: "COMPARE", externalActionTaken: false } }),
      Object.freeze({ type: "DUPLICATE_SUBMISSION", toState: "error", context: { code: "DUPLICATE_ACTION", retryable: false, recoveryAction: "INSPECT_WORKFLOW_HISTORY", externalActionTaken: false } }),
    ]),
  }),
  Object.freeze({
    id: "unsupported-external-fulfillment",
    title: "External fulfillment is unsupported",
    description: "Reject a request to contact or reserve with an external provider and return to the local review plan.",
    definitionId: "failure-fixture",
    operation: Object.freeze({ kind: "mock-structured-failure", expectedCode: "UNSUPPORTED_EXTERNAL_FULFILLMENT", input: Object.freeze({ code: "UNSUPPORTED_EXTERNAL_FULFILLMENT", retryable: false, recommendedTool: "cleardose_build_procurement_plan" }) }),
    transitions: Object.freeze([
      Object.freeze({ type: "FAILURE_ATTEMPTED", toState: "attempting", context: { requestedAction: "external-provider-reservation", externalActionTaken: false } }),
      Object.freeze({ type: "UNSUPPORTED_EXTERNAL_FULFILLMENT", toState: "error", context: { code: "UNSUPPORTED_EXTERNAL_FULFILLMENT", retryable: false, recoveryAction: "BUILD_LOCAL_REVIEW_PLAN", externalActionTaken: false } }),
    ]),
  }),
  Object.freeze({
    id: "no-equivalent-medication",
    title: "No seeded equivalent is available",
    description: "Return an explicit empty comparison result instead of ranking an unrelated medication.",
    definitionId: "failure-fixture",
    operation: Object.freeze({ kind: "find-compatible-options", expectedCode: "NO_EQUIVALENT_MEDICATION", input: Object.freeze({ drugId: "med_metoprolol", purpose: "doctor_discussion" }) }),
    transitions: Object.freeze([
      Object.freeze({ type: "FAILURE_ATTEMPTED", toState: "attempting", context: { drugId: "med_metoprolol", externalActionTaken: false } }),
      Object.freeze({ type: "NO_EQUIVALENT_MEDICATION", toState: "error", context: { code: "NO_EQUIVALENT_MEDICATION", retryable: false, recoveryAction: "REVIEW_EXACT_DRUG_RECORD", comparisonCreated: false, externalActionTaken: false } }),
    ]),
  }),
]);

export function getNegativeScenario(id) {
  return negativeScenarios.find((scenario) => scenario.id === String(id)) ?? null;
}
