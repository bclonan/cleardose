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
  Object.freeze({
    id: "shortcut-runner",
    machineId: "machine.shortcut.runner.v1",
    title: "Hackathon shortcut runner",
    description: "Run a deterministic, scoped visual analog of a copied agent prompt chain.",
    states: Object.freeze(["ready", "running", "human_review", "complete", "error"]),
  }),
  Object.freeze({
    id: "prescription-follow-up",
    machineId: "machine.prescription.follow-up.v1",
    title: "Prescription follow-up",
    description: "Convert a prescription-required gate into editable steps and a human-reviewed handoff.",
    states: Object.freeze(["blocked", "preparing", "human_review", "complete"]),
  }),
  Object.freeze({
    id: "memory-packet",
    machineId: "machine.memory.packet.v1",
    title: "Agent memory packet",
    description: "Prepare local context, pause for human review, then allow explicit copy or file save.",
    states: Object.freeze(["drafting", "human_review", "exported", "complete"]),
  }),
  Object.freeze({
    id: "dynamic-capability",
    machineId: "machine.dynamic.capability.v1",
    title: "User-created capability",
    description: "A validated local machine whose concrete definition is embedded with each flow.",
    states: Object.freeze(["ready", "complete"]),
  }),
]);

const byId = new Map(workflowDefinitions.map((definition) => [definition.id, definition]));

export function getWorkflowDefinition(id) {
  return byId.get(String(id)) ?? null;
}
