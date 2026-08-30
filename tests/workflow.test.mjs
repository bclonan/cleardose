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
  assert.equal(invalid.state, "rejected");
  assert.equal(invalid.context.persisted, false);
  assert.equal(unavailable.context.availability, "unavailable-demo-stock");
  assert.equal(price.context.requiresReconfirmation, true);
  assert.equal(price.context.orderPlaced, false);
});
