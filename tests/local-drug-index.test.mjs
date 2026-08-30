import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ configFile: false, root, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
after(async () => vite.close());

const records = {
  med_alpha: {
    id: "med_alpha",
    name: "Alpha",
    variants: [{ id: "alpha-10mg-30", form: "tablet", strength: "10mg", quantity: 30 }],
  },
  med_beta: {
    id: "med_beta",
    name: "Beta",
    variants: [{ id: "beta-10mg-30", form: "tablet", strength: "10mg", quantity: 30 }],
  },
};

test("LocalDrugIndexApi checks requested and returned drug records through its DAO", async () => {
  const { LocalDrugIndexApi } = await vite.ssrLoadModule("/src/services/api/local/LocalDrugIndexApi.js");
  const events = [];
  const dao = {
    async queryDrugs() { return Object.values(records); },
    async getDrug(id) { events.push(`dao:${id}`); return records[id] ?? null; },
  };
  const operations = {
    listCompatibleOptions(input) {
      events.push(`operation:${input.drugId}`);
      return {
        source: { id: input.drugId },
        eligible: [{ drugId: "med_beta" }],
        options: [{ drugId: "med_beta" }],
        discussionOnly: [],
      };
    },
  };
  const api = new LocalDrugIndexApi({ dao, operations });

  const result = await api.listCompatibleOptions({ drugId: "med_alpha", purpose: "facts" });

  assert.equal(result.eligible[0].drugId, "med_beta");
  assert.deepEqual(events, [
    "dao:med_alpha",
    "operation:med_alpha",
    "dao:med_alpha",
    "dao:med_beta",
  ]);
});

test("LocalDrugIndexApi stops before centralized operations when the DAO record or package is absent", async () => {
  const { LocalDrugIndexApi } = await vite.ssrLoadModule("/src/services/api/local/LocalDrugIndexApi.js");
  let operationCalls = 0;
  const api = new LocalDrugIndexApi({
    dao: {
      async queryDrugs() { return Object.values(records); },
      async getDrug(id) { return records[id] ?? null; },
    },
    operations: {
      getDrugAvailability() { operationCalls += 1; return {}; },
    },
  });

  await assert.rejects(
    api.getDrugAvailability({ drugId: "med_missing" }),
    (error) => error.code === "UNKNOWN_DRUG" && error.recommendedTool === "cleardose_search_drug_index",
  );
  await assert.rejects(
    api.getDrugAvailability({ drugId: "med_alpha", variantId: "missing-package" }),
    (error) => error.code === "PACKAGE_NOT_FOUND" && error.recommendedTool === "cleardose_get_drug_index_entry",
  );
  assert.equal(operationCalls, 0);
});

test("WorkflowRuntime exposes every tool-facing drug operation through its seeded index", async () => {
  const { MemoryWorkflowDao } = await vite.ssrLoadModule("/src/infrastructure/persistence/MemoryWorkflowDao.js");
  const { WorkflowRuntime } = await vite.ssrLoadModule("/src/services/workflows/WorkflowRuntime.js");
  const calls = [];
  const operations = {
    compareDrugPrices(input) { calls.push(["prices", input]); return { selections: input.drugIds.map((id) => ({ drug: { id } })) }; },
    findRelatedDrugs(input) { calls.push(["related", input]); return { source: { id: input.drugId }, related: [{ id: "med_beta" }] }; },
    listCompatibleOptions(input) { calls.push(["compatible", input]); return { source: { id: input.drugId }, eligible: [{ drugId: "med_beta" }] }; },
    compareMedicationOptions(input) { calls.push(["compare", input]); return { selections: input.drugIds.map((id) => ({ drug: { id } })) }; },
    getDrugAvailability(input) { calls.push(["availability", input]); return { drug: { id: input.drugId } }; },
    compareDrugAvailability(input) { calls.push(["availability-compare", input]); return { source: { id: input.drugId }, options: [{ drug: { id: input.drugId } }] }; },
    estimateDelivery(input) { calls.push(["delivery", input]); return { drug: { id: input.drugId } }; },
    reviewInteractionFlags(input) { calls.push(["interactions", input]); return { checkedDrugIds: input.drugIds }; },
    buildProcurementPlan(input) { calls.push(["procurement", input]); return { items: input.items }; },
  };
  const runtime = new WorkflowRuntime({
    dao: new MemoryWorkflowDao({ reason: "seeded-index-test" }),
    drugOperations: operations,
    channelName: "seeded-index-test",
  });
  await runtime.initialize({ drugs: Object.values(records) });

  await runtime.compareSeededDrugPrices({ drugIds: ["med_alpha"] });
  await runtime.findSeededRelatedDrugs({ drugId: "med_alpha" });
  await runtime.listSeededCompatibleOptions({ drugId: "med_alpha" });
  await runtime.compareSeededMedicationOptions({ drugIds: ["med_alpha"] });
  await runtime.getSeededDrugAvailability({ drugId: "med_alpha" });
  await runtime.compareSeededDrugAvailability({ drugId: "med_alpha", compatibleDrugIds: [] });
  await runtime.estimateSeededDelivery({ drugId: "med_alpha" });
  await runtime.reviewSeededInteractionFlags({ drugIds: ["med_alpha", "med_beta"] });
  await runtime.buildSeededProcurementPlan({ items: [{ drugId: "med_alpha" }] });

  assert.deepEqual(calls.map(([name]) => name), [
    "prices",
    "related",
    "compatible",
    "compare",
    "availability",
    "availability-compare",
    "delivery",
    "interactions",
    "procurement",
  ]);
});
