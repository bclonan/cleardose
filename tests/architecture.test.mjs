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

test("facade coordinates catalog, cart, customer, and checkout adapters", async () => {
  const { createClearDoseBrowserAdapter } = await vite.ssrLoadModule("/src/infrastructure/adapters/createClearDoseBrowserAdapter.js");
  const { MemoryStorageAdapter } = await vite.ssrLoadModule("/src/infrastructure/persistence/BrowserStateDao.js");
  const { ClearDoseFacade } = await vite.ssrLoadModule("/src/application/facades/ClearDoseFacade.js");
  const facade = new ClearDoseFacade(createClearDoseBrowserAdapter({ storage: new MemoryStorageAdapter(), storageKey: "test" }));

  assert.equal(facade.searchMedications({ query: "lisinopril" }).length, 1);
  const lisinopril = facade.medicationById("med_lisinopril");
  assert.equal(facade.addToCart(lisinopril.id, lisinopril.variants[0].id), true);
  assert.equal(facade.getSnapshot().state.cart.length, 1);

  const auth = facade.authenticate("demo@patient.test", "demo1234");
  assert.equal(auth.ok, true);
  const reactiveLikeAddress = new Proxy({ ...auth.customer.address }, {});
  const order = facade.placeOrder({ address: reactiveLikeAddress, prescriptionMethod: "on-file", paymentMethod: "demo-card" });
  assert.match(order.id, /^CLR-/);
  assert.deepEqual(order.address, auth.customer.address);
  assert.equal(facade.getSnapshot().state.cart.length, 0);
});

test("Universal Drug Index generates bulk local variants and domain workflows", async () => {
  const { createClearDoseBrowserAdapter } = await vite.ssrLoadModule("/src/infrastructure/adapters/createClearDoseBrowserAdapter.js");
  const { MemoryStorageAdapter } = await vite.ssrLoadModule("/src/infrastructure/persistence/BrowserStateDao.js");
  const { ClearDoseFacade } = await vite.ssrLoadModule("/src/application/facades/ClearDoseFacade.js");
  const facade = new ClearDoseFacade(createClearDoseBrowserAdapter({ storage: new MemoryStorageAdapter(), storageKey: "udi-test" }));

  const summary = facade.getSnapshot().state.drugIndexSummary;
  assert.equal(summary.drugCount, 52);
  assert.equal(summary.variantCount, 156);
  assert.equal(summary.offerCount, 468);
  assert.equal(facade.searchDrugIndex({ query: "statin" }).length, 2);

  const related = facade.findRelatedDrugs({ drugId: "med_lisinopril" });
  assert.ok(related.related.some((drug) => drug.id === "med_losartan"));
  assert.match(related.disclaimer, /not therapeutic equivalents/i);

  const review = facade.reviewInteractionFlags({ drugIds: ["med_sildenafil", "med_isosorbide_mononitrate"] });
  assert.equal(review.flags.length, 1);
  assert.equal(review.requiresProfessionalReview, true);

  const plan = facade.buildProcurementPlan({ items: [{ drugId: "med_lisinopril" }, { drugId: "med_atorvastatin" }] });
  assert.equal(plan.items.length, 2);
  assert.equal(plan.placedOrder, false);
  assert.ok(plan.estimatedTotal > 0);
});

test("facade returns a non-clinical side-by-side price comparison", async () => {
  const { createClearDoseBrowserAdapter } = await vite.ssrLoadModule("/src/infrastructure/adapters/createClearDoseBrowserAdapter.js");
  const { MemoryStorageAdapter } = await vite.ssrLoadModule("/src/infrastructure/persistence/BrowserStateDao.js");
  const { ClearDoseFacade } = await vite.ssrLoadModule("/src/application/facades/ClearDoseFacade.js");
  const facade = new ClearDoseFacade(createClearDoseBrowserAdapter({ storage: new MemoryStorageAdapter(), storageKey: "compare-test" }));
  const comparison = facade.compareMedications({ leftMedicationId: "med_atorvastatin", rightMedicationId: "med_lisinopril" });
  assert.equal(comparison.left.medication.id, "med_atorvastatin");
  assert.equal(comparison.right.medication.id, "med_lisinopril");
  assert.match(comparison.disclaimer, /not presented as therapeutic alternatives/i);
});

test("customer DTO never exposes the persisted demo password", async () => {
  const { createClearDoseBrowserAdapter } = await vite.ssrLoadModule("/src/infrastructure/adapters/createClearDoseBrowserAdapter.js");
  const { MemoryStorageAdapter } = await vite.ssrLoadModule("/src/infrastructure/persistence/BrowserStateDao.js");
  const adapter = createClearDoseBrowserAdapter({ storage: new MemoryStorageAdapter(), storageKey: "dto-test" });
  const result = adapter.customers.authenticate("demo@patient.test", "demo1234");
  assert.equal("password" in result.customer, false);
});
