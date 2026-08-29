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

test("WebMCP registry qualifies and registers tools through document.modelContext", async () => {
  const registrations = [];
  const documentRef = { modelContext: { async registerTool(tool, options) { registrations.push({ tool, options }); } } };
  const { BrowserWebMcpAdapter } = await vite.ssrLoadModule("/src/infrastructure/webmcp/BrowserWebMcpAdapter.js");
  const { WebMcpToolRegistry } = await vite.ssrLoadModule("/src/infrastructure/webmcp/WebMcpToolRegistry.js");
  const registry = new WebMcpToolRegistry({ adapter: new BrowserWebMcpAdapter({ documentRef }), namespace: "cleardose" });

  await registry.registerDefinitions([{
    name: "ping",
    description: "Return a deterministic health response.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: async () => ({ ok: true }),
  }]);

  assert.equal(registrations[0].tool.name, "cleardose_ping");
  assert.ok(registrations[0].options.signal instanceof AbortSignal);
  assert.equal(registry.snapshot().status, "ready");
  registry.unregisterAll();
  assert.equal(registrations[0].options.signal.aborted, true);
});

test("WebMCP is progressive enhancement when the browser API is unavailable", async () => {
  const { BrowserWebMcpAdapter } = await vite.ssrLoadModule("/src/infrastructure/webmcp/BrowserWebMcpAdapter.js");
  const registration = await new BrowserWebMcpAdapter({ documentRef: {} }).register({ name: "example" });
  assert.equal(registration.status, "unsupported");
});
