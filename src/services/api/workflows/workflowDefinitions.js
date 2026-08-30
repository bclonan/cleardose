import { defineWorkflow, EMPTY_INPUT_SCHEMA } from "./workflowStateContracts";

function inputSchema(properties = {}, required = []) {
  return { type: "object", properties, ...(required.length ? { required } : {}), additionalProperties: false };
}

export const workflowDefinitions = Object.freeze([
  defineWorkflow({
    id: "medication-discovery",
    title: "Medication discovery",
    description: "Search, inspect, compare, and leave the patient with a reviewable next step.",
    states: ["idle", "searching", "matched", "comparing", "ready"],
    transitions: [
      { action: "SEARCH_SUBMITTED", from: ["idle", "matched"], to: "searching", description: "Submit or revise a local medication search.", relatedCapabilityId: "cleardose.discovery-and-pricing.search_drug_index", relatedTool: "cleardose_search_drug_index" },
      { action: "MATCH_FOUND", aliases: ["UDI_MATCH_SELECTED"], from: "searching", to: "matched", description: "Select one exact seeded UDI record." },
      { action: "COMPARE_REQUESTED", from: "matched", to: "comparing", description: "Compare compatible fictional offers.", relatedCapabilityId: "cleardose.discovery-and-pricing.compare_drug_prices", relatedTool: "cleardose_compare_drug_prices" },
      { action: "COMPARISON_READY", from: "comparing", to: "ready", description: "Finish the bounded comparison." },
      { action: "RESULT_ACCEPTED", from: "matched", to: "ready", description: "Finish after reviewing one result." },
      { action: "RETURN_TO_MATCH", from: "comparing", to: "matched", description: "Return to the selected record.", recovery: true },
    ],
  }),
  defineWorkflow({
    id: "procurement-plan",
    title: "Local procurement plan",
    description: "Build and review a fictional fulfillment plan without placing an order.",
    states: ["idle", "planning", "reviewing", "complete"],
    transitions: [
      { action: "PLAN_REQUESTED", aliases: ["PRICE_QUOTED"], from: "idle", to: "planning", description: "Start a local fictional plan.", relatedCapabilityId: "cleardose.shopping-and-procurement.build_procurement_plan", relatedTool: "cleardose_build_procurement_plan" },
      { action: "PLAN_READY", aliases: ["DEMO_STOCK_UNAVAILABLE", "PRICE_VERSION_STALE"], from: "planning", to: "reviewing", description: "Show the plan or a recoverable planning problem for review." },
      { action: "PLAN_REVISED", aliases: ["RETRY_PLAN"], from: "reviewing", to: "planning", description: "Revise a plan after a stock or price problem.", recovery: true },
      { action: "PLAN_REVIEW_COMPLETED", from: "reviewing", to: "complete", description: "Finish review without placing an order.", humanOnly: true },
    ],
  }),
  defineWorkflow({
    id: "doctor-question-card",
    title: "Doctor question card",
    description: "Transfer bounded site context to an agent and receive a structured, patient-reviewable question card draft.",
    states: ["requesting_context", "context_ready", "agent_drafting", "human_review", "complete"],
    transitions: [
      { action: "SITE_CONTEXT_RESOLVED", from: "requesting_context", to: "context_ready", description: "Resolve bounded trusted site facts." },
      { action: "AGENT_HANDOFF_CREATED", from: "context_ready", to: "agent_drafting", description: "Create the structured response handoff.", relatedCapabilityId: "cleardose.patient-and-clinician.prepare_doctor_question_card_request", relatedTool: "cleardose_prepare_doctor_question_card_request" },
      { action: "STRUCTURED_DRAFT_RECEIVED", from: "agent_drafting", to: "human_review", description: "Store a validated draft for patient review.", relatedCapabilityId: "cleardose.patient-and-clinician.submit_doctor_question_card_draft", relatedTool: "cleardose_submit_doctor_question_card_draft" },
      { action: "PATIENT_REVIEW_COMPLETED", from: "human_review", to: "complete", description: "Record the patient's explicit review.", humanOnly: true },
    ],
  }),
  defineWorkflow({
    id: "webmcp-tool-call",
    title: "WebMCP tool call",
    description: "Observe the execution state and bounded context for one imperative WebMCP tool call.",
    states: ["queued", "running", "complete", "error"],
    stateMeta: { complete: { terminal: true }, error: { terminal: true, error: true } },
    transitions: [
      { action: "TOOL_EXECUTION_STARTED", from: "queued", to: "running", description: "Begin the registered tool handler." },
      { action: "TOOL_EXECUTION_COMPLETED", from: "running", to: "complete", description: "Store the bounded successful result." },
      { action: "TOOL_EXECUTION_REJECTED", aliases: ["TOOL_EXECUTION_FAILED"], from: "running", to: "error", description: "Store a bounded rejected or failed result." },
    ],
  }),
  defineWorkflow({
    id: "agent-ready-form",
    title: "Agent-ready health-data form",
    description: "Validate a bounded demo form payload without storing real health information.",
    states: ["idle", "validating", "rejected", "ready"],
    stateMeta: { rejected: { terminal: false, error: true, recovery: true }, ready: { terminal: true } },
    transitions: [
      { action: "VISIBLE_FORM_SUBMITTED", aliases: ["FORM_SUBMITTED"], from: "idle", to: "validating", description: "Validate field names and bounded demo input." },
      { action: "VISIBLE_FORM_READY", from: "validating", to: "ready", description: "Return control to the visible form." },
      { action: "FORM_VALIDATION_REJECTED", from: "validating", to: "rejected", description: "Expose validation failures without persistence." },
      { action: "FORM_CORRECTED", from: "rejected", to: "validating", description: "Retry validation after visible corrections.", recovery: true, humanOnly: true },
    ],
  }),
  defineWorkflow({
    id: "shortcut-runner",
    machineId: "machine.shortcut.runner.v1",
    title: "Hackathon shortcut runner",
    description: "Run a deterministic, scoped trace of a copied agent prompt chain through local application handlers.",
    states: ["ready", "running", "human_review", "complete", "error"],
    stateMeta: { complete: { terminal: true }, error: { terminal: true, error: true } },
    transitions: [
      { action: "SHORTCUT_STARTED", from: "ready", to: "running", description: "Start a deterministic shortcut." },
      { action: "HUMAN_REVIEW_REQUIRED", from: "running", to: "human_review", description: "Pause for visible human review." },
      { action: "SHORTCUT_REVIEW_COMPLETED", from: "human_review", to: "complete", description: "Finish after explicit review.", humanOnly: true },
      { action: "SHORTCUT_FAILED", from: "running", to: "error", description: "Expose a shortcut failure." },
    ],
  }),
  defineWorkflow({
    id: "prescription-follow-up",
    machineId: "machine.prescription.follow-up.v1",
    title: "Prescription follow-up",
    description: "Convert a prescription-required gate into editable steps and a human-reviewed handoff.",
    states: ["blocked", "preparing", "human_review", "complete"],
    transitions: [
      { action: "FOLLOW_UP_PREPARATION_STARTED", aliases: ["FULFILLMENT_BLOCKED"], from: "blocked", to: "preparing", description: "Prepare administrative next steps." },
      { action: "EDITABLE_HANDOFF_PREPARED", from: "preparing", to: "human_review", description: "Leave an editable handoff under patient control.", relatedCapabilityId: "cleardose.patient-and-clinician.prepare_prescription_follow_up", relatedTool: "cleardose_prepare_prescription_follow_up" },
      { action: "FOLLOW_UP_REVIEW_COMPLETED", from: "human_review", to: "complete", description: "Finish after explicit patient review.", humanOnly: true },
    ],
  }),
  defineWorkflow({
    id: "memory-packet",
    machineId: "machine.memory.packet.v1",
    title: "Agent memory packet",
    description: "Prepare local context, pause for human review, then allow explicit copy or file save.",
    states: ["drafting", "human_review", "exported", "complete"],
    transitions: [
      { action: "MEMORY_PACKET_PREPARED", from: "drafting", to: "human_review", description: "Prepare a bounded local packet for review.", relatedCapabilityId: "cleardose.dynamic-documents-and-memory.prepare_agent_memory_packet", relatedTool: "cleardose_prepare_agent_memory_packet" },
      { action: "USER_EXPORTED_MEMORY", from: "human_review", to: "exported", description: "Record an explicit user-controlled export.", humanOnly: true },
      { action: "MEMORY_REVIEW_COMPLETED", from: "exported", to: "complete", description: "Finish after export review.", humanOnly: true },
    ],
  }),
  defineWorkflow({
    id: "dynamic-capability",
    machineId: "machine.dynamic.capability.v1",
    title: "User-created capability",
    description: "A validated local machine whose concrete definition is embedded with each flow.",
    states: ["ready", "complete"],
    transitions: [{ action: "COMPLETE_DYNAMIC_CAPABILITY", from: "ready", to: "complete", description: "Finish a validated dynamic capability." }],
  }),
  defineWorkflow({
    id: "programmatic-replay",
    machineId: "machine.replay.programmatic.v1",
    title: "Programmatic replay",
    description: "Run, pause, step, resume, restart, and inspect one deterministic local demo replay.",
    states: ["ready", "running", "paused", "complete", "error"],
    stateMeta: {
      complete: { terminal: true },
      error: { terminal: true, error: true },
    },
    transitions: [
      { action: "PROGRAMMATIC_REPLAY_STARTED", aliases: ["REPLAY_STARTED"], from: "ready", to: "running", description: "Start the local replay." },
      { action: "PROGRAMMATIC_REPLAY_PAUSED", aliases: ["REPLAY_PAUSED"], from: "running", to: "paused", description: "Pause before the next replay step." },
      { action: "PROGRAMMATIC_REPLAY_RESUMED", aliases: ["REPLAY_RESUMED"], from: "paused", to: "running", description: "Resume automatic replay." },
      { action: "PROGRAMMATIC_REPLAY_STEP", aliases: ["REPLAY_STEP_STARTED", "REPLAY_STEP_COMPLETED", "REPLAY_FAILURE_OBSERVED"], from: "running", to: "running", description: "Record one visible replay step while running." },
      { action: "PROGRAMMATIC_REPLAY_SINGLE_STEP_STARTED", aliases: ["REPLAY_STEP_STARTED"], from: "paused", to: "running", description: "Start one requested step from a paused replay." },
      { action: "PROGRAMMATIC_REPLAY_STEPPED", aliases: ["REPLAY_PAUSED_STEP_COMPLETED", "REPLAY_STEP_COMPLETED", "REPLAY_FAILURE_OBSERVED"], from: "paused", to: "paused", description: "Record a step that finished after the replay was paused." },
      { action: "PROGRAMMATIC_REPLAY_COMPLETED", aliases: ["REPLAY_COMPLETED"], from: ["running", "paused"], to: "complete", description: "Finish the local replay." },
      { action: "PROGRAMMATIC_REPLAY_FAILED", aliases: ["REPLAY_FAILED"], from: ["ready", "running", "paused"], to: "error", description: "Expose a replay failure and its bounded recovery context." },
    ],
  }),
  defineWorkflow({
    id: "failure-fixture",
    machineId: "machine.failure.fixture.v1",
    title: "Deterministic failure fixture",
    description: "Run a bounded seeded failure, show its structured code, and leave an explicit recovery path.",
    states: ["ready", "attempting", "error", "recovered"],
    stateMeta: {
      error: { terminal: false, error: true, recovery: true, description: "The seeded failure is visible with a declared recovery." },
      recovered: { terminal: true, description: "The failure fixture returned to a safe local state." },
    },
    transitions: [
      { action: "FAILURE_ATTEMPTED", from: "ready", to: "attempting", description: "Run the selected local failure fixture." },
      { action: "PERMISSION_DENIED", aliases: ["MOCK_SERVICE_TIMEOUT", "DUPLICATE_SUBMISSION", "UNSUPPORTED_EXTERNAL_FULFILLMENT", "NO_EQUIVALENT_MEDICATION"], from: "attempting", to: "error", description: "Expose the structured failure without an external action." },
      { action: "RECOVER_FAILURE_FIXTURE", from: "error", to: "recovered", description: "Finish the fixture after reviewing its recovery guidance.", recovery: true, humanOnly: true },
    ],
  }),
  defineWorkflow({
    id: "state-interaction-demo",
    machineId: "machine.state.interaction-demo.v1",
    title: "Branching state interaction demo",
    description: "Expose current truth and several legitimate next actions without hiding workflow decisions inside one tool.",
    initialState: "search_complete",
    states: ["search_complete", "viewing_result", "comparing", "checking_availability", "changing_query", "asking_agent", "checkout_review", "error", "complete"],
    stateMeta: {
      search_complete: { description: "One exact seeded result is ready for a user or agent to inspect." },
      error: { terminal: false, error: true, recovery: true, description: "A deterministic failure is visible and has declared recovery actions." },
      complete: { terminal: true, description: "The local review is complete." },
    },
    transitions: [
      { action: "VIEW_RESULT", from: "search_complete", to: "viewing_result", description: "Inspect the exact seeded drug record.", relatedCapabilityId: "cleardose.discovery-and-pricing.get_drug_index_entry", relatedTool: "cleardose_get_drug_index_entry" },
      { action: "COMPARE", from: "search_complete", to: "comparing", description: "Compare explicitly compatible fictional options.", relatedCapabilityId: "cleardose.discovery-and-pricing.compare_drug_prices", relatedTool: "cleardose_compare_drug_prices" },
      { action: "CHECK_AVAILABILITY", from: "search_complete", to: "checking_availability", description: "Check seeded availability for the selected package.", relatedTool: "cleardose_get_drug_availability", inputSchema: inputSchema({ zip: { type: "string", minLength: 5, maxLength: 10 } }) },
      { action: "CHANGE_QUERY", from: "search_complete", to: "changing_query", description: "Prepare a revised local search.", relatedCapabilityId: "cleardose.discovery-and-pricing.search_drug_index", relatedTool: "cleardose_search_drug_index" },
      { action: "ASK_AGENT", from: "search_complete", to: "asking_agent", description: "Prepare another bounded agent question without changing commerce state.", relatedCapabilityId: "cleardose.interface-and-observability.inspect_workflow_state", relatedTool: "cleardose_inspect_workflow_state" },
      { action: "START_CHECKOUT", from: "search_complete", to: "checkout_review", description: "Open the visible checkout review. This transition cannot place an order.", trigger: "human", humanOnly: true },
      { action: "QUERY_CHANGED", from: "changing_query", to: "search_complete", description: "Apply the revised fictional query.", inputSchema: inputSchema({ query: { type: "string", minLength: 1, maxLength: 120 } }, ["query"]) },
      { action: "RETURN_TO_RESULTS", from: ["viewing_result", "comparing", "checking_availability", "asking_agent", "checkout_review"], to: "search_complete", description: "Return to the branch point.", recovery: true },
      { action: "INCOMPATIBLE_COMPARISON", from: "comparing", to: "error", description: "Reject a comparison that is not explicitly compatible." },
      { action: "LOCATION_UNAVAILABLE", aliases: ["MOCK_SERVICE_FAILED", "DELIVERY_WINDOW_MISSED", "PROVIDER_UNAVAILABLE"], from: "checking_availability", to: "error", description: "Expose a deterministic availability failure." },
      { action: "RECOVER_TO_RESULTS", from: "error", to: "search_complete", description: "Return to the result and choose another branch.", recovery: true },
      { action: "RETRY_CHECK_AVAILABILITY", from: "error", to: "checking_availability", description: "Retry the seeded availability lookup.", recovery: true },
      { action: "REVIEW_COMPLETE", from: ["viewing_result", "comparing", "checking_availability", "asking_agent"], to: "complete", description: "Finish the local review without an order or external action.", humanOnly: true },
    ],
  }),
]);

const byId = new Map(workflowDefinitions.map((definition) => [definition.id, definition]));

export function getWorkflowDefinition(id) {
  return byId.get(String(id)) ?? null;
}

export { EMPTY_INPUT_SCHEMA };
