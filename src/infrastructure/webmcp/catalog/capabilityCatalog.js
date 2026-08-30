import { MAX_CART_ITEM_COUNT, MAX_CART_LINES } from "../../../domain/cart/cartLimits.js";

const categoryDefinitions = Object.freeze([
  { id: "discovery-and-pricing", label: "Discovery and pricing", description: "Local UDI search, compatibility, price facts, availability, and synthetic review flags." },
  { id: "patient-and-clinician", label: "Patient and clinician", description: "Bounded handoffs, prescription recovery, and human-reviewed discussion documents." },
  { id: "shopping-and-procurement", label: "Shopping and procurement", description: "Fictional planning, delivery estimates, and resettable local cart operations." },
  { id: "dynamic-documents-and-memory", label: "Documents and memory", description: "Editable, user-controlled artifacts that never leave the browser without a user action." },
  { id: "interface-and-observability", label: "Interface and observability", description: "Shared focus, live state, valid transitions, events, and bounded context inspection." },
  { id: "declarative-forms", label: "Declarative forms", description: "Visible HTML forms exposed through declarative WebMCP attributes." },
  { id: "user-generated", label: "User-created", description: "Locally authored workflow and document-tool templates that require review before loading." },
]);

const boundedObjectSchema = Object.freeze({ $ref: "#/$defs/boundedObject" });
const boundedPrimitiveBranches = Object.freeze([
  Object.freeze({ type: "string", maxLength: 20000 }),
  Object.freeze({ type: "number", minimum: -1000000000000, maximum: 1000000000000 }),
  Object.freeze({ type: "boolean" }),
  Object.freeze({ type: "null" }),
]);

function createBoundedJsonDefinitions(maxDepth = 8) {
  const definitions = {
    boundedValue0: Object.freeze({ oneOf: boundedPrimitiveBranches }),
  };
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const childRef = Object.freeze({ $ref: `#/$defs/boundedValue${depth - 1}` });
    definitions[`boundedValue${depth}`] = Object.freeze({
      oneOf: Object.freeze([
        ...boundedPrimitiveBranches,
        Object.freeze({ type: "array", maxItems: 100, items: childRef }),
        Object.freeze({
          type: "object",
          maxProperties: 64,
          propertyNames: Object.freeze({ type: "string", maxLength: 160 }),
          additionalProperties: childRef,
        }),
      ]),
    });
  }
  definitions.boundedObject = Object.freeze({
    type: "object",
    maxProperties: 64,
    propertyNames: Object.freeze({ type: "string", maxLength: 160 }),
    additionalProperties: Object.freeze({ $ref: `#/$defs/boundedValue${maxDepth}` }),
  });
  return Object.freeze(definitions);
}

const boundedJsonDefinitions = createBoundedJsonDefinitions();
const boundedStringArraySchema = Object.freeze({ type: "array", maxItems: 100, items: { type: "string", maxLength: 500 } });
const boundedRecordArraySchema = Object.freeze({ type: "array", maxItems: 100, items: boundedObjectSchema });
const commonResponseProperties = Object.freeze({
  ok: { type: "boolean" },
  code: { type: "string", maxLength: 80, description: "Stable failure code when ok is false." },
  message: { type: "string", maxLength: 800 },
  retryable: { type: "boolean", description: "Whether the request can succeed after the stated recovery." },
  recommendedTool: { type: ["string", "null"], maxLength: 120 },
  recommendedRoute: { type: "string", maxLength: 240 },
  recoveryInput: boundedObjectSchema,
  details: boundedObjectSchema,
  field: { type: "string", maxLength: 160 },
  missingFields: boundedStringArraySchema,
  allowed: boundedStringArraySchema,
  flowId: { type: "string", maxLength: 120 },
  action: { type: "string", maxLength: 80 },
  currentState: { type: "string", maxLength: 100 },
  currentVersion: { type: "integer", minimum: 0, maximum: 1000000 },
  expectedVersion: { type: "integer", minimum: 0, maximum: 1000000 },
  requestId: { type: "string", maxLength: 120 },
  definitionId: { type: "string", maxLength: 120 },
  type: { type: "string", maxLength: 120 },
  visibleActionRequired: { type: "boolean" },
  existingEventId: { type: "string", maxLength: 120 },
  eventId: { type: "string", maxLength: 120 },
  fromState: { type: ["string", "null"], maxLength: 100 },
  suppliedFromState: { type: ["string", "null"], maxLength: 100 },
  toState: { type: "string", maxLength: 100 },
});

function responseSchema(resultKey, description, { resultSchema = boundedObjectSchema, properties = {}, additionalProperties = false } = {}) {
  return Object.freeze({
    type: "object",
    description,
    maxProperties: 32,
    $defs: boundedJsonDefinitions,
    properties: {
      ...commonResponseProperties,
      ...(resultKey ? { [resultKey]: resultSchema } : {}),
      ...properties,
    },
    required: ["ok"],
    additionalProperties,
  });
}

const actionSchema = Object.freeze({
  type: "object",
  maxProperties: 18,
  properties: {
    action: { type: "string", maxLength: 80 },
    aliases: boundedStringArraySchema,
    label: { type: "string", maxLength: 120 },
    description: { type: "string", maxLength: 500 },
    from: boundedStringArraySchema,
    to: { type: "string", maxLength: 100 },
    trigger: { type: "string", maxLength: 120 },
    inputSchema: boundedObjectSchema,
    requiredInput: boundedStringArraySchema,
    relatedCapabilityId: { type: "string", maxLength: 160 },
    relatedTool: { type: ["string", "null"], maxLength: 160 },
    humanOnly: { type: "boolean" },
    recovery: boundedObjectSchema,
    available: { type: "boolean" },
    availableToHuman: { type: "boolean" },
    disabledCode: { type: "string", maxLength: 80 },
    disabledReason: { type: "string", maxLength: 500 },
  },
  additionalProperties: false,
});
const actionArraySchema = Object.freeze({ type: "array", maxItems: 40, items: actionSchema });

const workflowStateOutputSchema = responseSchema("", "Current state and declared actions for one local workflow.", {
  properties: {
    flow: boundedObjectSchema,
    definition: boundedObjectSchema,
    currentState: { type: "string", maxLength: 100 },
    version: { type: "integer", minimum: 0, maximum: 1000000 },
    stateMeta: boundedObjectSchema,
    terminal: { type: "boolean" },
    error: { type: "boolean" },
    availableActions: actionArraySchema,
    humanActions: actionArraySchema,
    unavailableActions: actionArraySchema,
    valid: boundedStringArraySchema,
    disabled: boundedStringArraySchema,
    validNextStates: boundedStringArraySchema,
  },
  additionalProperties: false,
});

const workflowHistoryOutputSchema = responseSchema("", "Bounded chronological history for one local workflow.", {
  properties: {
    flowId: { type: "string", maxLength: 120 },
    currentState: { type: "string", maxLength: 100 },
    version: { type: "integer", minimum: 0, maximum: 1000000 },
    count: { type: "integer", minimum: 0, maximum: 1000000 },
    events: boundedRecordArraySchema,
  },
  additionalProperties: false,
});

const workflowActionsOutputSchema = responseSchema("", "Valid, human-only, and unavailable actions for one workflow state.", {
  properties: {
    flowId: { type: "string", maxLength: 120 },
    definitionId: { type: "string", maxLength: 120 },
    currentState: { type: "string", maxLength: 100 },
    version: { type: "integer", minimum: 0, maximum: 1000000 },
    terminal: { type: "boolean" },
    error: { type: "boolean" },
    valid: boundedStringArraySchema,
    disabled: boundedStringArraySchema,
    validNextStates: boundedStringArraySchema,
    availableActions: actionArraySchema,
    humanActions: actionArraySchema,
    unavailableActions: actionArraySchema,
    resetAvailable: { type: "boolean" },
  },
  additionalProperties: false,
});

const workflowTransitionOutputSchema = responseSchema("", "One declared workflow transition and its current availability.", {
  properties: {
    flowId: { type: "string", maxLength: 120 },
    currentState: { type: "string", maxLength: 100 },
    version: { type: "integer", minimum: 0, maximum: 1000000 },
    transition: actionSchema,
  },
  additionalProperties: false,
});

const workflowMutationOutputSchema = responseSchema("", "Result of one versioned local workflow mutation.", {
  properties: {
    event: boundedObjectSchema,
    flow: boundedObjectSchema,
    state: { type: "string", maxLength: 100 },
    version: { type: "integer", minimum: 0, maximum: 1000000 },
    availableActions: actionArraySchema,
    humanActions: actionArraySchema,
  },
  additionalProperties: false,
});

const metadata = Object.freeze({
  search_drug_index: {
    resultKey: "drugs", resultSchema: Object.freeze({ type: "array", maxItems: 50, items: boundedObjectSchema }), outputProperties: { count: { type: "integer", minimum: 0, maximum: 50 } },
    exampleRequest: { query: "lisinopril", limit: 5 }, exampleResponse: { ok: true, count: 1, drugs: [{ id: "med_lisinopril", name: "Lisinopril", variantCount: 3 }] },
    relatedTools: ["get_drug_index_entry", "find_compatible_options"], scenarios: ["drug-search", "failure-and-recovery", "full-patient-review", "webmcp-explorer-tour"],
  },
  get_drug_index_entry: {
    resultKey: "drug", exampleRequest: { drugId: "med_lisinopril" }, exampleResponse: { ok: true, drug: { id: "med_lisinopril", name: "Lisinopril", manufacturer: { name: "Cedar Demo Therapeutics", fictional: true }, clinicalSample: { coverage: "sample-and-incomplete", requiresProfessionalReview: true }, variants: [{ id: "lisinopril-5mg-30", strength: "5mg", quantity: 30 }] } },
    relatedTools: ["search_drug_index", "get_drug_availability"], scenarios: ["drug-search", "failure-and-recovery", "full-patient-review", "webmcp-explorer-tour"],
  },
  find_compatible_options: {
    resultKey: "compatibility", exampleRequest: { drugId: "med_lisinopril", purpose: "price" }, exampleResponse: { ok: true, compatibility: { source: { id: "med_lisinopril", name: "Lisinopril" }, purpose: "price", sameDrugProviderComparison: { drugId: "med_lisinopril", relationship: { kind: "same_drug" }, eligibleForPurpose: true }, eligible: [], coverage: "explicit-seeded-only" } },
    relatedTools: ["compare_medication_options", "find_related_drugs"], scenarios: ["semantic-comparison", "doctor-discussion-card", "full-patient-review"],
    errors: [{ code: "UNKNOWN_DRUG", recovery: "Search the seeded index and retry with the exact returned drug id." }],
  },
  compare_medication_options: {
    resultKey: "comparison", exampleRequest: { drugIds: ["med_lisinopril"], purpose: "price", postalCode: "21201" }, exampleResponse: { ok: true, comparison: { purpose: "price", relationships: [{ kind: "same_drug", reasonCode: "SAME_INDEXED_DRUG" }], rankable: true, compatibilityCoverage: "explicit-seeded-only" } },
    relatedTools: ["find_compatible_options", "compare_drug_availability"], scenarios: ["semantic-comparison", "full-patient-review"],
    errors: [{ code: "INCOMPATIBLE_COMPARISON", recovery: "Call cleardose_find_compatible_options for the selected drug." }, { code: "LOCATION_MISMATCH", recovery: "Use a seeded location id and postal code that identify the same demo location." }],
  },
  compare_drug_prices: {
    resultKey: "comparison", exampleRequest: { drugIds: ["med_lisinopril"] }, exampleResponse: { ok: true, comparison: { selections: [{ drug: { id: "med_lisinopril" }, bestOffer: { providerName: "Harbor Demo Pharmacy" } }], currency: "USD", compatibilityEnforced: true } },
    relatedTools: ["find_compatible_options", "compare_medication_options"], scenarios: [],
    errors: [
      { code: "INCOMPATIBLE_COMPARISON", recovery: "Choose an explicitly seeded comparable record." },
      { code: "PACKAGE_NOT_FOUND", recovery: "Call cleardose_get_drug_index_entry and retry with an exact indexed strength and quantity." },
    ],
  },
  find_related_drugs: {
    resultKey: "related", resultSchema: boundedRecordArraySchema,
    outputProperties: { source: boundedObjectSchema, relationship: { type: "string", maxLength: 240 }, coverage: { type: "string", maxLength: 80 }, disclaimer: { type: "string", maxLength: 800 } },
    exampleRequest: { drugId: "med_lisinopril", limit: 5 }, exampleResponse: { ok: true, source: { id: "med_lisinopril", name: "Lisinopril" }, relationship: "Explicit seeded clinician-discussion relationship", related: [{ id: "med_losartan", relationship: { kind: "discussion_only_alternative", reasonCode: "SEEDED_BLOOD_PRESSURE_DISCUSSION" } }], coverage: "explicit-seeded-only" },
    relatedTools: ["find_compatible_options", "prepare_doctor_question_card_request"], scenarios: [],
  },
  get_drug_availability: {
    resultKey: "availability", exampleRequest: { drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", locationId: "demo-baltimore" }, exampleResponse: { ok: true, availability: { location: { id: "demo-baltimore", postalCode: "21201" }, variant: { id: "lisinopril-10mg-60" }, counts: { in_stock: 2, low_stock: 1, unavailable: 1 }, offers: [{ providerName: "Harbor Demo Pharmacy", inventory: { status: "in_stock" } }], fictional: true } },
    relatedTools: ["compare_drug_availability", "estimate_delivery"], scenarios: ["availability-within-three-days", "checkout-cost-review", "full-patient-review"],
    errors: [{ code: "LOCATION_UNAVAILABLE", recovery: "Choose one of the seeded demo locations." }, { code: "LOCATION_MISMATCH", recovery: "Use a seeded location id and postal code that identify the same demo location." }, { code: "PACKAGE_UNAVAILABLE", recovery: "Use the returned recovery input or inspect another exact package." }],
  },
  compare_drug_availability: {
    resultKey: "comparison", exampleRequest: { drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", locationId: "demo-baltimore", fulfillmentMode: "shipping", maxDeliveryDays: 3 }, exampleResponse: { ok: true, comparison: { fulfillmentMode: "shipping", maxDeliveryDays: 3, options: [{ fulfillmentMode: "shipping", arrivalDays: 2 }], bestOption: { arrivalDays: 2 }, fictional: true } },
    relatedTools: ["find_compatible_options", "get_drug_availability", "estimate_delivery"], scenarios: ["availability-within-three-days"],
    errors: [{ code: "LOCATION_MISMATCH", recovery: "Use a seeded location id and postal code that identify the same demo location." }, { code: "DELIVERY_WINDOW_MISSED", recovery: "Review the fastest seeded option or revise the deadline." }, { code: "PACKAGE_UNAVAILABLE", recovery: "Inspect the exact package at the seeded location." }],
  },
  estimate_delivery: {
    resultKey: "estimate", exampleRequest: { drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", providerId: "harbor-demo-pharmacy", locationId: "demo-baltimore", fulfillmentMode: "shipping" }, exampleResponse: { ok: true, estimate: { offer: { providerId: "harbor-demo-pharmacy", providerName: "Harbor Demo Pharmacy" }, fulfillmentMode: "shipping", estimate: { available: true, deliveryWindow: { minDays: 1, maxDays: 2 } }, fictional: true } },
    relatedTools: ["get_drug_availability", "compare_drug_availability"], scenarios: ["availability-within-three-days", "checkout-cost-review"],
    errors: [{ code: "LOCATION_MISMATCH", recovery: "Use a seeded location id and postal code that identify the same demo location." }, { code: "PROVIDER_NOT_FOUND", recovery: "Get the seeded offers and retry with an exact provider or offer id." }, { code: "PROVIDER_UNAVAILABLE", recovery: "Choose an available fulfillment mode or seeded provider." }],
  },
  review_demo_interaction_flags: {
    resultKey: "review", exampleRequest: { drugIds: ["med_sildenafil", "med_isosorbide_mononitrate"] }, exampleResponse: { ok: true, review: { coverage: "synthetic-and-incomplete", requiresProfessionalReview: true } },
    relatedTools: ["prepare_doctor_question_card_request"], scenarios: [],
  },
  build_procurement_plan: {
    resultKey: "plan", exampleRequest: { items: [{ drugId: "med_lisinopril" }], strategy: "balanced" }, exampleResponse: { ok: true, plan: { placedOrder: false, localOnly: true } },
    relatedTools: ["compare_drug_availability", "add_to_cart"], scenarios: [],
  },
  prepare_doctor_question_card_request: {
    resultKey: "exchange", outputSchema: responseSchema("", "Prepared doctor question-card exchange contract.", { properties: { exchangeId: { type: "string", maxLength: 120 }, flowId: { type: "string", maxLength: 120 }, context: boundedObjectSchema, instruction: { type: "string", maxLength: 4000 }, expectedResponse: boundedObjectSchema }, additionalProperties: false }),
    permissions: ["local-state-write", "human-review"], exampleRequest: { drugId: "med_lisinopril", concerns: ["What should I ask about common side effects?"] }, exampleResponse: { ok: true, exchangeId: "exchange_demo", flowId: "flow_demo", expectedResponse: { toolName: "cleardose_submit_doctor_question_card_draft", schema: { required: ["exchangeId", "title", "questions"] } } },
    relatedTools: ["find_compatible_options", "get_drug_availability", "submit_doctor_question_card_draft"], scenarios: ["doctor-discussion-card"],
  },
  submit_doctor_question_card_draft: {
    resultKey: "card", outputProperties: { visibleState: { type: "string", enum: ["human_review"] } }, permissions: ["local-state-write", "human-review"], exampleRequest: { exchangeId: "exchange_demo", title: "Questions for my visit", questions: ["What benefits and risks should we discuss?", "What monitoring should I ask about?"] }, exampleResponse: { ok: true, card: { id: "card_demo", status: "human_review", questions: ["What benefits and risks should we discuss?", "What monitoring should I ask about?"] }, visibleState: "human_review" },
    relatedTools: ["prepare_doctor_question_card_request"], scenarios: ["doctor-discussion-card"],
  },
  prepare_prescription_follow_up: {
    resultKey: "followUp", outputProperties: { visibleState: { type: "string", enum: ["human_review"] } }, permissions: ["local-state-write", "human-review"], exampleRequest: { drugId: "med_lisinopril", preferredPath: "undecided" }, exampleResponse: { ok: true, followUp: { code: "PRESCRIPTION_REQUIRED", requiresHumanReview: true, form: { submitLabel: "Review follow-up packet" } }, visibleState: "human_review" },
    relatedTools: ["add_to_cart", "prepare_agent_memory_packet"], scenarios: [],
  },
  prepare_agent_memory_packet: {
    resultKey: "packet", outputProperties: { visibleState: { type: "string", enum: ["human_review"] } }, permissions: ["local-state-write", "human-review"], exampleRequest: { label: "ClearDose demo", facts: ["All prices are fictional."] }, exampleResponse: { ok: true, packet: { id: "memory_demo", label: "ClearDose demo" }, visibleState: "human_review" },
    relatedTools: ["inspect_workflow_runtime"], scenarios: [],
  },
  inspect_workflow_runtime: {
    resultKey: "runtime", exampleRequest: { limit: 20 }, exampleResponse: { ok: true, runtime: { flows: [], events: [] } },
    relatedTools: ["inspect_workflow_state", "get_workflow_history"], scenarios: ["human-control-boundary", "state-branching-demo", "full-patient-review", "webmcp-explorer-tour"],
  },
  inspect_workflow_state: {
    resultKey: "state", outputSchema: workflowStateOutputSchema, exampleRequest: { flowId: "flow_demo" }, exampleResponse: { ok: true, flow: { id: "flow_demo", definitionId: "state-interaction-demo" }, currentState: "search_complete", version: 1, terminal: false, error: false, valid: ["COMPARE", "CHECK_AVAILABILITY"], disabled: [] },
    relatedTools: ["get_available_workflow_actions", "get_workflow_history"], scenarios: ["state-branching-demo"],
    errors: [{ code: "UNKNOWN_FLOW", recovery: "Inspect the runtime and retry with an exact current flow id." }],
  },
  get_workflow_history: {
    resultKey: "history", outputSchema: workflowHistoryOutputSchema, exampleRequest: { flowId: "flow_demo", limit: 25 }, exampleResponse: { ok: true, flowId: "flow_demo", currentState: "search_complete", version: 1, count: 1, events: [{ id: "evt_seed", version: 1, type: "SEARCH_COMPLETED" }] },
    relatedTools: ["inspect_workflow_state"], scenarios: ["state-branching-demo"],
    errors: [{ code: "UNKNOWN_FLOW", recovery: "Inspect the runtime and retry with an exact current flow id." }],
  },
  get_available_workflow_actions: {
    resultKey: "actions", outputSchema: workflowActionsOutputSchema, exampleRequest: { flowId: "flow_demo" }, exampleResponse: { ok: true, flowId: "flow_demo", currentState: "search_complete", version: 1, valid: ["COMPARE", "CHECK_AVAILABILITY"], disabled: [], availableActions: [{ action: "COMPARE", to: "comparing", available: true }], humanActions: [], unavailableActions: [], resetAvailable: true },
    relatedTools: ["get_workflow_transition", "dispatch_workflow_transition"], scenarios: ["state-branching-demo"],
    errors: [{ code: "UNKNOWN_FLOW", recovery: "Inspect the runtime and retry with an exact current flow id." }],
  },
  get_workflow_transition: {
    resultKey: "transition", outputSchema: workflowTransitionOutputSchema, exampleRequest: { flowId: "flow_demo", action: "COMPARE" }, exampleResponse: { ok: true, flowId: "flow_demo", currentState: "search_complete", version: 1, transition: { action: "COMPARE", from: ["search_complete"], to: "comparing", available: true, humanOnly: false } },
    relatedTools: ["get_available_workflow_actions", "dispatch_workflow_transition"], scenarios: ["state-branching-demo"],
    errors: [{ code: "UNKNOWN_ACTION", recovery: "List the current workflow actions and retry with a declared action." }, { code: "UNKNOWN_FLOW", recovery: "Inspect the runtime and retry with an exact current flow id." }],
  },
  dispatch_workflow_transition: {
    resultKey: "transition", outputSchema: workflowMutationOutputSchema, permissions: ["local-workflow-write"], exampleRequest: { flowId: "flow_demo", action: "COMPARE", input: {}, expectedVersion: 1, requestId: "call_demo_compare" }, exampleResponse: { ok: true, event: { id: "evt_compare", type: "COMPARE" }, flow: { id: "flow_demo", state: "comparing" }, state: "comparing", version: 2, availableActions: [], humanActions: [] },
    relatedTools: ["inspect_workflow_state", "get_available_workflow_actions"], scenarios: ["state-branching-demo"],
    errors: [{ code: "STALE_STATE_VERSION", recovery: "Inspect the state again and retry with its current version." }, { code: "INVALID_TRANSITION", recovery: "Call cleardose_get_available_workflow_actions." }, { code: "ACTION_REQUIRES_HUMAN", recovery: "Use the visible human control for this action." }, { code: "DUPLICATE_ACTION", recovery: "Inspect the workflow history instead of repeating the request id." }],
  },
  reset_workflow_state: {
    resultKey: "state", outputSchema: workflowMutationOutputSchema, permissions: ["local-workflow-write"], exampleRequest: { flowId: "flow_demo", expectedVersion: 2, requestId: "call_demo_reset" }, exampleResponse: { ok: true, event: { id: "evt_reset", type: "WORKFLOW_RESET" }, flow: { id: "flow_demo", state: "search_complete" }, state: "search_complete", version: 3, availableActions: [{ action: "COMPARE", available: true }], humanActions: [] },
    relatedTools: ["inspect_workflow_state"], scenarios: [],
    errors: [{ code: "STALE_STATE_VERSION", recovery: "Inspect the state again and retry with its current version." }, { code: "DUPLICATE_ACTION", recovery: "Inspect the workflow history instead of repeating the request id." }],
  },
  highlight_section: {
    resultKey: "target", resultSchema: { type: "string", maxLength: 80 }, outputProperties: { message: { type: "string", maxLength: 500 } }, permissions: ["visible-dom-focus"], exampleRequest: { target: "comparison-results" }, exampleResponse: { ok: true, target: "comparison-results", message: "Highlighted comparison results." },
    relatedTools: ["inspect_workflow_runtime"], scenarios: [],
    errors: [{ code: "INVALID_INPUT", recovery: "Choose a listed section that is present on the current route." }],
  },
  get_cart: {
    resultKey: "items", resultSchema: Object.freeze({ type: "array", maxItems: MAX_CART_LINES, items: boundedObjectSchema }), outputProperties: { itemCount: { type: "integer", minimum: 0, maximum: MAX_CART_ITEM_COUNT }, subtotal: { type: "number", minimum: 0 }, shipping: { type: "number", minimum: 0 }, total: { type: "number", minimum: 0 } }, exampleRequest: {}, exampleResponse: { ok: true, items: [], itemCount: 0, subtotal: 0, shipping: 0, total: 0 }, relatedTools: ["add_to_cart"], scenarios: ["checkout-cost-review", "human-control-boundary", "full-patient-review"],
  },
  add_to_cart: {
    resultKey: "", outputSchema: responseSchema("", "Result of adding one exact package to the local mock cart.", { properties: { itemCount: { type: "integer", minimum: 0, maximum: MAX_CART_ITEM_COUNT }, total: { type: "number", minimum: 0 }, fulfillmentGate: boundedObjectSchema }, additionalProperties: false }), permissions: ["local-commerce-write"], exampleRequest: { drugId: "med_lisinopril", variantId: "lisinopril-5mg-30" }, exampleResponse: { ok: true, itemCount: 1, total: 11.75, fulfillmentGate: { code: "PRESCRIPTION_REQUIRED", humanReviewRequired: true } },
    relatedTools: ["get_drug_availability", "get_cart", "prepare_prescription_follow_up"], scenarios: ["checkout-cost-review", "full-patient-review"],
    errors: [{ code: "CART_LINE_LIMIT", recovery: `Remove one of the ${MAX_CART_LINES} package lines, then retry the exact package.` }],
  },
});

function tool(id, category, prompt, { kind = "static", role = "patient" } = {}) {
  const details = metadata[id] ?? {};
  const permissions = details.permissions ?? ["local-read"];
  const resultKey = details.resultKey ?? "result";
  return Object.freeze({
    id: `cleardose.${category}.${id}`,
    toolName: id,
    qualifiedName: `cleardose_${id}`,
    namespace: "cleardose",
    category,
    interactionModel: "imperative",
    registration: "imperative",
    routes: Object.freeze(details.routes ?? ["*"]),
    permissions: Object.freeze(permissions),
    examplePrompt: prompt,
    voicePrompt: details.voicePrompt ?? `${prompt} Read back the exact seeded result and stop before any human-only action.`,
    advancedPrompt: details.advancedPrompt ?? `${prompt} Return the structured result, name any mocked fields, and explain the next valid action.`,
    expectedResult: details.expectedResult ?? `A deterministic local ${resultKey.replaceAll("_", " ")} result with mock-data labels and recovery details when needed.`,
    outputSchema: details.outputSchema ?? responseSchema(resultKey, `Structured response for cleardose_${id}.`, {
      resultSchema: details.resultSchema ?? boundedObjectSchema,
      properties: details.outputProperties ?? {},
    }),
    exampleRequests: Object.freeze([Object.freeze(details.exampleRequest ?? {})]),
    exampleResponse: Object.freeze(details.exampleResponse ?? { ok: true }),
    deterministicErrors: Object.freeze((details.errors ?? []).map((item) => Object.freeze(item))),
    relatedTools: Object.freeze(details.relatedTools ?? []),
    scenarioIds: Object.freeze(details.scenarios ?? []),
    machine: Object.freeze({
      id: `machine.tool.${id.replaceAll("_", "-")}.v1`, kind, role,
      scope: Object.freeze({ role, situation: "browser-tool-call", step: id }),
      states: Object.freeze(["queued", "running", "complete", "error"]),
    }),
  });
}

function form(id, category, prompt, route, {
  properties = {}, required = [], exampleRequest = {}, autoSubmit = false, presentAfterRun = true,
} = {}) {
  const visibleValueSchema = Object.freeze({
    oneOf: [
      { type: "string", maxLength: 800 },
      { type: "boolean" },
      { type: "number" },
      { type: "array", maxItems: 30, items: { type: "string", maxLength: 800 } },
    ],
  });
  const visibleFormSchema = Object.freeze({
    type: "object",
    maxProperties: 5,
    properties: {
      toolName: { type: "string", maxLength: 120 },
      submitted: { type: "boolean" },
      presentAfterRun: { type: "boolean" },
      changedFields: boundedStringArraySchema,
      changes: Object.freeze({
        type: "array",
        maxItems: 30,
        items: { type: "object", maxProperties: 3, properties: { field: { type: "string", maxLength: 120 }, before: visibleValueSchema, after: visibleValueSchema }, required: ["field", "before", "after"], additionalProperties: false },
      }),
    },
    required: ["toolName", "submitted", "presentAfterRun", "changedFields", "changes"],
    additionalProperties: false,
  });
  return Object.freeze({
    id: `cleardose.${category}.${id}`,
    toolName: id,
    qualifiedName: `cleardose_${id}`,
    namespace: "document",
    category,
    interactionModel: "declarative",
    registration: "declarative",
    autoSubmit,
    route,
    routes: Object.freeze([route]),
    permissions: Object.freeze(["visible-form-write", autoSubmit ? "visible-form-submit" : "human-submit"]),
    examplePrompt: prompt,
    voicePrompt: autoSubmit
      ? `${prompt} Tell me which visible fields changed and whether the form submitted.`
      : `${prompt} Tell me which visible fields you filled, then stop for my review.`,
    advancedPrompt: autoSubmit
      ? `${prompt} Report each populated field and the visible form submission result.`
      : `${prompt} Report each populated field and leave the final submission under my control.`,
    expectedResult: autoSubmit
      ? `The visible form contains the requested fictional values and submits through its declared ${id} handler.`
      : "The visible form contains the requested fictional values and remains available for human review.",
    inputSchema: Object.freeze({ type: "object", maxProperties: 30, properties, ...(required.length ? { required } : {}), additionalProperties: false }),
    outputSchema: responseSchema("visibleForm", `Visible DOM result for ${id}.`, {
      resultSchema: visibleFormSchema,
      properties: {
        toolName: { type: "string", maxLength: 120 },
        interactionModel: { type: "string", enum: ["declarative"] },
        mocked: { type: "boolean" },
      },
      additionalProperties: false,
    }),
    exampleRequests: Object.freeze([Object.freeze(exampleRequest)]),
    exampleResponse: Object.freeze({ ok: true, toolName: `cleardose_${id}`, interactionModel: "declarative", visibleForm: { toolName: `cleardose_${id}`, submitted: autoSubmit, presentAfterRun, changedFields: Object.keys(exampleRequest), changes: Object.entries(exampleRequest).map(([field, after]) => ({ field, before: "", after })) }, mocked: true }),
    deterministicErrors: Object.freeze([
      Object.freeze({ code: "TOOL_UNAVAILABLE_ON_ROUTE", recovery: `Open ${route === "global" ? "a route with the form visible" : route}.` }),
      Object.freeze({ code: "INVALID_INPUT", recovery: "Use only the declared fields and their exact JSON types." }),
      Object.freeze({ code: "MISSING_VISIBLE_FIELD", recovery: "Reload the named route and confirm the visible form still exposes the field." }),
      ...(autoSubmit ? [Object.freeze({ code: "VISIBLE_FORM_SUBMIT_FAILED", recovery: "Review the populated fields, then use the visible submit control." })] : []),
    ]),
    relatedTools: Object.freeze([]),
    scenarioIds: Object.freeze([]),
    machine: Object.freeze({
      id: `machine.form.${id.replaceAll("_", "-")}.v1`, kind: "static", role: "patient",
      scope: Object.freeze({ role: "patient", situation: "visible-form", step: id }),
      states: Object.freeze(["idle", "editing", "validating", autoSubmit ? "submitted" : "ready", "rejected"]),
    }),
  });
}

export const capabilityCatalog = Object.freeze([
  tool("search_drug_index", "discovery-and-pricing", "Find lisinopril in the local ClearDose drug index."),
  tool("get_drug_index_entry", "discovery-and-pricing", "Show the exact indexed packages and sample facts for med_lisinopril."),
  tool("find_compatible_options", "discovery-and-pricing", "Show which options ClearDose explicitly marks as comparable with lisinopril and explain each relationship."),
  tool("compare_medication_options", "discovery-and-pricing", "Compare the structured facts for lisinopril and one explicitly compatible option, including why the comparison is allowed."),
  tool("compare_drug_prices", "discovery-and-pricing", "Compare fictional prices for explicitly compatible lisinopril options without calling them substitutes."),
  tool("find_related_drugs", "discovery-and-pricing", "Find discussion-only records related to lisinopril so I can prepare doctor questions."),
  tool("get_drug_availability", "shopping-and-procurement", "Show seeded provider, stock, pickup, shipping, and delivery facts for lisinopril at the Baltimore demo location."),
  tool("compare_drug_availability", "shopping-and-procurement", "Find explicitly compatible lisinopril options that can reach the Baltimore demo location within three days."),
  tool("estimate_delivery", "shopping-and-procurement", "Estimate the seeded delivery window for one exact lisinopril package and provider."),
  tool("review_demo_interaction_flags", "discovery-and-pricing", "Review the synthetic flags for sildenafil and isosorbide mononitrate and state the coverage limit."),
  tool("build_procurement_plan", "shopping-and-procurement", "Build a lowest-total fictional procurement plan for lisinopril and atorvastatin. Do not order."),
  tool("prepare_doctor_question_card_request", "patient-and-clinician", "Prepare a bounded doctor discussion card for lisinopril with trusted price, availability, side effect, warning, and discussion facts."),
  tool("submit_doctor_question_card_draft", "patient-and-clinician", "Use the prepared exchange schema to return two neutral questions for human review.", { role: "agent" }),
  tool("prepare_prescription_follow_up", "patient-and-clinician", "My lisinopril order says prescription required. Prepare editable next steps and do not contact anyone."),
  tool("prepare_agent_memory_packet", "dynamic-documents-and-memory", "Create a reviewable memory packet for this demo with facts, decisions, next steps, and flow references.", { kind: "dynamic" }),
  tool("inspect_workflow_runtime", "interface-and-observability", "Show current ClearDose flows, recent event ids, states, and bounded context."),
  tool("inspect_workflow_state", "interface-and-observability", "Inspect one workflow's current truth, version, valid actions, and disabled actions."),
  tool("get_workflow_history", "interface-and-observability", "Show the chronological event history for one exact ClearDose workflow."),
  tool("get_available_workflow_actions", "interface-and-observability", "List every valid and disabled next action for one exact workflow state."),
  tool("get_workflow_transition", "interface-and-observability", "Explain one declared workflow transition, its input, target state, and related tool."),
  tool("dispatch_workflow_transition", "interface-and-observability", "Dispatch one declared local workflow transition using the current version. Do not solve the whole workflow."),
  tool("reset_workflow_state", "interface-and-observability", "Reset one local workflow to its declared initial state while preserving its event history."),
  tool("highlight_section", "interface-and-observability", "Highlight the visible workflow runtime so we can inspect the same section."),
  tool("get_cart", "shopping-and-procurement", "Read my local mock cart and total without exposing profile data."),
  tool("add_to_cart", "shopping-and-procurement", "Add the exact indexed lisinopril package I selected to the local demo cart."),
  form("navigate_to_drug_search", "declarative-forms", "Fill the header medication search with lisinopril and submit it.", "global", { properties: { query: { type: "string", minLength: 1, maxLength: 120 } }, required: ["query"], exampleRequest: { query: "lisinopril" }, autoSubmit: true }),
  form("navigate_to_mobile_drug_search", "declarative-forms", "Fill the mobile medication search with lisinopril and submit it.", "global", { properties: { query: { type: "string", minLength: 1, maxLength: 120 } }, required: ["query"], exampleRequest: { query: "lisinopril" }, autoSubmit: true }),
  form("navigate_to_home_drug_search", "declarative-forms", "Use the home search to find atorvastatin.", "/", { properties: { query: { type: "string", minLength: 1, maxLength: 120 } }, required: ["query"], exampleRequest: { query: "atorvastatin" }, autoSubmit: true, presentAfterRun: false }),
  form("filter_visible_drug_index", "declarative-forms", "Filter the visible UDI to statins.", "/udi", { properties: { query: { type: "string", maxLength: 120 }, category: { type: "string", maxLength: 80 }, drugClass: { type: "string", maxLength: 80 } }, exampleRequest: { query: "atorvastatin", category: "Heart health", drugClass: "Statin" }, autoSubmit: true }),
  form("filter_visible_medication_catalog", "declarative-forms", "Filter the visible medication catalog to blood pressure.", "/medications", { properties: { query: { type: "string", minLength: 1, maxLength: 120 } }, required: ["query"], exampleRequest: { query: "blood pressure" }, autoSubmit: true }),
  form("populate_visible_price_comparison", "declarative-forms", "Populate the visible comparison with an explicitly compatible pair.", "/compare", { properties: { leftMedicationId: { type: "string", maxLength: 100 }, rightMedicationId: { type: "string", maxLength: 100 }, purpose: { type: "string", enum: ["facts", "price", "fulfillment", "doctor_discussion"] }, leftVariantId: { type: "string", maxLength: 140 }, locationId: { type: "string", maxLength: 80 } }, required: ["leftMedicationId", "rightMedicationId", "purpose"], exampleRequest: { leftMedicationId: "med_lisinopril", rightMedicationId: "med_lisinopril", purpose: "price", leftVariantId: "lisinopril-10mg-60", locationId: "demo-baltimore" }, autoSubmit: true }),
  form("prepare_provider_note", "declarative-forms", "Fill a fictional provider-routing note for my review and do not send it.", "/contact-doctor", { properties: { "patient-name": { type: "string", minLength: 1, maxLength: 120 }, "patient-email": { type: "string", minLength: 3, maxLength: 160 }, "provider-name": { type: "string", minLength: 1, maxLength: 120 }, "provider-phone": { type: "string", maxLength: 40 }, medication: { type: "string", minLength: 1, maxLength: 160 } }, required: ["patient-name", "patient-email", "provider-name", "medication"], exampleRequest: { "patient-name": "Jamie Demo", "patient-email": "jamie@demo.invalid", "provider-name": "Dr. Sample", "provider-phone": "410-555-0100", medication: "Lisinopril 10mg" } }),
  form("populate_question_card_demo", "declarative-forms", "Populate the visible question-card demo with lisinopril.", "/flow-lab", { properties: { drugId: { type: "string", maxLength: 100 }, relatedDrugIds: { type: "array", maxItems: 3, items: { type: "string", maxLength: 100 } }, concerns: { type: "string", maxLength: 1000 } }, required: ["drugId"], exampleRequest: { drugId: "med_lisinopril", relatedDrugIds: ["med_losartan"], concerns: "What monitoring and cost questions should I discuss?" } }),
  form("compose_dynamic_capability_template", "declarative-forms", "After you start a fresh one-input document-tool draft in Capability Studio, fill its declared input and safe template for review. This does not save or register it. Workflows and extra input rows stay under visible human control.", "/studio", {
    properties: {
      kind: { type: "string", enum: ["tool"] },
      name: { type: "string", minLength: 3, maxLength: 60, pattern: "^[a-z][a-z0-9_]{2,59}$" },
      title: { type: "string", minLength: 1, maxLength: 100 },
      description: { type: "string", minLength: 1, maxLength: 500 },
      examplePrompt: { type: "string", maxLength: 500 },
      role: { type: "string", minLength: 1, maxLength: 60 },
      situation: { type: "string", minLength: 1, maxLength: 80 },
      scopeStep: { type: "string", minLength: 1, maxLength: 80 },
      field_0_name: { type: "string", minLength: 3, maxLength: 60, pattern: "^[a-z][a-z0-9_]{2,59}$" },
      field_0_label: { type: "string", minLength: 1, maxLength: 80 },
      field_0_type: { type: "string", enum: ["string", "number", "integer", "boolean"] },
      field_0_required: { type: "boolean" },
      field_0_description: { type: "string", maxLength: 180 },
      field_0_example: { type: "string", maxLength: 180 },
      body: { type: "string", minLength: 1, maxLength: 12000 },
      voiceGuide: { type: "string", maxLength: 1200 },
    },
    required: ["kind", "name", "title", "description", "role", "situation", "scopeStep", "field_0_name", "field_0_label", "field_0_type", "field_0_required", "body"],
    exampleRequest: {
      kind: "tool", name: "make_visit_note", title: "Make a visit note", description: "Create a local review document from one fictional topic.",
      examplePrompt: "Prepare a fictional visit note and leave it for review.", role: "patient", situation: "visit-preparation", scopeStep: "visit-note",
      field_0_name: "topic", field_0_label: "Topic", field_0_type: "string", field_0_required: true, field_0_description: "Fictional topic for the review note.", field_0_example: "Cost questions for my next visit",
      body: "# Visit note\n\n<%= input.topic %>\n\nGenerated locally for human review.", voiceGuide: "Describe the fictional topic, then review the draft before saving it.",
    },
  }),
]);

const byToolName = new Map(capabilityCatalog.map((item) => [item.toolName, item]));
const byQualifiedName = new Map(capabilityCatalog.map((item) => [item.qualifiedName, item]));
const byCapabilityId = new Map(capabilityCatalog.map((item) => [item.id, item]));

export const capabilityCategories = categoryDefinitions;

export function getCapability(name) {
  const value = String(name || "");
  return byCapabilityId.get(value) ?? byToolName.get(value.replace(/^cleardose_/, "")) ?? byQualifiedName.get(value) ?? null;
}

export function groupCapabilities(items = capabilityCatalog) {
  return categoryDefinitions.map((category) => ({ ...category, capabilities: items.filter((item) => item.category === category.id) }));
}

export function decorateToolDefinitions(definitions) {
  return definitions.map((definition) => {
    const capability = getCapability(definition.name);
    if (!capability) throw new TypeError(`Missing capability catalog entry for ${definition.name}.`);
    return {
      ...definition,
      capabilityId: capability.id,
      category: capability.category,
      interactionModel: capability.interactionModel,
      machine: capability.machine,
      examplePrompt: capability.examplePrompt,
      voicePrompt: capability.voicePrompt,
      advancedPrompt: capability.advancedPrompt,
      expectedResult: capability.expectedResult,
      outputSchema: definition.outputSchema ?? capability.outputSchema,
      routes: capability.routes,
      permissions: capability.permissions,
      exampleRequests: capability.exampleRequests,
      exampleResponse: capability.exampleResponse,
      deterministicErrors: capability.deterministicErrors,
      relatedTools: capability.relatedTools,
      scenarioIds: capability.scenarioIds,
    };
  });
}
