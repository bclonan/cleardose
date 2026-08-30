export const workflowDefinitions = Object.freeze([
  Object.freeze({
    id: "medication-discovery",
    title: "Medication discovery",
    description: "Search, inspect, compare, and leave the patient with a reviewable next step.",
    states: Object.freeze(["idle", "searching", "matched", "comparing", "ready"]),
  }),
  Object.freeze({
    id: "procurement-plan",
    title: "Local procurement plan",
    description: "Build and review a fictional fulfillment plan without placing an order.",
    states: Object.freeze(["idle", "planning", "reviewing", "complete"]),
  }),
  Object.freeze({
    id: "doctor-question-card",
    title: "Doctor question card",
    description: "Transfer bounded site context to an agent and receive a structured, patient-reviewable question card draft.",
    states: Object.freeze(["requesting_context", "context_ready", "agent_drafting", "human_review", "complete"]),
  }),
  Object.freeze({
    id: "webmcp-tool-call",
    title: "WebMCP tool call",
    description: "Observe the execution state and bounded context for one imperative WebMCP tool call.",
    states: Object.freeze(["queued", "running", "complete", "error"]),
  }),
  Object.freeze({
    id: "agent-ready-form",
    title: "Agent-ready health-data form",
    description: "Validate a bounded demo form payload without storing real health information.",
    states: Object.freeze(["idle", "validating", "rejected", "ready"]),
  }),
]);

const byId = new Map(workflowDefinitions.map((definition) => [definition.id, definition]));

export function getWorkflowDefinition(id) {
  return byId.get(String(id)) ?? null;
}
