import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ configFile: false, root, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
after(async () => vite.close());

async function runtimeFixture() {
  const { MemoryWorkflowDao } = await vite.ssrLoadModule("/src/infrastructure/persistence/MemoryWorkflowDao.js");
  const { WorkflowRuntime } = await vite.ssrLoadModule("/src/services/workflows/WorkflowRuntime.js");
  const dao = new MemoryWorkflowDao({ reason: "test" });
  const runtime = new WorkflowRuntime({ dao, channelName: "cleardose-test" });
  await runtime.initialize({ drugs: [] });
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

test("structured exchange derives price facts and requires question-shaped output", async () => {
  const { runtime } = await runtimeFixture();
  const primaryDrug = {
    id: "med_lisinopril", name: "Lisinopril", genericFor: "Zestril", drugClass: "ACE inhibitor",
    variants: [{ price: 8.25 }],
  };
  const exchange = await runtime.prepareDoctorQuestionCard({
    primaryDrug,
    relatedDrugs: [{ id: "med_losartan", name: "Losartan", fromPrice: 9.5 }],
    concerns: ["What monitoring should I ask about?"],
  });
  assert.equal(exchange.status, "awaiting_agent");
  assert.match(exchange.instruction, /cleardose_submit_doctor_question_card_draft/);
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
  assert.equal(runtime.inspect({ flowId: exchange.flowId }).flows[0].state, "human_review");
});

test("negative fixtures capture rejected form, stock, and stale-price states", async () => {
  const { runtime } = await runtimeFixture();
  const invalid = await runtime.runNegativeScenario("invalid-health-form");
  const unavailable = await runtime.runNegativeScenario("out-of-stock");
  const price = await runtime.runNegativeScenario("price-updated");
  const prescription = await runtime.runNegativeScenario("prescription-required");
  assert.equal(invalid.state, "rejected");
  assert.equal(invalid.context.persisted, false);
  assert.equal(unavailable.context.availability, "unavailable-demo-stock");
  assert.equal(price.context.requiresReconfirmation, true);
  assert.equal(price.context.orderPlaced, false);
  assert.equal(prescription.state, "human_review");
  assert.equal(prescription.context.recommendedTool, "cleardose_prepare_prescription_follow_up");
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
  const runtime = new WorkflowRuntime({ dao: new MemoryWorkflowDao({ reason: "test" }), channelName: "query-test" });
  await runtime.initialize({ drugs: [{ id: "med_lisinopril", name: "Lisinopril", genericFor: "Zestril", category: "Heart health", drugClass: "ACE inhibitor", identifiers: { udi: "udi:cleardose:lisinopril" }, variants: [{ price: 8.25 }] }] });
  const records = await runtime.querySeededDrugs({ query: "ACE", limit: 5 });
  assert.equal(records[0].id, "med_lisinopril");
  const packet = await runtime.prepareMemoryPacket({ label: "Reviewed facts", facts: ["Fictional data only"], flowIds: [] });
  assert.equal(packet.status, "human_review");
  assert.match(packet.markdown, /Fictional data only/);
  assert.equal(runtime.snapshot().memoryPackets.length, 1);
});
