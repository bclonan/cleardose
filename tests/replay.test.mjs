import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createPinia } from "pinia";
import { createServer } from "vite";

import { WebMcpToolInvocationError, WebMcpToolRegistry } from "../src/infrastructure/webmcp/WebMcpToolRegistry.js";
import { demoScenarios, getDemoScenario, getDemoScenariosForRoute } from "../src/services/api/demos/demoScenarios.js";
import { BoundedObservationService } from "../src/services/ui/BoundedObservationService.js";
import { ReplayDomProjectionService } from "../src/services/ui/ReplayDomProjectionService.js";
import { SectionHighlightService } from "../src/services/ui/SectionHighlightService.js";
import { ProgrammaticReplayRuntime, resolveReplayInput } from "../src/services/workflows/ProgrammaticReplayRuntime.js";
import { capabilityReplayScenarioId, createCapabilityReplayScenario } from "../src/services/api/demos/capabilityReplayScenario.js";

const expectedScenarioIds = [
  "drug-search",
  "semantic-comparison",
  "availability-within-three-days",
  "checkout-cost-review",
  "human-control-boundary",
  "doctor-discussion-card",
  "state-branching-demo",
  "failure-and-recovery",
  "full-patient-review",
  "webmcp-explorer-tour",
];

function scenario(id, steps) {
  return {
    id,
    title: id,
    summary: "Test replay",
    routes: ["/demo"],
    prompts: { human: "Human", voice: "Voice", advanced: "Advanced" },
    expectedResult: { summary: "Expected", checks: ["Checked"] },
    mocked: true,
    mockDisclosure: { label: "Mock", detail: "Fictional" },
    recoveryScenarioIds: [],
    capabilityIds: steps.map((step) => step.capabilityId),
    steps,
  };
}

test("demo scenario catalog has complete route-specific replay contracts", () => {
  assert.deepEqual(demoScenarios.map((item) => item.id), expectedScenarioIds);
  assert.equal(new Set(demoScenarios.map((item) => item.id)).size, demoScenarios.length);
  assert.ok(Object.isFrozen(demoScenarios));
  const ids = new Set(expectedScenarioIds);

  for (const item of demoScenarios) {
    assert.ok(Object.isFrozen(item));
    assert.ok(item.routes.length);
    assert.ok(item.prompts.human && item.prompts.voice && item.prompts.advanced);
    assert.ok(item.expectedResult.summary && item.expectedResult.checks.length);
    assert.ok(item.mockDisclosure.label && item.mockDisclosure.detail);
    assert.ok(item.steps.length);
    assert.deepEqual(item.capabilityIds, [...new Set(item.steps.map((step) => step.capabilityId))]);
    item.recoveryScenarioIds.forEach((id) => assert.ok(ids.has(id), `${item.id} references unknown recovery ${id}`));
    item.steps.forEach((step) => {
      assert.match(step.id, /^[a-z0-9-]+$/);
      assert.equal(step.kind, "tool");
      assert.equal(step.toolName, step.capabilityId.split(".").at(-1));
      if (step.recovery) {
        assert.ok(ids.has(step.recovery.scenarioId));
        assert.ok(getDemoScenario(step.recovery.scenarioId).steps.some((candidate) => candidate.id === step.recovery.stepId));
      }
    });
  }

  assert.deepEqual(getDemoScenariosForRoute("http://localhost:4173/#/compare?demo=1").map((item) => item.id), [
    "semantic-comparison", "availability-within-three-days", "doctor-discussion-card", "failure-and-recovery",
  ]);
  assert.equal(getDemoScenario("doctor-discussion-card").routes.includes("/contact-doctor"), true);
  assert.ok(getDemoScenariosForRoute("/").some((item) => item.id === "drug-search"));
  assert.ok(getDemoScenariosForRoute("/cart").some((item) => item.id === "checkout-cost-review"));
  assert.ok(getDemoScenariosForRoute("/medications/lisinopril").some((item) => item.id === "drug-search"));
  assert.ok(getDemoScenariosForRoute("/account/prescriptions").some((item) => item.id === "checkout-cost-review"));
  assert.ok(getDemoScenariosForRoute("/checkout").some((item) => item.id === "checkout-cost-review"));
  assert.ok(getDemoScenariosForRoute("/studio").some((item) => item.id === "state-branching-demo"));
  for (const route of ["/login", "/create-account", "/account", "/account/orders", "/account/orders/order_demo", "/checkout", "/checkout/confirmation/order_demo"]) {
    assert.ok(getDemoScenariosForRoute(route).some((item) => item.id === "human-control-boundary"), `${route} needs the read-only human-control replay.`);
  }
  assert.deepEqual(getDemoScenario("human-control-boundary").steps.map((step) => step.toolName), ["get_cart", "inspect_workflow_runtime"]);
});

test("capability scenario metadata matches executable replay steps", async () => {
  const { capabilityCatalog } = await import("../src/infrastructure/webmcp/catalog/capabilityCatalog.js");
  for (const capability of capabilityCatalog) {
    const executableScenarioIds = demoScenarios.filter((scenario) => scenario.capabilityIds.includes(capability.id)).map((scenario) => scenario.id);
    assert.deepEqual(capability.scenarioIds, executableScenarioIds, capability.toolName);
  }
});

test("a declarative capability can register and run as a one-step shared replay", async () => {
  const capability = {
    id: "cleardose.declarative-forms.prepare_provider_note",
    toolName: "prepare_provider_note",
    qualifiedName: "cleardose_prepare_provider_note",
    title: "Prepare provider note",
    interactionModel: "declarative",
    routes: ["/contact-doctor"],
    exampleRequests: [{ medication: "Lisinopril 10mg" }],
    examplePrompt: "Fill the fictional note for review.",
    expectedResult: "The visible form is populated for human review.",
  };
  const scenario = createCapabilityReplayScenario(capability, { route: "/contact-doctor" });
  assert.equal(scenario.id, capabilityReplayScenarioId(capability));
  assert.equal(scenario.steps[0].kind, "action");
  assert.deepEqual(scenario.steps[0].input, { toolName: "cleardose_prepare_provider_note", arguments: { medication: "Lisinopril 10mg" } });
  let invoked = null;
  const runtime = new ProgrammaticReplayRuntime({ scenarios: [], invokeAction: async (action, input) => { invoked = { action, input }; return { ok: true }; } });
  runtime.registerScenario(scenario);
  const result = await runtime.run(scenario.id, { route: "/contact-doctor", resetSeed: false });
  assert.equal(result.status, "complete");
  assert.deepEqual(invoked, { action: "invoke-declarative-webmcp", input: scenario.steps[0].input });
});

test("automatic highlighting scrolls to a section without taking replay-control focus", () => {
  let targetFocusCalls = 0;
  const classes = new Set();
  const replayControl = { id: "replay-step-control" };
  const target = {
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
    scrollIntoView() {},
    focus() { targetFocusCalls += 1; },
  };
  const documentRef = {
    activeElement: replayControl,
    querySelector: () => target,
    dispatchEvent() {},
  };
  const highlighter = new SectionHighlightService({ documentRef, duration: 10000 });
  const result = highlighter.highlight("udi-results");

  assert.equal(result.ok, true);
  assert.equal(documentRef.activeElement, replayControl);
  assert.equal(targetFocusCalls, 0);
  assert.equal(classes.has("agent-highlighted"), true);
  highlighter.clear();
});

test("visible replay projection updates bounded route controls and preserves focus", async () => {
  const events = [];
  const replayControl = { id: "replay-run" };
  const queryInput = {
    value: "",
    dispatchEvent(event) { events.push(event.type); },
  };
  const documentRef = {
    activeElement: replayControl,
    querySelector(selector) {
      return selector.includes('data-agent-section="medication-search"') ? queryInput : null;
    },
    querySelectorAll() { return []; },
  };
  const projection = new ReplayDomProjectionService({ documentRef, eventFactory: (type) => ({ type }) });
  const result = await projection.project({
    route: "/medications",
    step: { id: "search", toolName: "search_drug_index" },
    request: { query: "lisinopril", limit: 3, ignoredPatientNote: "not projected" },
    response: { structuredContent: { ok: true, drugs: [{ id: "med_lisinopril" }] } },
  });

  assert.equal(queryInput.value, "lisinopril");
  assert.deepEqual(events, ["input", "change"]);
  assert.equal(documentRef.activeElement, replayControl);
  assert.equal(result.status, "projected");
  assert.deepEqual(result.request, { query: "lisinopril", limit: 3 });
  assert.equal(result.response.drugCount, 1);
  assert.equal(result.focusPreserved, true);
  assert.deepEqual(result.controls, [{ control: "medication-query", changed: true }]);
});

test("WebMCP registry invokes the exact registered handler without browser support", async () => {
  let browserHandler = null;
  const adapter = {
    isSupported: () => false,
    async register(tool) {
      browserHandler = tool.execute;
      return { name: tool.name, status: "unsupported", unregister() {} };
    },
  };
  const calls = [];
  const handler = async (input, context) => {
    calls.push({ input, context });
    return { structuredContent: { ok: true, echoed: input.value } };
  };
  const registry = new WebMcpToolRegistry({ adapter });
  await registry.registerDefinitions([{
    name: "echo",
    execute: handler,
    outputSchema: { type: "object", properties: { echoed: { type: "string" } } },
    routes: ["/demo"],
    permissions: ["local-read"],
    exampleRequests: [{ value: "seeded" }],
    scenarioIds: ["webmcp-explorer-tour"],
  }]);

  assert.equal(browserHandler, handler);
  assert.equal(registry.snapshot().status, "unsupported");
  assert.equal(registry.snapshot().tools[0].locallyInvokable, true);
  assert.equal(registry.snapshot().tools[0].namespace, "cleardose");
  assert.deepEqual(registry.snapshot().tools[0].routes, ["/demo"]);
  assert.deepEqual(registry.snapshot().tools[0].permissions, ["local-read"]);
  assert.deepEqual(registry.snapshot().tools[0].scenarioIds, ["webmcp-explorer-tour"]);
  const result = await registry.invoke("echo", { value: "seeded" }, { source: "programmatic-replay", replayRunId: "call_test" });
  assert.equal(result.structuredContent.echoed, "seeded");
  assert.equal(calls[0].context.source, "programmatic-replay");
  assert.equal(calls[0].context.toolName, "cleardose_echo");

  registry.unregister("echo");
  await assert.rejects(registry.invoke("echo", {}), (error) => error instanceof WebMcpToolInvocationError && error.code === "TOOL_NOT_AVAILABLE");
});

test("bounded observations redact sensitive fields and report compact changes", async () => {
  let value = { count: 1, password: "do-not-copy", note: "abcdefgh", list: [1, 2, 3] };
  const observations = new BoundedObservationService({
    readers: { "app.summary": () => value },
    limits: { maxArrayLength: 2, maxStringLength: 5 },
  });
  const before = await observations.capture(["app.summary", "missing"]);
  value = { count: 2, password: "still-secret", note: "abcdefgh", list: [1, 2, 3] };
  const after = await observations.capture(["app.summary", "missing"]);
  const changes = observations.diff(before, after);

  assert.equal(before["app.summary"].password, "[redacted]");
  assert.equal(before["app.summary"].note, "abcde");
  assert.deepEqual(before["app.summary"].list, [1, 2]);
  assert.equal(before.missing.unavailable, true);
  assert.deepEqual(changes.map((item) => item.key), ["app.summary"]);
});

test("replay input references can select a seeded workflow without hardcoding its id", () => {
  const input = resolveReplayInput({
    flowId: {
      $from: "steps.discover.response.flows",
      $find: { path: "definitionId", equals: "state-interaction-demo" },
      $select: "id",
    },
  }, {
    steps: { discover: { response: { flows: [{ id: "flow_other", definitionId: "other" }, { id: "flow_seeded", definitionId: "state-interaction-demo" }] } } },
  });
  assert.deepEqual(input, { flowId: "flow_seeded" });
  assert.throws(() => resolveReplayInput({ value: { $from: "steps.__proto__.value" } }, { steps: {} }), /blocked segment/);
});

test("programmatic replay resolves prior output and records timing, highlights, diffs, and hooks", async () => {
  let tick = 0;
  let selected = "";
  let detailLoaded = false;
  let resetCount = 0;
  const calls = [];
  const highlights = [];
  const hookEvents = [];
  const observations = new BoundedObservationService({
    readers: {
      selection: () => ({ selected, detailLoaded }),
    },
  });
  const testScenario = scenario("chain", [
    { id: "search", title: "Search", kind: "tool", capabilityId: "cleardose.test.search", toolName: "search", input: { query: "lisinopril" }, observe: ["selection"], highlightTarget: "search", pauseAfterMs: 50, mocked: true },
    { id: "detail", title: "Detail", kind: "tool", capabilityId: "cleardose.test.detail", toolName: "detail", input: { drugId: { $from: "steps.search.response.structuredContent.drugs.0.id" } }, observe: ["selection"], highlightTarget: "detail", pauseAfterMs: 0, mocked: true },
  ]);
  const runtime = new ProgrammaticReplayRuntime({
    scenarios: [testScenario],
    observations,
    clock: () => tick,
    now: () => `time-${tick}`,
    idFactory: () => "call_replay_test",
    sleep: async (milliseconds) => { tick += milliseconds; },
    resetSeed: async () => { resetCount += 1; selected = ""; detailLoaded = false; },
    highlight: async (target) => { highlights.push(target); return { ok: true, target }; },
    invokeTool: async (name, input, context) => {
      calls.push({ name, input, context });
      if (name === "search") {
        tick += 8;
        selected = "med_lisinopril";
        return { structuredContent: { ok: true, drugs: [{ id: selected }] } };
      }
      tick += 12;
      detailLoaded = true;
      return { structuredContent: { ok: true, drug: { id: input.drugId } } };
    },
    hooks: {
      onRunStart: async () => ({ flowId: "flow_replay" }),
      onStepStart: async ({ step }) => { hookEvents.push(`start:${step.id}`); },
      onStepComplete: async ({ step }) => { hookEvents.push(`complete:${step.id}`); },
      onRunComplete: async () => { hookEvents.push("run:complete"); },
    },
  });

  const result = await runtime.run("chain", { route: "/demo" });
  assert.equal(resetCount, 1);
  assert.equal(result.status, "complete");
  assert.equal(result.runId, "call_replay_test");
  assert.equal(result.workflowFlowId, "flow_replay");
  assert.equal(result.totalElapsedMs, 70);
  assert.deepEqual(result.steps.map((step) => step.elapsedMs), [8, 12]);
  assert.deepEqual(calls.map((call) => call.name), ["search", "detail"]);
  assert.equal(calls[1].input.drugId, "med_lisinopril");
  assert.equal(calls[0].context.source, "programmatic-replay");
  assert.deepEqual(highlights, ["search", "detail"]);
  assert.deepEqual(result.steps[0].changes.map((item) => item.key), ["selection"]);
  assert.deepEqual(hookEvents, ["start:search", "complete:search", "start:detail", "complete:detail", "run:complete"]);
});

test("replay projects the completed handler result before capturing the after snapshot", async () => {
  let visibleAction = { status: "idle", sequence: 0 };
  const observations = new BoundedObservationService({
    readers: { "replay.visibleAction": () => visibleAction },
  });
  const runtime = new ProgrammaticReplayRuntime({
    scenarios: [scenario("visible", [{
      id: "search",
      title: "Search",
      kind: "tool",
      capabilityId: "cleardose.test.search",
      toolName: "search",
      input: { query: "lisinopril" },
      pauseAfterMs: 0,
    }])],
    observations,
    invokeTool: async () => ({ structuredContent: { ok: true, drugs: [{ id: "med_lisinopril" }] } }),
    projectVisibleAction: async ({ step, response }) => {
      visibleAction = { status: "projected", sequence: 1, stepId: step.id, drugCount: response.structuredContent.drugs.length };
      return visibleAction;
    },
  });

  const result = await runtime.run("visible", { route: "/demo", resetSeed: false });
  assert.equal(result.steps[0].visibleAction.status, "projected");
  assert.equal(result.steps[0].after["replay.visibleAction"].drugCount, 1);
  assert.deepEqual(result.steps[0].changes.map((item) => item.key), ["replay.visibleAction"]);
});

test("pause stops after the active call, step runs once, resume finishes, and reset restores idle", async () => {
  let releaseFirst;
  let firstStarted;
  const gate = new Promise((resolve) => { releaseFirst = resolve; });
  const started = new Promise((resolve) => { firstStarted = resolve; });
  let resetCount = 0;
  const calls = [];
  const testScenario = scenario("controls", [
    { id: "one", title: "One", kind: "tool", capabilityId: "cleardose.test.one", toolName: "one", input: {}, pauseAfterMs: 0 },
    { id: "two", title: "Two", kind: "tool", capabilityId: "cleardose.test.two", toolName: "two", input: {}, pauseAfterMs: 0 },
    { id: "three", title: "Three", kind: "tool", capabilityId: "cleardose.test.three", toolName: "three", input: {}, pauseAfterMs: 0 },
  ]);
  const runtime = new ProgrammaticReplayRuntime({
    scenarios: [testScenario],
    resetSeed: async () => { resetCount += 1; },
    invokeTool: async (name) => {
      calls.push(name);
      if (name === "one" && calls.length === 1) { firstStarted(); await gate; }
      return { structuredContent: { ok: true } };
    },
  });

  const running = runtime.run("controls", { route: "/demo" });
  await started;
  await runtime.pause();
  releaseFirst();
  const paused = await running;
  assert.equal(paused.status, "paused");
  assert.deepEqual(calls, ["one"]);

  const stepped = await runtime.step();
  assert.equal(stepped.status, "paused");
  assert.deepEqual(calls, ["one", "two"]);

  const completed = await runtime.resume();
  assert.equal(completed.status, "complete");
  assert.deepEqual(calls, ["one", "two", "three"]);

  const restarted = await runtime.restart({ autoRun: false });
  assert.equal(restarted.status, "paused");
  assert.equal(restarted.steps.length, 0);
  assert.equal(restarted.nextStepIndex, 0);
  const reset = await runtime.reset();
  assert.equal(reset.status, "idle");
  assert.equal(resetCount, 3);
});

test("an expected structured failure remains visible and continues to its declared recovery", async () => {
  const testScenario = scenario("recovery", [
    { id: "bad", title: "Bad", kind: "tool", capabilityId: "cleardose.test.bad", toolName: "bad", input: {}, expectedError: { code: "INVALID_INPUT" }, recovery: { scenarioId: "recovery", stepId: "good" }, pauseAfterMs: 0 },
    { id: "good", title: "Good", kind: "tool", capabilityId: "cleardose.test.good", toolName: "good", input: {}, pauseAfterMs: 0 },
  ]);
  const runtime = new ProgrammaticReplayRuntime({
    scenarios: [testScenario],
    invokeTool: async (name) => name === "bad"
      ? {
          isError: true,
          structuredContent: {
            ok: false,
            code: "INVALID_INPUT",
            retryable: true,
            recommendedTool: "good",
            recoveryInput: { drugId: "med_lisinopril" },
          },
          content: [{ text: "drugId is required." }],
        }
      : { structuredContent: { ok: true } },
  });
  const result = await runtime.run("recovery", { route: "/demo", resetSeed: false });
  assert.equal(result.status, "complete");
  assert.deepEqual(result.steps.map((step) => step.status), ["expected-error", "complete"]);
  assert.equal(result.steps[0].error.code, "INVALID_INPUT");
  assert.equal(result.steps[0].response.structuredContent.retryable, true);
  assert.equal(result.steps[0].response.structuredContent.recommendedTool, "good");
  assert.deepEqual(result.steps[0].response.structuredContent.recoveryInput, { drugId: "med_lisinopril" });
  assert.equal(result.steps[0].recovery.stepId, "good");
});

test("full patient review runs through the shipped WebMCP definitions and seeded application path", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({
    configFile: false,
    root,
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true },
  });

  try {
    const [
      { ClearDoseFacade },
      { createClearDoseBrowserAdapter },
      { MemoryStorageAdapter },
      { MemoryWorkflowDao },
      { WorkflowRuntime },
      { createDefaultTools },
      { usePharmacyStore },
    ] = await Promise.all([
      vite.ssrLoadModule("/src/application/facades/ClearDoseFacade.js"),
      vite.ssrLoadModule("/src/infrastructure/adapters/createClearDoseBrowserAdapter.js"),
      vite.ssrLoadModule("/src/infrastructure/persistence/BrowserStateDao.js"),
      vite.ssrLoadModule("/src/infrastructure/persistence/MemoryWorkflowDao.js"),
      vite.ssrLoadModule("/src/services/workflows/WorkflowRuntime.js"),
      vite.ssrLoadModule("/src/infrastructure/webmcp/tools/createDefaultTools.js"),
      vite.ssrLoadModule("/src/stores/pharmacyStore.js"),
    ]);

    const facade = new ClearDoseFacade(createClearDoseBrowserAdapter({
      storage: new MemoryStorageAdapter(),
      storageKey: "full-replay-path",
    }));
    const workflowRuntime = new WorkflowRuntime({
      dao: new MemoryWorkflowDao({ reason: "full replay test" }),
      drugOperations: facade,
      channelName: "full-replay-test",
    });
    const registry = new WebMcpToolRegistry({
      namespace: "cleardose",
      adapter: {
        isSupported: () => false,
        async register(definition) {
          return { name: definition.name, status: "unsupported", unregister() {} };
        },
      },
    });
    const store = usePharmacyStore(createPinia());
    store.configure({ facade, toolRegistry: registry, workflowRuntime });
    store.refresh();
    await workflowRuntime.initialize({ drugs: facade.getSnapshot().state.medications });
    await workflowRuntime.seedDemoFlows();
    await registry.registerDefinitions(createDefaultTools({
      store,
      workflowRuntime,
      highlightService: { listTargets: () => [], highlight: () => ({ ok: true }) },
    }));

    const runtime = new ProgrammaticReplayRuntime({
      scenarios: [getDemoScenario("full-patient-review")],
      toolRegistry: registry,
      sleep: async () => {},
      idFactory: () => "call_full_patient_review",
      resetSeed: async () => {
        store.resetDemo();
        await workflowRuntime.clear();
        await workflowRuntime.seedDemoFlows();
      },
    });
    const result = await runtime.run("full-patient-review", { route: "/demo" });

    assert.equal(result.status, "complete");
    assert.equal(result.steps.length, getDemoScenario("full-patient-review").steps.length);
    assert.ok(result.steps.every((step) => step.status === "complete"));
    assert.equal(result.steps[0].response.structuredContent.drugs[0].id, "med_lisinopril");
    assert.equal(result.steps[1].request.drugId, result.steps[0].response.structuredContent.drugs[0].id);
    assert.equal(result.steps[4].request.variantId, "lisinopril-5mg-30");
    assert.equal(result.steps[5].request.variantId, result.steps[4].request.variantId);
    assert.equal(result.steps[5].response.structuredContent.itemCount, 1);
    assert.equal(result.steps[6].response.structuredContent.items[0].medicationId, "med_lisinopril");
    assert.ok(result.steps[7].response.structuredContent.runtime.events.length > 0);
    assert.equal(store.state.cart.length, 1);
    assert.equal(workflowRuntime.snapshot().database.drugCount, facade.getSnapshot().state.medications.length);
    assert.ok(registry.snapshot().tools.every((tool) => tool.locallyInvokable));

    for (const scenarioId of [
      "availability-within-three-days",
      "checkout-cost-review",
      "doctor-discussion-card",
      "state-branching-demo",
      "failure-and-recovery",
    ]) {
      const shippedScenario = getDemoScenario(scenarioId);
      const matrixRuntime = new ProgrammaticReplayRuntime({
        scenarios: [shippedScenario],
        toolRegistry: registry,
        sleep: async () => {},
        idFactory: () => `call_${scenarioId}`,
        resetSeed: async () => {
          store.resetDemo();
          await workflowRuntime.clear();
          await workflowRuntime.seedDemoFlows();
        },
      });
      const matrixResult = await matrixRuntime.run(scenarioId, { route: "/demo" });
      assert.equal(matrixResult.status, "complete", `${scenarioId} should complete through shipped handlers.`);
      assert.equal(matrixResult.steps.length, shippedScenario.steps.length);
      assert.ok(matrixResult.steps.every((step) => ["complete", "expected-error"].includes(step.status)));
    }
  } finally {
    await vite.close();
  }
});
