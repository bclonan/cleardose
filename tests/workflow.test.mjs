import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ configFile: false, root, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
after(async () => vite.close());

async function runtimeFixture({ withDrugIndex = false } = {}) {
  const { MemoryWorkflowDao } = await vite.ssrLoadModule("/src/infrastructure/persistence/MemoryWorkflowDao.js");
  const { WorkflowRuntime } = await vite.ssrLoadModule("/src/services/workflows/WorkflowRuntime.js");
  const dao = new MemoryWorkflowDao({ reason: "test" });
  const runtime = new WorkflowRuntime({ dao, channelName: "cleardose-test" });
  let drugs = [];
  if (withDrugIndex) {
    const [{ UniversalDrugIndex }, { drugConcepts }, { demoInteractionRules }, { comparisonRelationships }] = await Promise.all([
      vite.ssrLoadModule("/src/services/api/udi/UniversalDrugIndex.js"),
      vite.ssrLoadModule("/src/services/api/udi/drugConcepts.js"),
      vite.ssrLoadModule("/src/services/api/udi/demoInteractionRules.js"),
      vite.ssrLoadModule("/src/services/api/udi/comparisonCompatibility.js"),
    ]);
    const index = new UniversalDrugIndex({ concepts: drugConcepts, interactionRules: demoInteractionRules, relationships: comparisonRelationships });
    drugs = index.listEntries();
    runtime.configureDrugIndexOperations(index);
  }
  await runtime.initialize({ drugs });
  return { dao, runtime };
}

test("workflow runtime preserves every event context snapshot", async () => {
  const { runtime } = await runtimeFixture();
  const flow = await runtime.startFlow({ definitionId: "medication-discovery", title: "Test discovery", context: { query: "lisinopril" } });
  await runtime.transition(flow.id, { type: "SEARCH_SUBMITTED", toState: "searching", context: { resultCount: 0 } });
  await runtime.transition(flow.id, { type: "MATCH_FOUND", toState: "matched", context: { resultCount: 1, drugId: "med_lisinopril" } });
  const inspected = runtime.inspect({ flowId: flow.id });
  assert.equal(inspected.flows[0].state, "matched");
  assert.equal(inspected.events.length, 3);
  assert.equal(inspected.events[1].context.query, "lisinopril");
  assert.equal(inspected.events[2].context.drugId, "med_lisinopril");
});

test("structured exchange derives price facts, omits concern text, and requires question-shaped output", async () => {
  const { dao, runtime } = await runtimeFixture();
  const primaryDrug = {
    id: "med_lisinopril", name: "Lisinopril", genericFor: "Zestril", drugClass: "ACE inhibitor",
    variants: [{ price: 8.25 }],
  };
  const exchange = await runtime.prepareDoctorQuestionCard({
    primaryDrug,
    relatedDrugs: [{ id: "med_losartan", name: "Losartan", fromPrice: 9.5 }],
    concerns: ["Real health concern sentinel must not persist"],
  });
  assert.equal(exchange.status, "awaiting_agent");
  assert.match(exchange.instruction, /cleardose_submit_doctor_question_card_draft/);
  assert.deepEqual(exchange.requestContext.concernSummary, { count: 1, authoredTextStored: false });
  assert.doesNotMatch(JSON.stringify(exchange), /Real health concern sentinel/);
  assert.doesNotMatch(JSON.stringify(await dao.loadSnapshot()), /Real health concern sentinel/);
  await assert.rejects(
    runtime.submitDoctorQuestionCard({ exchangeId: exchange.id, title: "Questions", questions: ["This is advice", "Another question?"] }),
    /must be phrased as a question/,
  );
  const card = await runtime.submitDoctorQuestionCard({
    exchangeId: exchange.id,
    title: "Questions for my visit",
    questions: ["What should I understand about this medicine?", "What monitoring should we discuss?"],
  });
  assert.equal(card.status, "human_review");
  assert.deepEqual(card.priceFacts, [
    "Lisinopril: fictional indexed packages from $8.25.",
    "Losartan: fictional indexed packages from $9.50.",
  ]);
  assert.equal(card.clinicalFacts.label, "Sample clinical data, incomplete");
  assert.equal(card.clinicalFacts.requiresProfessionalReview, true);
  assert.deepEqual(card.availabilityFacts, []);
  assert.equal(runtime.inspect({ flowId: exchange.flowId }).flows[0].state, "human_review");
});

test("negative fixtures capture form, stock, price, branch, location, service, and delivery failures", async () => {
  const { runtime } = await runtimeFixture({ withDrugIndex: true });
  const invalid = await runtime.runNegativeScenario("invalid-health-form");
  const unavailable = await runtime.runNegativeScenario("out-of-stock");
  const price = await runtime.runNegativeScenario("price-updated");
  const prescription = await runtime.runNegativeScenario("prescription-required");
  const incompatible = await runtime.runNegativeScenario("incompatible-comparison");
  const missingLocation = await runtime.runNegativeScenario("location-unavailable");
  const serviceFailure = await runtime.runNegativeScenario("mock-service-failure");
  const missedWindow = await runtime.runNegativeScenario("delivery-window-missed");
  const providerFailure = await runtime.runNegativeScenario("provider-unavailable");
  const permissionDenied = await runtime.runNegativeScenario("permission-denied");
  const serviceTimeout = await runtime.runNegativeScenario("mock-service-timeout");
  const duplicate = await runtime.runNegativeScenario("duplicate-submission");
  const unsupportedFulfillment = await runtime.runNegativeScenario("unsupported-external-fulfillment");
  const noEquivalent = await runtime.runNegativeScenario("no-equivalent-medication");
  assert.equal(invalid.state, "rejected");
  assert.equal(invalid.context.persisted, false);
  assert.equal(unavailable.context.availability, "unavailable-demo-stock");
  assert.equal(price.context.requiresReconfirmation, true);
  assert.equal(price.context.orderPlaced, false);
  assert.equal(prescription.state, "human_review");
  assert.equal(prescription.context.recommendedTool, "cleardose_prepare_prescription_follow_up");
  assert.equal(incompatible.state, "error");
  assert.equal(incompatible.context.code, "INCOMPATIBLE_COMPARISON");
  assert.equal(missingLocation.context.zip, "[redacted]");
  assert.equal(missingLocation.context.location, "[redacted]");
  assert.equal(serviceFailure.context.code, "MOCK_SERVICE_FAILED");
  assert.equal(missedWindow.context.code, "DELIVERY_WINDOW_MISSED");
  assert.equal(providerFailure.context.code, "PROVIDER_UNAVAILABLE");
  assert.equal(permissionDenied.context.operationEvidence.result.code, "PERMISSION_DENIED");
  assert.equal(serviceTimeout.context.operationEvidence.result.code, "MOCK_SERVICE_TIMEOUT");
  assert.equal(duplicate.context.operationEvidence.result.code, "DUPLICATE_ACTION");
  assert.equal(unsupportedFulfillment.context.operationEvidence.result.code, "UNSUPPORTED_EXTERNAL_FULFILLMENT");
  assert.equal(noEquivalent.context.operationEvidence.result.code, "NO_EQUIVALENT_MEDICATION");
  assert.equal(noEquivalent.context.operationEvidence.result.count, 0);
  assert.ok([permissionDenied, serviceTimeout, duplicate, unsupportedFulfillment, noEquivalent].every((flow) => flow.state === "error"));
  assert.equal(unavailable.context.operationEvidence.result.code, "PACKAGE_UNAVAILABLE");
  assert.equal(incompatible.context.operationEvidence.result.code, "INCOMPATIBLE_COMPARISON");
  assert.equal(missedWindow.context.operationEvidence.result.code, "DELIVERY_WINDOW_MISSED");
  assert.deepEqual(runtime.getAvailableActions({ flowId: incompatible.id }).valid.sort(), ["RECOVER_TO_RESULTS", "RETRY_CHECK_AVAILABILITY"].sort());
});

test("dynamic shortcut machine preserves role, situation, step, and every visible step", async () => {
  const { runtime } = await runtimeFixture();
  const shortcut = { id: "test-tour", title: "Test tour", summary: "Bounded test", mode: "multi-step", scope: { role: "judge", situation: "demo", step: "tour" }, steps: [{ id: "search", title: "Search", prompt: "Search", capabilityId: "cleardose.discovery-and-pricing.search_drug_index" }, { id: "inspect", title: "Inspect", prompt: "Inspect", capabilityId: "cleardose.interface-and-observability.inspect_workflow_runtime" }] };
  const flow = await runtime.startShortcut(shortcut);
  await runtime.advanceShortcut(flow.id, shortcut, 0);
  await runtime.advanceShortcut(flow.id, shortcut, 1);
  const inspected = runtime.inspect({ flowId: flow.id });
  assert.equal(inspected.flows[0].state, "human_review");
  assert.deepEqual(inspected.flows[0].context.scope, shortcut.scope);
  assert.equal(inspected.flows[0].context.machineDefinition.id, "machine.dynamic.shortcut-test-tour.v1");
  assert.equal(inspected.events.length, 4);
  await assert.rejects(runtime.startDynamicMachine({ id: "unsafe", title: "Unsafe", states: ["idle", "done"], scope: { role: "judge" } }), /role, situation, and step/);
});

test("seeded local database adapter answers drug queries and memory packets remain reviewable", async () => {
  const { MemoryWorkflowDao } = await vite.ssrLoadModule("/src/infrastructure/persistence/MemoryWorkflowDao.js");
  const { WorkflowRuntime } = await vite.ssrLoadModule("/src/services/workflows/WorkflowRuntime.js");
  const dao = new MemoryWorkflowDao({ reason: "test" });
  const runtime = new WorkflowRuntime({ dao, channelName: "query-test" });
  await runtime.initialize({ drugs: [{ id: "med_lisinopril", name: "Lisinopril", genericFor: "Zestril", category: "Heart health", drugClass: "ACE inhibitor", identifiers: { udi: "udi:cleardose:lisinopril" }, variants: [{ price: 8.25 }] }] });
  const records = await runtime.querySeededDrugs({ query: "ACE", limit: 5 });
  assert.equal(records[0].id, "med_lisinopril");
  const sentinel = "authored-memory-sentinel-must-not-persist";
  const packet = await runtime.prepareMemoryPacket({ label: sentinel, goal: sentinel, facts: [sentinel], decisions: [sentinel], nextSteps: [sentinel], flowIds: [] });
  assert.equal(packet.status, "human_review");
  assert.match(packet.markdown, new RegExp(sentinel));
  assert.equal(runtime.snapshot().memoryPackets.length, 1);
  assert.deepEqual(runtime.snapshot().memoryPackets[0].counts, { facts: 1, decisions: 1, nextSteps: 1, flowReferences: 0 });
  assert.equal(runtime.snapshot().memoryPackets[0].authoredTextStored, false);
  assert.equal("markdown" in runtime.snapshot().memoryPackets[0], false);
  assert.doesNotMatch(JSON.stringify(runtime.snapshot()), new RegExp(sentinel));
  assert.doesNotMatch(JSON.stringify(await dao.loadSnapshot()), new RegExp(sentinel));
});

test("workflow inspection caps and deterministically orders every returned collection", async () => {
  const { runtime } = await runtimeFixture();
  for (let index = 0; index < 5; index += 1) {
    const timestamp = `2026-08-29T12:00:0${index}.000Z`;
    const flowId = `flow_inspect_${index}`;
    runtime.flows.set(flowId, { id: flowId, definitionId: "webmcp-tool-call", title: `Flow ${index}`, state: "complete", status: "completed", context: {}, eventCount: 1, createdAt: timestamp, updatedAt: timestamp });
    runtime.events.set(`evt_inspect_${index}`, { id: `evt_inspect_${index}`, flowId, definitionId: "webmcp-tool-call", type: "TOOL_EXECUTION_COMPLETED", fromState: "running", toState: "complete", source: "test", correlationId: "", context: {}, createdAt: timestamp, version: 1 });
    runtime.cards.set(`card_inspect_${index}`, { id: `card_inspect_${index}`, artifactType: "doctor-question-card", flowId, status: "human_review", createdAt: timestamp, updatedAt: timestamp });
    runtime.cards.set(`memory_inspect_${index}`, { id: `memory_inspect_${index}`, artifactType: "agent-memory-packet", flowId, status: "human_review", authoredTextStored: false, contentStored: false, createdAt: timestamp, updatedAt: timestamp });
  }

  const inspected = runtime.inspect({ limit: 2 });
  assert.deepEqual(inspected.flows.map((flow) => flow.id), ["flow_inspect_4", "flow_inspect_3"]);
  assert.deepEqual(inspected.events.map((event) => event.id), ["evt_inspect_3", "evt_inspect_4"]);
  assert.deepEqual(inspected.cards.map((card) => card.id), ["card_inspect_4", "card_inspect_3"]);
  assert.deepEqual(inspected.memoryPackets.map((packet) => packet.id), ["memory_inspect_4", "memory_inspect_3"]);
  assert.equal(inspected.artifacts.length, 2);
});

test("static workflow definitions expose branching and replay transition contracts", async () => {
  const { getWorkflowDefinition, workflowDefinitions } = await vite.ssrLoadModule("/src/services/api/workflows/workflowDefinitions.js");
  const { createDefaultTools } = await vite.ssrLoadModule("/src/infrastructure/webmcp/tools/createDefaultTools.js");
  const stateDemo = getWorkflowDefinition("state-interaction-demo");
  assert.equal(stateDemo.initialState, "search_complete");
  assert.equal(stateDemo.stateMeta.error.error, true);
  assert.equal(stateDemo.stateMeta.error.terminal, false);
  assert.equal(stateDemo.stateMeta.error.recovery, true);
  assert.deepEqual(
    stateDemo.transitions.filter((transition) => transition.from.includes("search_complete")).map((transition) => transition.action),
    ["VIEW_RESULT", "COMPARE", "CHECK_AVAILABILITY", "CHANGE_QUERY", "ASK_AGENT", "START_CHECKOUT"],
  );
  assert.equal(stateDemo.transitions.find((transition) => transition.action === "START_CHECKOUT").humanOnly, true);
  const availabilityTransition = stateDemo.transitions.find((transition) => transition.action === "CHECK_AVAILABILITY");
  const defaultTools = createDefaultTools({ store: {}, highlightService: { listTargets: () => [], highlight: () => ({ ok: true }) } });
  const defaultToolsByName = new Map(defaultTools.map((tool) => [`cleardose_${tool.name}`, tool]));
  assert.deepEqual(Object.keys(availabilityTransition.inputSchema.properties), ["postalCode"]);
  assert.deepEqual(
    availabilityTransition.inputSchema.properties.postalCode,
    defaultToolsByName.get(availabilityTransition.relatedTool).inputSchema.properties.postalCode,
  );
  for (const definition of workflowDefinitions) {
    for (const transition of definition.transitions.filter((item) => item.relatedTool)) {
      assert.ok(defaultToolsByName.has(transition.relatedTool), `${definition.id}.${transition.action} references an unknown tool.`);
    }
  }

  const replay = getWorkflowDefinition("programmatic-replay");
  assert.deepEqual(replay.states, ["ready", "running", "paused", "complete", "error"]);
  assert.equal(replay.transitions.find((transition) => transition.aliases.includes("REPLAY_STEP_STARTED")).to, "running");
  assert.equal(replay.transitions.find((transition) => transition.aliases.includes("REPLAY_FAILURE_OBSERVED")).to, "running");
  assert.equal(replay.transitions.find((transition) => transition.action === "PROGRAMMATIC_REPLAY_COMPLETED").from.includes("paused"), true);
});

test("seedDemoFlows adds one persistent branching flow without replacing existing history", async () => {
  const { dao, runtime } = await runtimeFixture();
  await runtime.startFlow({ definitionId: "webmcp-tool-call", title: "Existing flow", context: { retained: true } });
  await runtime.seedDemoFlows();
  const seeded = runtime.snapshot().flows.filter((flow) => flow.definitionId === "state-interaction-demo");
  assert.equal(seeded.length, 1);
  assert.equal(seeded[0].state, "search_complete");
  assert.equal(seeded[0].eventCount, 1);
  assert.equal(runtime.snapshot().flows.some((flow) => flow.context.retained), true);

  const { WorkflowRuntime } = await vite.ssrLoadModule("/src/services/workflows/WorkflowRuntime.js");
  const reloaded = new WorkflowRuntime({ dao, channelName: "reload-test" });
  await reloaded.initialize({ drugs: [] });
  await reloaded.seedDemoFlows();
  assert.equal(reloaded.snapshot().flows.filter((flow) => flow.definitionId === "state-interaction-demo").length, 1);
  assert.equal(reloaded.inspectState({ flowId: seeded[0].id }).currentState, "search_complete");
});

test("state queries expose agent actions, human-only actions, transition details, and ordered history", async () => {
  const { runtime } = await runtimeFixture();
  const flow = await runtime.startFlow({ definitionId: "state-interaction-demo", title: "State query", context: { drugId: "med_lisinopril" } });
  const inspected = runtime.inspectState({ flowId: flow.id });
  assert.equal(inspected.currentState, "search_complete");
  assert.equal(inspected.version, 1);
  assert.deepEqual(inspected.valid, ["VIEW_RESULT", "COMPARE", "CHECK_AVAILABILITY", "CHANGE_QUERY", "ASK_AGENT", "START_CHECKOUT"]);
  assert.deepEqual(inspected.humanActions.map((action) => action.action), ["START_CHECKOUT"]);
  assert.equal(inspected.availableActions.some((action) => action.action === "START_CHECKOUT"), false);
  assert.equal(inspected.validNextStates.includes("checkout_review"), true);

  const transition = runtime.getTransition({ flowId: flow.id, action: "compare" });
  assert.equal(transition.transition.available, true);
  assert.equal(transition.transition.to, "comparing");
  assert.equal(transition.transition.relatedTool, "cleardose_compare_drug_prices");

  const history = runtime.getHistory({ flowId: flow.id });
  assert.equal(history.count, 1);
  assert.equal(history.events[0].type, "FLOW_STARTED");
  assert.equal(history.events[0].version, 1);
});

test("versioned dispatch rejects duplicates, stale writes, invalid edges, and human-only actions with structured errors", async () => {
  const { runtime } = await runtimeFixture();
  const flow = await runtime.startFlow({ definitionId: "state-interaction-demo", title: "Dispatch guards" });
  const dispatched = await runtime.dispatch({ flowId: flow.id, action: "COMPARE", expectedVersion: 1, requestId: "dispatch.compare.1" });
  assert.equal(dispatched.state, "comparing");
  assert.equal(dispatched.version, 2);
  assert.equal(dispatched.event.correlationId, "dispatch.compare.1");

  await assert.rejects(
    runtime.dispatch({ flowId: flow.id, action: "COMPARE", expectedVersion: 1, requestId: "dispatch.compare.1" }),
    (error) => {
      assert.equal(error.code, "DUPLICATE_ACTION");
      assert.equal(error.retryable, false);
      assert.equal(error.toStructuredContent().recommendedTool, "cleardose_get_workflow_history");
      return true;
    },
  );
  await assert.rejects(
    runtime.dispatch({ flowId: flow.id, action: "RETURN_TO_RESULTS", expectedVersion: 1, requestId: "dispatch.stale.1" }),
    (error) => {
      assert.equal(error.code, "STALE_STATE_VERSION");
      assert.equal(error.retryable, true);
      assert.equal(error.toStructuredContent().currentVersion, 2);
      return true;
    },
  );
  await assert.rejects(
    runtime.dispatch({ flowId: flow.id, action: "CHECK_AVAILABILITY", expectedVersion: 2, requestId: "dispatch.invalid.1" }),
    (error) => {
      assert.equal(error.code, "INVALID_TRANSITION");
      assert.equal(error.toStructuredContent().currentState, "comparing");
      return true;
    },
  );

  const humanFlow = await runtime.startFlow({ definitionId: "state-interaction-demo", title: "Human guard" });
  await assert.rejects(
    runtime.dispatch({ flowId: humanFlow.id, action: "START_CHECKOUT", expectedVersion: 1, requestId: "dispatch.checkout.1" }),
    (error) => {
      assert.equal(error.code, "ACTION_REQUIRES_HUMAN");
      assert.equal(error.toStructuredContent().visibleActionRequired, true);
      return true;
    },
  );
});

test("recoverable errors declare their next actions and can return to the branch point", async () => {
  const { runtime } = await runtimeFixture();
  const flow = await runtime.startFlow({ definitionId: "state-interaction-demo", title: "Recovery" });
  await runtime.dispatch({ flowId: flow.id, action: "COMPARE", expectedVersion: 1, requestId: "recover.compare.1" });
  const failed = await runtime.dispatch({ flowId: flow.id, action: "INCOMPATIBLE_COMPARISON", expectedVersion: 2, requestId: "recover.fail.1" });
  assert.equal(failed.state, "error");
  const errorState = runtime.inspectState({ flowId: flow.id });
  assert.equal(errorState.error, true);
  assert.equal(errorState.terminal, false);
  assert.deepEqual(errorState.availableActions.map((action) => action.action).sort(), ["RECOVER_TO_RESULTS", "RETRY_CHECK_AVAILABILITY"].sort());
  const recovered = await runtime.dispatch({ flowId: flow.id, action: "RECOVER_TO_RESULTS", expectedVersion: 3, requestId: "recover.return.1" });
  assert.equal(recovered.state, "search_complete");
  assert.equal(recovered.version, 4);
});

test("terminal states reject dispatch while reset restores initial state and preserves persisted history", async () => {
  const { dao, runtime } = await runtimeFixture();
  const flow = await runtime.startFlow({ definitionId: "state-interaction-demo", title: "Reset", context: { drugId: "med_lisinopril", stable: true } });
  await runtime.transition(flow.id, { type: "VIEW_RESULT", toState: "viewing_result", context: { branchOnly: true }, source: "ui" });
  await runtime.transition(flow.id, { type: "REVIEW_COMPLETE", toState: "complete", context: { reviewed: true }, source: "human" });
  await assert.rejects(
    runtime.dispatch({ flowId: flow.id, action: "COMPARE", expectedVersion: 3, requestId: "terminal.compare.1" }),
    (error) => {
      assert.equal(error.code, "TERMINAL_STATE");
      return true;
    },
  );
  const reset = await runtime.resetFlow({ flowId: flow.id, expectedVersion: 3, requestId: "reset.flow.1" });
  assert.equal(reset.state, "search_complete");
  assert.equal(reset.version, 4);
  assert.equal(reset.flow.context.drugId, "med_lisinopril");
  assert.equal(reset.flow.context.stable, true);
  assert.equal("branchOnly" in reset.flow.context, false);
  assert.equal(reset.flow.context.__runtime.resetCount, 1);
  assert.deepEqual(runtime.getHistory({ flowId: flow.id }).events.map((event) => event.type), ["FLOW_STARTED", "VIEW_RESULT", "REVIEW_COMPLETE", "WORKFLOW_RESET"]);

  await assert.rejects(
    runtime.resetFlow({ flowId: flow.id, expectedVersion: 4, requestId: "reset.flow.1" }),
    (error) => {
      assert.equal(error.code, "DUPLICATE_ACTION");
      return true;
    },
  );

  const { WorkflowRuntime } = await vite.ssrLoadModule("/src/services/workflows/WorkflowRuntime.js");
  const reloaded = new WorkflowRuntime({ dao, channelName: "reset-reload-test" });
  await reloaded.initialize({ drugs: [] });
  assert.equal(reloaded.inspectState({ flowId: flow.id }).currentState, "search_complete");
  assert.equal(reloaded.getHistory({ flowId: flow.id }).count, 4);
});

test("persisted tool traces omit patient-authored text and retain bounded operational evidence", async () => {
  const { runtime } = await runtimeFixture();
  const sentinel = "REAL_PATIENT_SENTINEL should never enter event history";
  const response = await runtime.runTool(
    "cleardose_test_probe",
    { query: sentinel, concerns: [sentinel], patientEmail: "person@example.test", zipCode: "10001", deliveryLocation: "Mock New York", nested: { postalCode: "10001" } },
    async () => ({ structuredContent: { ok: true, cardId: "card_demo", location: "Mock New York", address: "123 Demo Street", title: sentinel, questions: [sentinel], content: sentinel } }),
  );
  assert.equal(response.structuredContent.ok, true);
  const flow = runtime.snapshot().flows.find((item) => item.definitionId === "webmcp-tool-call");
  assert.equal(flow.context.input.query, "[omitted]");
  assert.deepEqual(flow.context.input.concerns, { omitted: true, count: 1 });
  assert.equal(flow.context.input.patientEmail, "[omitted]");
  assert.equal(flow.context.input.zipCode, "[redacted]");
  assert.equal(flow.context.input.deliveryLocation, "[redacted]");
  assert.equal(flow.context.input.nested.postalCode, "[redacted]");
  assert.equal(flow.context.result.cardId, "card_demo");
  assert.equal(flow.context.result.location, "[redacted]");
  assert.equal(flow.context.result.address, "[redacted]");
  assert.equal(flow.context.result.title, "[omitted]");
  assert.deepEqual(flow.context.result.questions, { omitted: true, count: 1 });
  assert.equal(flow.context.result.content, "[omitted]");
  assert.doesNotMatch(JSON.stringify(flow.context), /REAL_PATIENT_SENTINEL|person@example\.test/);
  assert.equal(typeof flow.context.elapsedMs, "number");
  assert.equal(flow.context.elapsedMs >= 0, true);
  assert.deepEqual(flow.context.execution.before, { flows: 0, events: 0, exchanges: 0, artifacts: 0 });
  assert.deepEqual(flow.context.execution.after, { flows: 1, events: 3, exchanges: 0, artifacts: 0 });

  const dynamic = await runtime.startDynamicMachine({
    id: "private-context-test",
    title: "Private context test",
    states: ["draft", "complete"],
    scope: { role: "judge", situation: "demo", step: "review" },
    context: { templateId: "template_private", input: { notes: sentinel }, guide: sentinel },
  });
  assert.equal(dynamic.context.input, undefined);
  assert.equal(dynamic.context.guide, undefined);
  assert.equal(dynamic.context.inputSummary.valuesPersisted, false);
  assert.doesNotMatch(JSON.stringify(dynamic.context), /REAL_PATIENT_SENTINEL/);

  const followUp = await runtime.preparePrescriptionFollowUp({
    code: "PRESCRIPTION_REQUIRED",
    drug: { id: "med_lisinopril", name: "Lisinopril" },
    preferredPath: "undecided",
    recommendedTool: "cleardose_prepare_prescription_follow_up",
    editablePrompt: sentinel,
    questions: [sentinel],
  });
  const followUpFlow = runtime.inspectState({ flowId: followUp.flowId }).flow;
  assert.equal(followUpFlow.context.editablePromptPrepared, true);
  assert.equal(followUpFlow.context.questionCount, 1);
  assert.doesNotMatch(JSON.stringify(followUpFlow.context), /REAL_PATIENT_SENTINEL/);
});

test("dynamic template artifacts keep authored inputs and generated content out of persistence", async () => {
  const { dao, runtime } = await runtimeFixture();
  const sentinel = "REAL_PATIENT_TEMPLATE_SENTINEL";
  const artifact = await runtime.createTemplateArtifact({
    flowId: "flow_template_privacy",
    template: {
      id: "template_privacy",
      name: "privacy_note",
      title: "Privacy note",
      scope: { role: "patient", situation: "visit", step: "review" },
    },
    input: { medication: sentinel, notes: sentinel },
    content: `Rendered ${sentinel}`,
  });
  assert.equal(artifact.content, "[omitted from persistence]");
  assert.equal(artifact.contentStored, false);
  assert.deepEqual(artifact.input, { omitted: true, fieldCount: 2 });
  assert.doesNotMatch(JSON.stringify(artifact), /REAL_PATIENT_TEMPLATE_SENTINEL/);
  assert.doesNotMatch(JSON.stringify(await dao.loadSnapshot()), /REAL_PATIENT_TEMPLATE_SENTINEL/);
});

test("dynamic machines receive deterministic sequential edges compatible with existing state events", async () => {
  const { runtime } = await runtimeFixture();
  const flow = await runtime.startDynamicMachine({
    id: "sequential-test",
    title: "Sequential test",
    states: ["draft", "review", "complete"],
    scope: { role: "judge", situation: "demo", step: "inspect" },
  });
  await runtime.transition(flow.id, { type: "USER_TEMPLATE_STATE_2_ENTERED", toState: "review", source: "capability-studio" });
  await runtime.transition(flow.id, { type: "USER_TEMPLATE_STATE_3_ENTERED", toState: "complete", source: "capability-studio" });
  const inspected = runtime.inspectState({ flowId: flow.id });
  assert.equal(inspected.currentState, "complete");
  assert.equal(inspected.terminal, true);
  assert.equal(inspected.definition.transitions.length, 2);
});

test("programmatic replay aliases support start, step, pause, resume, completion, and terminal guards", async () => {
  const { runtime } = await runtimeFixture();
  const flow = await runtime.startFlow({ definitionId: "programmatic-replay", title: "Replay" });
  await runtime.transition(flow.id, { type: "REPLAY_STARTED", toState: "running", source: "programmatic-replay" });
  await runtime.recordEvent({ flowId: flow.id, type: "REPLAY_STEP_STARTED", fromState: "running", toState: "running", context: { stepId: "one" }, source: "programmatic-replay" });
  await runtime.recordEvent({ flowId: flow.id, type: "REPLAY_FAILURE_OBSERVED", fromState: "running", toState: "running", context: { stepId: "one", expected: true }, source: "failure" });
  await runtime.recordEvent({ flowId: flow.id, type: "REPLAY_PAUSED", fromState: "running", toState: "paused", source: "programmatic-replay" });
  await runtime.recordEvent({ flowId: flow.id, type: "REPLAY_STEP_STARTED", fromState: "paused", toState: "running", context: { stepId: "two" }, source: "programmatic-replay" });
  await runtime.recordEvent({ flowId: flow.id, type: "REPLAY_STEP_COMPLETED", fromState: "running", toState: "running", context: { stepId: "two" }, source: "programmatic-replay" });
  await runtime.recordEvent({ flowId: flow.id, type: "REPLAY_PAUSED", fromState: "running", toState: "paused", source: "programmatic-replay" });
  await runtime.recordEvent({ flowId: flow.id, type: "REPLAY_RESUMED", fromState: "paused", toState: "running", source: "programmatic-replay" });
  await runtime.recordEvent({ flowId: flow.id, type: "REPLAY_COMPLETED", fromState: "running", toState: "complete", source: "programmatic-replay" });
  assert.equal(runtime.inspectState({ flowId: flow.id }).terminal, true);
  assert.deepEqual(runtime.getHistory({ flowId: flow.id }).events.map((event) => event.version), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  await assert.rejects(
    runtime.transition(flow.id, { type: "REPLAY_STARTED", toState: "running", source: "programmatic-replay" }),
    (error) => {
      assert.equal(error.code, "TERMINAL_STATE");
      return true;
    },
  );
});
