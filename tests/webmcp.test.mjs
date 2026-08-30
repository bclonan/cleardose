import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  configFile: false,
  root,
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
});
after(async () => vite.close());

test("WebMCP registry qualifies and registers tools through document.modelContext", async () => {
  const registrations = [];
  const documentRef = { modelContext: { async registerTool(tool, options) { registrations.push({ tool, options }); } } };
  const { BrowserWebMcpAdapter } = await vite.ssrLoadModule("/src/infrastructure/webmcp/BrowserWebMcpAdapter.js");
  const { WebMcpToolRegistry } = await vite.ssrLoadModule("/src/infrastructure/webmcp/WebMcpToolRegistry.js");
  const registry = new WebMcpToolRegistry({ adapter: new BrowserWebMcpAdapter({ documentRef }), namespace: "cleardose" });

  await registry.registerDefinitions([{
    name: "ping",
    description: "Return a deterministic health response.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: async () => ({ ok: true }),
    category: "test-only",
    interactionModel: "imperative",
    machine: { id: "machine.tool.ping.v1", states: ["queued", "complete"] },
  }]);

  assert.equal(registrations[0].tool.name, "cleardose_ping");
  assert.ok(registrations[0].options.signal instanceof AbortSignal);
  assert.equal(registry.snapshot().status, "ready");
  assert.equal(registry.snapshot().tools[0].description, "Return a deterministic health response.");
  assert.equal(registry.snapshot().tools[0].category, "test-only");
  assert.equal("category" in registrations[0].tool, false);
  registry.unregisterAll();
  assert.equal(registrations[0].options.signal.aborted, true);
});

test("default catalog exposes non-overlapping medication, availability, state, review, and cart tools", async () => {
  const { createDefaultTools } = await vite.ssrLoadModule("/src/infrastructure/webmcp/tools/createDefaultTools.js");
  const tools = createDefaultTools({
    store: {},
    highlightService: { listTargets: () => ["comparison-results"], highlight: () => ({ ok: true }) },
  });
  assert.deepEqual(tools.map((tool) => tool.name), [
    "search_drug_index",
    "get_drug_index_entry",
    "find_compatible_options",
    "compare_medication_options",
    "compare_drug_prices",
    "find_related_drugs",
    "get_drug_availability",
    "compare_drug_availability",
    "estimate_delivery",
    "review_demo_interaction_flags",
    "build_procurement_plan",
    "prepare_doctor_question_card_request",
    "submit_doctor_question_card_draft",
    "prepare_prescription_follow_up",
    "prepare_agent_memory_packet",
    "inspect_workflow_runtime",
    "inspect_workflow_state",
    "get_workflow_history",
    "get_available_workflow_actions",
    "get_workflow_transition",
    "dispatch_workflow_transition",
    "reset_workflow_state",
    "highlight_section",
    "get_cart",
    "add_to_cart",
  ]);
  assert.equal(tools.find((tool) => tool.name === "compare_drug_prices").annotations.readOnlyHint, true);
  assert.equal(tools.find((tool) => tool.name === "add_to_cart").annotations.readOnlyHint, false);
  assert.equal(tools.find((tool) => tool.name === "inspect_workflow_runtime").annotations.untrustedContentHint, true);
  assert.equal(tools.find((tool) => tool.name === "find_compatible_options").annotations.readOnlyHint, true);
  assert.equal(tools.find((tool) => tool.name === "estimate_delivery").annotations.readOnlyHint, true);
  assert.equal(tools.find((tool) => tool.name === "dispatch_workflow_transition").annotations.readOnlyHint, false);
  assert.equal(tools.find((tool) => tool.name === "reset_workflow_state").annotations.readOnlyHint, false);
  assert.equal(tools.find((tool) => tool.name === "prepare_doctor_question_card_request").inputSchema.additionalProperties, false);
  assert.ok(tools.every((tool) => tool.inputSchema.additionalProperties === false));
  assert.ok(tools.every((tool) => tool.capabilityId.startsWith("cleardose.")));
  assert.ok(tools.every((tool) => tool.interactionModel === "imperative"));
  assert.ok(tools.every((tool) => tool.machine.id.startsWith("machine.tool.")));
});

test("compatibility and availability tools call the store with bounded normalized inputs", async () => {
  const { createDefaultTools } = await vite.ssrLoadModule("/src/infrastructure/webmcp/tools/createDefaultTools.js");
  const calls = [];
  const store = {
    listLocalCompatibleOptions(input) {
      calls.push(["compatible", input]);
      return { eligible: [{ drugId: "med_lisinopril" }], discussionOnly: [], disclaimer: "Fictional." };
    },
    compareLocalMedicationOptions(input) {
      calls.push(["medication-comparison", input]);
      return { selections: [{ drug: { id: "med_lisinopril" } }], rankable: true, disclaimer: "Fictional." };
    },
    getLocalDrugAvailability(input) {
      calls.push(["availability", input]);
      return { offers: [{ id: "offer_demo" }], location: { id: "demo-baltimore", label: "Baltimore demo" }, fictional: true };
    },
    compareLocalDrugAvailability(input) {
      calls.push(["availability-comparison", input]);
      return { options: [{ offer: { id: "offer_demo" } }], bestOption: { offer: { id: "offer_demo" } }, fictional: true };
    },
    estimateLocalDelivery(input) {
      calls.push(["delivery", input]);
      return { fulfillmentMode: "shipping", offer: { providerName: "Harbor Health Demo" }, fictional: true };
    },
  };
  const tools = createDefaultTools({ store, highlightService: { listTargets: () => [], highlight: () => ({ ok: true }) } });
  const byName = (name) => tools.find((tool) => tool.name === name);

  const compatible = await byName("find_compatible_options").execute({ drugId: "med_lisinopril", purpose: "price" });
  const medicationComparison = await byName("compare_medication_options").execute({
    drugIds: ["med_lisinopril"],
    variantIds: { med_lisinopril: "lisinopril-10mg-60" },
    purpose: "price",
    postalCode: "21201",
  });
  const availability = await byName("get_drug_availability").execute({
    drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", locationId: "demo-baltimore",
  });
  const availabilityComparison = await byName("compare_drug_availability").execute({
    drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", locationId: "demo-baltimore", fulfillmentMode: "shipping", maxDeliveryDays: 3,
  });
  const delivery = await byName("estimate_delivery").execute({
    drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", locationId: "demo-baltimore", fulfillmentMode: "shipping",
  });

  assert.equal(compatible.structuredContent.compatibility.eligible.length, 1);
  assert.equal(medicationComparison.structuredContent.comparison.rankable, true);
  assert.equal(availability.structuredContent.availability.fictional, true);
  assert.equal(availabilityComparison.structuredContent.comparison.options.length, 1);
  assert.equal(delivery.structuredContent.estimate.offer.providerName, "Harbor Health Demo");
  assert.deepEqual(calls[0], ["compatible", { drugId: "med_lisinopril", purpose: "price" }]);
  assert.deepEqual(calls[1], ["medication-comparison", {
    drugIds: ["med_lisinopril"], variantIds: { med_lisinopril: "lisinopril-10mg-60" }, purpose: "price", locationId: "", postalCode: "21201",
  }]);
  assert.deepEqual(calls[3][1], {
    drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", compatibleDrugIds: [], locationId: "demo-baltimore", postalCode: "", fulfillmentMode: "shipping", maxDeliveryDays: 3,
  });
  assert.equal("maxDeliveryDays" in byName("estimate_delivery").inputSchema.properties, false);
  assert.equal(byName("compare_medication_options").inputSchema.properties.variantIds.maxProperties, 4);
});

test("branching state tools expose current truth and dispatch only one versioned action", async () => {
  const { createDefaultTools } = await vite.ssrLoadModule("/src/infrastructure/webmcp/tools/createDefaultTools.js");
  const calls = [];
  const store = {
    inspectWorkflowState(input) {
      calls.push(["inspect", input]);
      return { flow: { id: input.flowId }, currentState: "search_complete", version: 1, availableActions: [{ action: "COMPARE" }], humanActions: [{ action: "START_CHECKOUT" }], unavailableActions: [] };
    },
    getWorkflowHistory(input) {
      calls.push(["history", input]);
      return { flowId: input.flowId, currentState: "search_complete", version: 1, count: 1, events: [{ id: "evt_seed" }] };
    },
    getAvailableWorkflowActions(input) {
      calls.push(["actions", input]);
      return { flowId: input.flowId, availableActions: [{ action: "COMPARE" }], humanActions: [{ action: "START_CHECKOUT" }], unavailableActions: [] };
    },
    getWorkflowTransition(input) {
      calls.push(["transition", input]);
      return { flowId: input.flowId, currentState: "search_complete", version: 1, transition: { action: input.action, from: ["search_complete"], to: "comparing" } };
    },
    async dispatchWorkflowTransition(input) {
      calls.push(["dispatch", input]);
      return { ok: true, event: { id: "evt_compare", type: "COMPARE" }, flow: { id: input.flowId }, state: "comparing", version: 2, availableActions: [], humanActions: [] };
    },
    async resetWorkflowState(input) {
      calls.push(["reset", input]);
      return { ok: true, event: { id: "evt_reset", type: "WORKFLOW_RESET" }, flow: { id: input.flowId }, state: "search_complete", version: 3, availableActions: [{ action: "COMPARE" }], humanActions: [] };
    },
  };
  const tools = createDefaultTools({ store, highlightService: { listTargets: () => [], highlight: () => ({ ok: true }) } });
  const byName = (name) => tools.find((tool) => tool.name === name);
  const flowId = "flow_state_demo";

  const inspected = await byName("inspect_workflow_state").execute({ flowId });
  const history = await byName("get_workflow_history").execute({ flowId, limit: 20 });
  const actions = await byName("get_available_workflow_actions").execute({ flowId });
  const transition = await byName("get_workflow_transition").execute({ flowId, action: "COMPARE" });
  const dispatched = await byName("dispatch_workflow_transition").execute({ flowId, action: "COMPARE", input: {}, expectedVersion: 1, requestId: "state-demo-compare-1" });
  const reset = await byName("reset_workflow_state").execute({ flowId, expectedVersion: 2, requestId: "state-demo-reset-1" });
  const oversizedActionInput = await byName("dispatch_workflow_transition").execute({ flowId, action: "QUERY_CHANGED", input: { query: "x".repeat(241) }, expectedVersion: 3, requestId: "state-demo-query-1" });

  assert.equal(inspected.structuredContent.flow.id, flowId);
  assert.equal(inspected.structuredContent.version, 1);
  assert.equal(history.structuredContent.events[0].id, "evt_seed");
  assert.equal(actions.structuredContent.availableActions[0].action, "COMPARE");
  assert.equal(transition.structuredContent.transition.to, "comparing");
  assert.equal(dispatched.structuredContent.state, "comparing");
  assert.equal(reset.structuredContent.state, "search_complete");
  assert.equal(oversizedActionInput.structuredContent.code, "INVALID_INPUT");
  assert.deepEqual(calls[4], ["dispatch", { flowId, action: "COMPARE", input: {}, expectedVersion: 1, requestId: "state-demo-compare-1" }]);
  assert.equal(calls.length, 6);
  assert.equal(byName("dispatch_workflow_transition").inputSchema.additionalProperties, false);
  assert.equal(byName("dispatch_workflow_transition").inputSchema.properties.input.maxProperties, 12);
});

test("tool errors preserve domain and workflow recovery contracts", async () => {
  const { createDefaultTools } = await vite.ssrLoadModule("/src/infrastructure/webmcp/tools/createDefaultTools.js");
  const { ClearDoseDomainError } = await vite.ssrLoadModule("/src/services/api/udi/ClearDoseDomainError.js");
  const { WorkflowStateError } = await vite.ssrLoadModule("/src/services/workflows/WorkflowRuntime.js");
  const store = {
    getLocalDrugAvailability() {
      throw new ClearDoseDomainError("LOCATION_UNAVAILABLE", "That location is not seeded.", {
        retryable: true,
        recommendedTool: "cleardose_get_drug_availability",
        recoveryInput: { locationId: "demo-baltimore" },
        details: { field: "locationId" },
      });
    },
    async dispatchWorkflowTransition() {
      throw new WorkflowStateError("STALE_STATE_VERSION", "The workflow changed.", {
        retryable: true,
        recommendedTool: "cleardose_inspect_workflow_state",
        details: { currentVersion: 2, currentState: "comparing" },
      });
    },
  };
  const tools = createDefaultTools({ store, highlightService: { listTargets: () => [], highlight: () => ({ ok: true }) } });
  const availability = await tools.find((tool) => tool.name === "get_drug_availability").execute({ drugId: "med_lisinopril", locationId: "outside-demo" });
  const transition = await tools.find((tool) => tool.name === "dispatch_workflow_transition").execute({ flowId: "flow_demo", action: "COMPARE", expectedVersion: 1, requestId: "state-demo-compare-1" });

  assert.equal(availability.isError, true);
  assert.equal(availability.structuredContent.code, "LOCATION_UNAVAILABLE");
  assert.equal(availability.structuredContent.retryable, true);
  assert.equal(availability.structuredContent.recommendedTool, "cleardose_get_drug_availability");
  assert.deepEqual(availability.structuredContent.recoveryInput, { locationId: "demo-baltimore" });
  assert.deepEqual(availability.structuredContent.details, { field: "locationId" });
  assert.equal(transition.structuredContent.code, "STALE_STATE_VERSION");
  assert.equal(transition.structuredContent.recommendedTool, "cleardose_inspect_workflow_state");
  assert.equal(transition.structuredContent.currentVersion, 2);
  assert.equal(transition.structuredContent.currentState, "comparing");
});

test("capability catalog has unique names, categories, interaction tags, and machine ids", async () => {
  const { capabilityCatalog, capabilityCategories } = await vite.ssrLoadModule("/src/infrastructure/webmcp/catalog/capabilityCatalog.js");
  assert.equal(new Set(capabilityCatalog.map((item) => item.id)).size, capabilityCatalog.length);
  assert.equal(new Set(capabilityCatalog.map((item) => item.qualifiedName)).size, capabilityCatalog.length);
  assert.ok(capabilityCatalog.some((item) => item.interactionModel === "declarative"));
  assert.ok(capabilityCatalog.some((item) => item.interactionModel === "imperative"));
  assert.ok(capabilityCatalog.every((item) => capabilityCategories.some((category) => category.id === item.category)));
  assert.ok(capabilityCatalog.every((item) => /^machine\.(tool|form)\.[a-z0-9-]+\.v1$/.test(item.machine.id)));
});

test("prescription and memory tools return user-controlled human-review artifacts", async () => {
  const { createDefaultTools } = await vite.ssrLoadModule("/src/infrastructure/webmcp/tools/createDefaultTools.js");
  const store = {
    preparePrescriptionFollowUp: async () => ({ code: "PRESCRIPTION_REQUIRED", editablePrompt: "Review me", flowId: "flow_rx" }),
    prepareAgentMemoryPacket: async () => ({ id: "memory_test", markdown: "# Memory", flowId: "flow_memory" }),
  };
  const tools = createDefaultTools({ store, highlightService: { listTargets: () => [], highlight: () => ({ ok: true }) } });
  const rx = await tools.find((tool) => tool.name === "prepare_prescription_follow_up").execute({ drugId: "med_lisinopril" });
  assert.equal(rx.structuredContent.visibleState, "human_review");
  assert.equal(rx.structuredContent.followUp.code, "PRESCRIPTION_REQUIRED");
  const memory = await tools.find((tool) => tool.name === "prepare_agent_memory_packet").execute({ facts: ["fictional"] });
  assert.equal(memory.structuredContent.visibleState, "human_review");
  assert.equal(memory.structuredContent.packet.id, "memory_test");
});

test("structured question-card tool pair transfers an exact response schema", async () => {
  const { createDefaultTools } = await vite.ssrLoadModule("/src/infrastructure/webmcp/tools/createDefaultTools.js");
  const prepared = {
    id: "exchange_test",
    flowId: "flow_test",
    requestContext: { primaryDrug: { id: "med_lisinopril", name: "Lisinopril" } },
    instruction: "Return the draft with the declared schema.",
    expectedResponseSchema: { type: "object", required: ["exchangeId", "title", "questions"], additionalProperties: false },
  };
  const store = {
    prepareDoctorQuestionCard: async () => prepared,
    submitDoctorQuestionCard: async (input) => ({ id: "card_test", status: "human_review", questions: input.questions }),
  };
  const tools = createDefaultTools({ store, highlightService: { listTargets: () => [], highlight: () => ({ ok: true }) } });
  const prepareResult = await tools.find((tool) => tool.name === "prepare_doctor_question_card_request").execute({ drugId: "med_lisinopril" });
  assert.equal(prepareResult.structuredContent.expectedResponse.toolName, "cleardose_submit_doctor_question_card_draft");
  assert.deepEqual(prepareResult.structuredContent.expectedResponse.schema.required, ["exchangeId", "title", "questions"]);

  const invalid = await tools.find((tool) => tool.name === "submit_doctor_question_card_draft").execute({ exchangeId: "exchange_test", title: "Questions", questions: [] });
  assert.equal(invalid.isError, true);
  assert.equal(invalid.structuredContent.code, "INVALID_INPUT");
});

test("tool runtime validation returns structured non-retryable errors", async () => {
  const { createDefaultTools } = await vite.ssrLoadModule("/src/infrastructure/webmcp/tools/createDefaultTools.js");
  const tools = createDefaultTools({
    store: {},
    highlightService: { listTargets: () => ["udi-results"], highlight: () => ({ ok: true }) },
  });
  const result = await tools.find((tool) => tool.name === "compare_drug_prices").execute({ drugIds: [] });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.code, "INVALID_INPUT");
  assert.equal(result.structuredContent.retryable, false);
});

test("WebMCP is progressive enhancement when the browser API is unavailable", async () => {
  const { BrowserWebMcpAdapter } = await vite.ssrLoadModule("/src/infrastructure/webmcp/BrowserWebMcpAdapter.js");
  const registration = await new BrowserWebMcpAdapter({ documentRef: {} }).register({ name: "example" });
  assert.equal(registration.status, "unsupported");
});

test("memory file adapter invokes the picker before writing and closes the file", async () => {
  const events = [];
  const handle = { name: "packet.md", async createWritable() { events.push("create"); return { async write(value) { events.push(`write:${value}`); }, async close() { events.push("close"); } }; } };
  const windowRef = { isSecureContext: true, async showSaveFilePicker() { events.push("picker"); return handle; } };
  const { AgentMemoryFileService } = await vite.ssrLoadModule("/src/services/files/AgentMemoryFileService.js");
  const result = await new AgentMemoryFileService({ windowRef }).save({ label: "Packet", markdown: "# Reviewed" });
  assert.equal(result.method, "file-system-access");
  assert.deepEqual(events, ["picker", "create", "write:# Reviewed", "close"]);
});
