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
  await fetchText("/");
} catch {
  server = await createServer({ server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
  await server.listen();
  const address = server.httpServer.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
}

const checks = [
  ["/src/main.js", /createApp/],
  ["/src/views/FlowLabView.vue", /DuckDB-Wasm workflow observatory/],
  ["/src/components/PromptGuide.vue", /Prompt guide/],
  ["/src/infrastructure/persistence/DuckDbWasmDao.js", /cleardose-flow-lab\.duckdb/],
  ["/src/infrastructure/webmcp/tools/createDefaultTools.js", /createStructuredExchangeToolPair/],
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
