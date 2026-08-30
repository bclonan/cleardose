export const negativeScenarios = Object.freeze([
  Object.freeze({
    id: "invalid-health-form",
    title: "Invalid health-data form payload",
    description: "Reject an agent-ready form when the UDI id is missing and a concern exceeds the declared boundary.",
    definitionId: "agent-ready-form",
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
    transitions: Object.freeze([
      Object.freeze({ type: "PRICE_QUOTED", toState: "planning", context: { variantId: "atorvastatin-10mg-30", quotedPrice: 11.82, orderPlaced: false } }),
      Object.freeze({ type: "PRICE_VERSION_STALE", toState: "reviewing", context: { quotedPrice: 11.82, currentPrice: 12.47, requiresReconfirmation: true, orderPlaced: false } }),
    ]),
  }),
]);

export function getNegativeScenario(id) {
  return negativeScenarios.find((scenario) => scenario.id === String(id)) ?? null;
}

