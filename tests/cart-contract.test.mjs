import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ configFile: false, root, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
after(async () => vite.close());

test("cart domain accepts the 100th distinct line and rejects the 101st without changing state", async () => {
  const { createClearDoseBrowserAdapter } = await vite.ssrLoadModule("/src/infrastructure/adapters/createClearDoseBrowserAdapter.js");
  const { MemoryStorageAdapter } = await vite.ssrLoadModule("/src/infrastructure/persistence/BrowserStateDao.js");
  const { ClearDoseFacade } = await vite.ssrLoadModule("/src/application/facades/ClearDoseFacade.js");
  const { MAX_CART_LINES } = await vite.ssrLoadModule("/src/domain/cart/cartLimits.js");
  const facade = new ClearDoseFacade(createClearDoseBrowserAdapter({ storage: new MemoryStorageAdapter(), storageKey: "cart-limit-test" }));
  const packages = facade.getSnapshot().state.medications.flatMap((medication) => medication.variants.map((variant) => ({ medicationId: medication.id, variantId: variant.id })));

  assert.ok(packages.length > MAX_CART_LINES);
  for (const entry of packages.slice(0, MAX_CART_LINES)) assert.equal(facade.addToCart(entry.medicationId, entry.variantId), true);
  assert.equal(facade.getSnapshot().state.cart.length, MAX_CART_LINES);
  assert.throws(
    () => facade.addToCart(packages[MAX_CART_LINES].medicationId, packages[MAX_CART_LINES].variantId),
    (error) => error.code === "CART_LINE_LIMIT" && error.details.limit === MAX_CART_LINES,
  );
  assert.equal(facade.getSnapshot().state.cart.length, MAX_CART_LINES);
  assert.equal(facade.addToCart(packages[0].medicationId, packages[0].variantId), true);
  assert.equal(facade.getSnapshot().state.cart[0].units, 2);
});

test("cart WebMCP schemas and structured recovery use the shared domain limit", async () => {
  const { MAX_CART_ITEM_COUNT, MAX_CART_LINES, CartLineLimitError } = await vite.ssrLoadModule("/src/domain/cart/cartLimits.js");
  const { getCapability } = await vite.ssrLoadModule("/src/infrastructure/webmcp/catalog/capabilityCatalog.js");
  const { createDefaultTools } = await vite.ssrLoadModule("/src/infrastructure/webmcp/tools/createDefaultTools.js");
  const cart = getCapability("get_cart");
  const add = getCapability("add_to_cart");
  assert.equal(cart.outputSchema.properties.items.maxItems, MAX_CART_LINES);
  assert.equal(cart.outputSchema.properties.itemCount.maximum, MAX_CART_ITEM_COUNT);
  assert.equal(add.outputSchema.properties.itemCount.maximum, MAX_CART_ITEM_COUNT);
  assert.ok(add.deterministicErrors.some((error) => error.code === "CART_LINE_LIMIT"));

  const store = { async addLocalDrugToCart() { throw new CartLineLimitError(); } };
  const tools = createDefaultTools({ store, highlightService: { listTargets: () => [], highlight: () => ({ ok: true }) } });
  const result = await tools.find((tool) => tool.name === "add_to_cart").execute({ drugId: "med_lisinopril", variantId: "lisinopril-5mg-30" });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.code, "CART_LINE_LIMIT");
  assert.equal(result.structuredContent.retryable, true);
  assert.equal(result.structuredContent.recommendedTool, "cleardose_get_cart");
  assert.deepEqual(result.structuredContent.details, { limit: MAX_CART_LINES });
});
