import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createPinia } from "pinia";
import { createServer } from "vite";

import { WebMcpToolRegistry } from "../src/infrastructure/webmcp/WebMcpToolRegistry.js";
import { getDemoScenario } from "../src/services/api/demos/demoScenarios.js";
import { getShortcutReplayScenario } from "../src/services/api/demos/shortcutReplayScenarios.js";
import { hackathonShortcuts } from "../src/services/api/shortcuts/hackathonShortcuts.js";
import { ProgrammaticReplayRuntime } from "../src/services/workflows/ProgrammaticReplayRuntime.js";

const root = fileURLToPath(new URL("..", import.meta.url));

test("every shortcut replay step names the exact capability printed on its prompt card", () => {
  for (const shortcut of hackathonShortcuts) {
    const scenario = getShortcutReplayScenario(shortcut.id);
    assert.ok(scenario, `Missing replay for ${shortcut.id}.`);
    assert.equal(getDemoScenario(scenario.id), scenario);
    assert.equal(scenario.steps.length, shortcut.steps.length);
    assert.deepEqual(scenario.steps.map((step) => step.capabilityId), shortcut.steps.map((step) => step.capabilityId));
    assert.deepEqual(scenario.steps.map((step) => step.toolName), shortcut.steps.map((step) => {
      const baseName = step.capabilityId.split(".").at(-1);
      return scenario.steps.some((candidate) => candidate.capabilityId === step.capabilityId && candidate.kind === "action") ? `cleardose_${baseName}` : baseName;
    }));
  }

  const judgeTour = getShortcutReplayScenario("full-judge-tour");
  assert.equal(judgeTour.steps.length, 14);
  assert.deepEqual(judgeTour.steps[2].input.drugIds, [{ $from: "steps.search.response.structuredContent.drugs.0.id" }]);
});

test("a declarative shortcut records its exact blocked handler and does not claim later steps", async () => {
  const scenario = getShortcutReplayScenario("declarative-form-tour");
  const actions = [];
  const runtime = new ProgrammaticReplayRuntime({
    scenarios: [scenario],
    invokeAction: async (action, request) => {
      actions.push({ action, request });
      return { ok: false, code: "TOOL_UNAVAILABLE_ON_ROUTE", retryable: true, recommendedRoute: request.requiredRoute };
    },
  });
  const result = await runtime.run(scenario.id, { route: "/shortcuts", resetSeed: false });

  assert.equal(result.status, "error");
  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].toolName, "cleardose_filter_visible_drug_index");
  assert.equal(result.steps[0].error.code, "TOOL_UNAVAILABLE_ON_ROUTE");
  assert.deepEqual(actions, [{
    action: "invoke-declarative-webmcp",
    request: { toolName: "cleardose_filter_visible_drug_index", requiredRoute: "/udi", arguments: { query: "lisinopril" } },
  }]);
});

test("the 14-step judge tour invokes all shipped handlers and stops before external or final-order actions", async () => {
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
      storageKey: "shortcut-replay-test",
    }));
    const workflowRuntime = new WorkflowRuntime({
      dao: new MemoryWorkflowDao({ reason: "shortcut replay test" }),
      drugOperations: facade,
      channelName: "shortcut-replay-test",
    });
    const registry = new WebMcpToolRegistry({
      namespace: "cleardose",
      adapter: {
        isSupported: () => false,
        async register(definition) { return { name: definition.name, status: "unsupported", unregister() {} }; },
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
      highlightService: {
        listTargets: () => ["workflow-runtime", "shortcut-observatory"],
        highlight: (target) => ({ ok: true, target, message: `Highlighted ${target}.` }),
      },
    }));

    const scenario = getShortcutReplayScenario("full-judge-tour");
    const invocations = [];
    const runtime = new ProgrammaticReplayRuntime({
      scenarios: [scenario],
      invokeTool: async (name, input, context) => {
        invocations.push({ name, input });
        return registry.invoke(name, input, context);
      },
      sleep: async () => {},
      idFactory: () => "call_full_judge_tour",
      resetSeed: async () => {
        store.resetDemo();
        await workflowRuntime.clear();
        await workflowRuntime.seedDemoFlows();
      },
    });
    const orderIdsBeforeReplay = store.state.orders.map((order) => order.id);
    const result = await runtime.run(scenario.id, { route: "/shortcuts" });

    assert.equal(result.status, "complete");
    assert.equal(result.steps.length, 14);
    assert.ok(result.steps.every((step) => step.status === "complete"));
    assert.deepEqual(invocations.map((item) => item.name), scenario.steps.map((step) => step.toolName));
    assert.equal(new Set(invocations.map((item) => `${item.name}:${JSON.stringify(item.input)}`)).size, 14);
    assert.deepEqual(invocations[2].input.drugIds, ["med_lisinopril"]);

    const dangerousCall = invocations.find(({ name }) => /(?:place|order|payment|transfer|contact|send|clipboard|save_file|download)/i.test(name));
    assert.equal(dangerousCall, undefined);
    assert.deepEqual(store.state.orders.map((order) => order.id), orderIdsBeforeReplay);
    assert.equal(store.state.currentCustomerId, null);
    assert.equal(store.state.cart.length, 1);

    const workflow = workflowRuntime.snapshot();
    const questionCard = workflow.cards.find((item) => item.artifactType === "doctor-question-card");
    const memoryPacket = workflow.memoryPackets[0];
    assert.equal(questionCard.status, "human_review");
    assert.equal(memoryPacket.status, "human_review");
    assert.equal("exportMethod" in memoryPacket, false);
    assert.ok(workflow.flows.some((flow) => flow.definitionId === "prescription-follow-up" && flow.state === "human_review"));

    for (const shortcutId of ["price-comparison", "prescription-recovery", "doctor-question-card", "negative-recovery-lab", "single-runtime-inspection"]) {
      const matrixScenario = getShortcutReplayScenario(shortcutId);
      const matrixCalls = [];
      const matrixRuntime = new ProgrammaticReplayRuntime({
        scenarios: [matrixScenario],
        invokeTool: async (name, input, context) => {
          matrixCalls.push(name);
          return registry.invoke(name, input, context);
        },
        sleep: async () => {},
        resetSeed: async () => {
          store.resetDemo();
          await workflowRuntime.clear();
          await workflowRuntime.seedDemoFlows();
        },
      });
      const matrixResult = await matrixRuntime.run(matrixScenario.id, { route: "/shortcuts" });
      assert.equal(matrixResult.status, "complete", `${shortcutId} should complete through shipped handlers.`);
      assert.deepEqual(matrixCalls, matrixScenario.steps.map((step) => step.toolName));
      assert.deepEqual(store.state.orders.map((order) => order.id), orderIdsBeforeReplay);
    }
  } finally {
    await vite.close();
  }
});
