import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ configFile: false, root, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
after(async () => vite.close());

async function waitFor(check, message) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  assert.fail(message);
}

test("DuckDB initialization failure keeps the workflow runtime usable through memory fallback", async () => {
  const [{ DuckDbWasmDao }, { MemoryWorkflowDao }, { WorkflowRuntime }] = await Promise.all([
    vite.ssrLoadModule("/src/infrastructure/persistence/DuckDbWasmDao.js"),
    vite.ssrLoadModule("/src/infrastructure/persistence/MemoryWorkflowDao.js"),
    vite.ssrLoadModule("/src/services/workflows/WorkflowRuntime.js"),
  ]);
  const forcedFailure = {
    getJsDelivrBundles: () => ({}),
    selectBundle: async () => { throw new Error("Forced DuckDB startup failure for test."); },
  };
  const dao = new DuckDbWasmDao({
    duckDbModule: forcedFailure,
    fallback: new MemoryWorkflowDao({ reason: "deterministic fallback test" }),
  });
  const runtime = new WorkflowRuntime({ dao, channelName: "fallback-test" });
  await runtime.initialize({
    drugs: [{ id: "med_lisinopril", name: "Lisinopril", category: "Heart health", drugClass: "ACE inhibitor", identifiers: { udi: "udi:cleardose:lisinopril" }, variants: [{ id: "var_lisinopril_10_30", price: 8.25 }] }],
  });

  assert.equal(runtime.snapshot().database.engine, "memory-fallback");
  assert.equal(runtime.snapshot().database.persistence, "session");
  assert.match(runtime.snapshot().database.fallbackReason, /Forced DuckDB startup failure/);
  assert.equal((await runtime.querySeededDrugs({ query: "lisinopril" }))[0].id, "med_lisinopril");
  const flow = await runtime.startFlow({ definitionId: "medication-discovery", title: "Fallback flow", context: { query: "lisinopril" } });
  assert.equal(runtime.inspect({ flowId: flow.id }).events.length, 1);
});

test("DuckDB drug seeding replaces the prior fixture inside one transaction", async () => {
  const { DuckDbWasmDao } = await vite.ssrLoadModule("/src/infrastructure/persistence/DuckDbWasmDao.js");
  const statements = [];
  let rowCount = 9;
  const dao = new DuckDbWasmDao();
  dao.connection = {
    async query(statement) {
      const normalized = String(statement).trim();
      statements.push(normalized);
      if (normalized.startsWith("DELETE FROM drugs")) rowCount = 0;
      if (normalized.startsWith("INSERT INTO drugs")) rowCount = 1;
      if (normalized.startsWith("SELECT COUNT")) return { toArray: () => [{ toJSON: () => ({ drug_count: rowCount }) }] };
      return { toArray: () => [] };
    },
  };

  const count = await dao.seedDrugs([{ id: "med_current", name: "Current", genericFor: "", category: "Demo", drugClass: "Demo", comparisonGroup: "demo", identifiers: { udi: "udi:cleardose:current" } }]);
  assert.equal(count, 1);
  assert.deepEqual(statements.map((statement) => statement.split(/\s+/).slice(0, 3).join(" ")), [
    "BEGIN TRANSACTION;",
    "DELETE FROM drugs;",
    "INSERT INTO drugs",
    "SELECT COUNT(*) AS",
    "COMMIT;",
    "CHECKPOINT;",
  ]);
});

test("BroadcastChannel mirrors event ids, flow state, and bounded context across runtimes", async () => {
  const [{ MemoryWorkflowDao }, { WorkflowRuntime }] = await Promise.all([
    vite.ssrLoadModule("/src/infrastructure/persistence/MemoryWorkflowDao.js"),
    vite.ssrLoadModule("/src/services/workflows/WorkflowRuntime.js"),
  ]);
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalBroadcastChannel = Object.getOwnPropertyDescriptor(globalThis, "BroadcastChannel");

  class FakeBroadcastChannel {
    static groups = new Map();
    constructor(name) {
      this.name = name;
      this.listeners = new Set();
      const group = FakeBroadcastChannel.groups.get(name) ?? new Set();
      group.add(this);
      FakeBroadcastChannel.groups.set(name, group);
    }
    addEventListener(type, listener) { if (type === "message") this.listeners.add(listener); }
    postMessage(data) {
      for (const peer of FakeBroadcastChannel.groups.get(this.name) ?? []) {
        if (peer === this) continue;
        queueMicrotask(() => peer.listeners.forEach((listener) => listener({ data: structuredClone(data) })));
      }
    }
    close() { FakeBroadcastChannel.groups.get(this.name)?.delete(this); }
  }

  try {
    Object.defineProperty(globalThis, "document", { configurable: true, value: {} });
    Object.defineProperty(globalThis, "BroadcastChannel", { configurable: true, value: FakeBroadcastChannel });
    const first = new WorkflowRuntime({ dao: new MemoryWorkflowDao({ reason: "first tab" }), channelName: "shared-test-channel" });
    const second = new WorkflowRuntime({ dao: new MemoryWorkflowDao({ reason: "second tab" }), channelName: "shared-test-channel" });
    await Promise.all([first.initialize(), second.initialize()]);

    const flow = await first.startFlow({
      definitionId: "medication-discovery",
      title: "Mirrored search",
      context: { query: "lisinopril", password: "must-not-cross-tabs", address: "must-not-cross-tabs" },
    });
    await waitFor(() => second.snapshot().flows.some((item) => item.id === flow.id), "The second runtime did not receive the new flow.");
    await first.transition(flow.id, { type: "SEARCH_SUBMITTED", toState: "searching", context: { resultCount: 0 } });
    await waitFor(() => second.snapshot().flows.find((item) => item.id === flow.id)?.state === "searching", "The second runtime did not receive the transition.");

    const firstSnapshot = first.inspect({ flowId: flow.id });
    const secondSnapshot = second.inspect({ flowId: flow.id });
    assert.deepEqual(secondSnapshot.events.map((event) => event.id), firstSnapshot.events.map((event) => event.id));
    assert.equal(secondSnapshot.flows[0].eventCount, firstSnapshot.flows[0].eventCount);
    assert.equal(secondSnapshot.flows[0].context.query, "[omitted]");
    assert.equal(secondSnapshot.flows[0].context.password, "[omitted]");
    assert.equal(secondSnapshot.flows[0].context.address, "[omitted]");

    const receivingDao = new MemoryWorkflowDao({ reason: "hostile channel test" });
    const receivingRuntime = new WorkflowRuntime({ dao: receivingDao, channelName: "hostile-test-channel" });
    await receivingRuntime.initialize();
    const incomingFlow = structuredClone(firstSnapshot.flows[0]);
    const incomingEvent = structuredClone(firstSnapshot.events.at(-1));
    incomingFlow.context = { ...incomingFlow.context, password: "raw-channel-secret", notes: "unrestricted page text sentinel" };
    incomingEvent.context = structuredClone(incomingFlow.context);
    const accepted = await receivingRuntime.receive({ kind: "event", event: incomingEvent, flow: incomingFlow });
    assert.equal(accepted.accepted, true);
    assert.equal(receivingRuntime.snapshot().flows[0].context.password, "[omitted]");
    assert.equal(receivingRuntime.snapshot().flows[0].context.notes, "[omitted]");
    assert.doesNotMatch(JSON.stringify(await receivingDao.loadSnapshot()), /raw-channel-secret|unrestricted page text sentinel/);

    const invalidFlow = { ...incomingFlow, id: "flow_invalid", state: "not_a_state", eventCount: 1 };
    const invalidEvent = { ...incomingEvent, id: "evt_invalid", flowId: "flow_invalid", type: "BAD EVENT", source: "", toState: "not_a_state", version: 1 };
    const rejected = await receivingRuntime.receive({ kind: "event", event: invalidEvent, flow: invalidFlow });
    assert.equal(rejected.accepted, false);
    assert.equal(receivingRuntime.snapshot().flows.length, 1);
    assert.equal((await receivingRuntime.receive({ kind: "clear" })).code, "REMOTE_CLEAR_NOT_ALLOWED");
    assert.equal(receivingRuntime.snapshot().flows.length, 1);
  } finally {
    FakeBroadcastChannel.groups.clear();
    if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument); else delete globalThis.document;
    if (originalBroadcastChannel) Object.defineProperty(globalThis, "BroadcastChannel", originalBroadcastChannel); else delete globalThis.BroadcastChannel;
  }
});
