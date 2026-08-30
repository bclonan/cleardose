import assert from "node:assert/strict";
import { createServer } from "vite";

let baseUrl = process.env.CLEARDOSE_SMOKE_URL ?? "http://127.0.0.1:4173";
let server = null;

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.status, 200, `${path} returned ${response.status}.`);
  return response.text();
}

try {
  const root = await fetchText("/");
  const entry = await fetchText("/src/main.js");
  assert.match(root, /id="app"/, "The fixed-port server is not the ClearDose app.");
  assert.match(entry, /createApp/, "The fixed-port server is not serving the ClearDose entry module.");
} catch {
  server = await createServer({ server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
  await server.listen();
  const address = server.httpServer.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
}

const checks = [
  ["/src/main.js", /createApp/],
  ["/src/views/FlowLabView.vue", /DuckDB-Wasm state lab/],
  ["/src/components/DemoLabDock.vue", /Interactive demo laboratory/],
  ["/src/infrastructure/persistence/DuckDbWasmDao.js", /cleardose-flow-lab\.duckdb/],
  ["/src/infrastructure/webmcp/tools/createDefaultTools.js", /createStructuredExchangeToolPair/],
  ["/src/views/HackathonShortcutsView.vue", /Copy the prompt\. Watch the machine/],
  ["/src/infrastructure/webmcp/catalog/capabilityCatalog.js", /prepare_agent_memory_packet/],
  ["/src/router.js", /path:\s*"\/studio"/],
  ["/src/views/HomeView.vue", /Know the medication/],
  ["/src/views/MedicationsView.vue", /Find your medication/],
  ["/src/views/CartView.vue", /Your cart/],
  ["/src/views/CheckoutView.vue", /Complete your order/],
  ["/src/views/CompareView.vue", /Same drug pricing/],
  ["/src/views/DrugIndexView.vue", /Universal Drug Index/],
  ["/src/views/CapabilityStudioView.vue", /Create a workflow or WebMCP tool/],
  ["/src/services/templates/SafeEjsTemplateEngine.js", /Nested template conditionals are disabled/],
  ["/src/services/ui/ClipboardService.js", /selection-fallback/],
];

try {
  const shell = await fetchText("/#/flow-lab");
  assert.match(shell, /id="app"/, "The Vue mount point is missing.");
  for (const [path, pattern] of checks) {
    const moduleText = await fetchText(path);
    assert.match(moduleText, pattern, `${path} did not include its expected smoke marker.`);
  }
  console.log(`Live app smoke passed for ${checks.length} compiled modules at ${baseUrl}.`);
} finally {
  await server?.close();
}
