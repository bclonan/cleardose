import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
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

async function vueFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? vueFiles(join(directory, entry.name))
    : entry.name.endsWith(".vue") ? [join(directory, entry.name)] : []));
  return nested.flat();
}

test("presentation reads demo manifests through Pinia instead of importing API fixtures", async () => {
  const files = await Promise.all([vueFiles(join(root, "src", "views")), vueFiles(join(root, "src", "components"))]);
  for (const path of files.flat()) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(source, /from\s+["'][^"']*services\/api\//, `${path} imports the API layer directly.`);
    assert.doesNotMatch(source, /from\s+["'][^"']*infrastructure\/webmcp\/catalog\//, `${path} imports the capability manifest directly.`);
  }
});

test("Studio keeps preview, save, run, and registration as separate actions", async () => {
  const source = await readFile(join(root, "src", "views", "CapabilityStudioView.vue"), "utf8");
  const registerBlock = source.match(/async function register\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  const runBlock = source.match(/async function run\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.doesNotMatch(registerBlock, /\bsave\s*\(/);
  assert.doesNotMatch(runBlock, /\bsave\s*\(/);
  assert.match(source, /function runPromptDemo\(\)[^{]*\{[^}]*preview\(\)/);
  assert.match(source, /Register saved tool/);
  assert.match(source, /Run saved draft/);
});

test("Demo Lab close and Escape restore focus to rail and page launchers", async () => {
  const source = await readFile(join(root, "src", "components", "DemoLabDock.vue"), "utf8");
  assert.match(source, /opener\.value = event\.currentTarget/);
  assert.match(source, /document\.addEventListener\("focusin", trackOutsideFocus, true\)/);
  assert.match(source, /lastOutsideFocus\.value = event\.target/);
  assert.match(source, /focusTarget\?\.isConnected/);
  assert.match(source, /focusTarget\.focus\(\)/);
  assert.match(source, /store\.replay\.scenarioId === store\.demoLab\.selectedScenarioId/);
  assert.match(source, /@keydown\.esc="close"/);
  assert.match(source, /aria-label="Close demo laboratory" @click="close"/);
});

test("programmatic replay shows structured failure output before its short error summary", async () => {
  const source = await readFile(join(root, "src", "components", "ProgrammaticReplayPanel.vue"), "utf8");
  assert.match(source, /trace\[index\]\.response \|\| trace\[index\]\.error/);
  assert.match(source, /trace\[index\]\.response && trace\[index\]\.error/);
  assert.match(source, />Error summary</);
});

test("replay controls recognize exact names for Studio-created tools", async () => {
  const panelSource = await readFile(fileURLToPath(new URL("../src/components/ProgrammaticReplayPanel.vue", import.meta.url)), "utf8");
  const cardSource = await readFile(fileURLToPath(new URL("../src/components/DemoScenarioCard.vue", import.meta.url)), "utf8");
  assert.match(panelSource, /tool\.name === step\.toolName \|\| tool\.name\.endsWith/);
  assert.match(cardSource, /tool\.name === step\.toolName \|\| tool\.name\.endsWith/);
});

test("registered demo laboratory components keep the shared agent-ready contract", async () => {
  for (const component of ["DemoScenarioCard", "ProgrammaticReplayPanel", "DemoLabDock", "RouteDemoSection", "WebMcpExplorer"]) {
    const source = await readFile(fileURLToPath(new URL(`../src/components/${component}.vue`, import.meta.url)), "utf8");
    assert.match(source, /agentReadyProps/, `${component} needs the shared props.`);
    assert.match(source, /useAgentReadyComponent\(props,/, `${component} needs lifecycle-safe component tools.`);
  }
});

test("every Prompt Guide fallback runs through shared replay and Explorer can hydrate stored receipts", async () => {
  const promptGuide = await readFile(join(root, "src", "components", "PromptGuide.vue"), "utf8");
  const explorer = await readFile(join(root, "src", "components", "WebMcpExplorer.vue"), "utf8");
  assert.match(promptGuide, /store\.runCapabilityReplay\(tool/);
  assert.doesNotMatch(promptGuide, /store\.invokeWebMcpTool\(tool\.name/);
  assert.match(promptGuide, /> Programmatic replay</);
  assert.match(explorer, /store\.explorer\.lastInvocation\?\.toolName === entry\.name/);
  assert.match(explorer, /watch\(\(\) => store\.explorer\.lastInvocation/);
});

test("detail routes keep contextual demos and comparison can build a reviewable doctor card", async () => {
  for (const name of ["RouteDemoSection.vue", "DemoLabDock.vue", "DemoScenarioCard.vue"]) {
    const source = await readFile(join(root, "src", "components", name), "utf8");
    assert.match(source, /startsWith\("\/account\/orders\/"\)/, `${name} does not normalize order details.`);
  }
  const comparison = await readFile(join(root, "src", "components", "ComparisonPanel.vue"), "utf8");
  assert.match(comparison, /Build a doctor discussion card/);
  assert.match(comparison, /store\.prepareDoctorQuestionCard/);
  assert.match(comparison, /store\.submitDoctorQuestionCard/);
  assert.match(comparison, /@review="store\.markQuestionCardReviewed"/);
});

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
  assert.equal(summary.offerCount, 624);
  assert.equal(summary.providerCount, 4);
  assert.equal(summary.demoLocationCount, 3);
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

test("facade returns only an explicitly related non-clinical side-by-side comparison", async () => {
  const { createClearDoseBrowserAdapter } = await vite.ssrLoadModule("/src/infrastructure/adapters/createClearDoseBrowserAdapter.js");
  const { MemoryStorageAdapter } = await vite.ssrLoadModule("/src/infrastructure/persistence/BrowserStateDao.js");
  const { ClearDoseFacade } = await vite.ssrLoadModule("/src/application/facades/ClearDoseFacade.js");
  const facade = new ClearDoseFacade(createClearDoseBrowserAdapter({ storage: new MemoryStorageAdapter(), storageKey: "compare-test" }));
  const rejected = facade.compareMedications({ leftMedicationId: "med_atorvastatin", rightMedicationId: "med_lisinopril" });
  assert.equal(rejected, null);

  const comparison = facade.compareMedications({ leftMedicationId: "med_lisinopril", rightMedicationId: "med_losartan" });
  assert.equal(comparison.left.medication.id, "med_lisinopril");
  assert.equal(comparison.right.medication.id, "med_losartan");
  assert.equal(comparison.relationship.kind, "discussion_only_alternative");
  assert.equal(comparison.rankable, false);
  assert.equal(comparison.priceDifference, null);
  assert.match(comparison.disclaimer, /never ranked as equivalents/i);
});

test("customer DTO never exposes the persisted demo password", async () => {
  const { createClearDoseBrowserAdapter } = await vite.ssrLoadModule("/src/infrastructure/adapters/createClearDoseBrowserAdapter.js");
  const { MemoryStorageAdapter } = await vite.ssrLoadModule("/src/infrastructure/persistence/BrowserStateDao.js");
  const adapter = createClearDoseBrowserAdapter({ storage: new MemoryStorageAdapter(), storageKey: "dto-test" });
  const result = adapter.customers.authenticate("demo@patient.test", "demo1234");
  assert.equal("password" in result.customer, false);
});
