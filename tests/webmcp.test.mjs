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
  assert.equal(registry.snapshot().tools[0].description, "Return a deterministic health response.");
  registry.unregisterAll();
  assert.equal(registrations[0].options.signal.aborted, true);
});

test("default catalog exposes non-overlapping UDI, review, procurement, and cart tools", async () => {
  const { createDefaultTools } = await vite.ssrLoadModule("/src/infrastructure/webmcp/tools/createDefaultTools.js");
  const tools = createDefaultTools({
    store: {},
    highlightService: { listTargets: () => ["comparison-results"], highlight: () => ({ ok: true }) },
  });
  assert.deepEqual(tools.map((tool) => tool.name), [
    "search_drug_index",
    "get_drug_index_entry",
    "compare_drug_prices",
    "find_related_drugs",
    "review_demo_interaction_flags",
    "build_procurement_plan",
    "inspect_workflow_runtime",
    "prepare_doctor_question_card_request",
    "submit_doctor_question_card_draft",
    "highlight_section",
    "get_cart",
    "add_to_cart",
  ]);
  assert.equal(tools.find((tool) => tool.name === "compare_drug_prices").annotations.readOnlyHint, true);
  assert.equal(tools.find((tool) => tool.name === "add_to_cart").annotations.readOnlyHint, false);
  assert.equal(tools.find((tool) => tool.name === "inspect_workflow_runtime").annotations.untrustedContentHint, true);
  assert.equal(tools.find((tool) => tool.name === "prepare_doctor_question_card_request").inputSchema.additionalProperties, false);
  assert.ok(tools.every((tool) => tool.inputSchema.additionalProperties === false));
});

test("structured question-card tool pair transfers an exact response schema", async () => {
  const { createDefaultTools } = await vite.ssrLoadModule("/src/infrastructure/webmcp/tools/createDefaultTools.js");
  const prepared = {
    id: "exchange_test",
    flowId: "flow_test",
    requestContext: { primaryDrug: { id: "med_lisinopril", name: "Lisinopril" } },
    instruction: "Return the draft with the declared schema.",
    expectedResponseSchema: { type: "object", required: ["exchangeId", "title", "questions"], additionalProperties: false },
  };
  const store = {
    prepareDoctorQuestionCard: async () => prepared,
    submitDoctorQuestionCard: async (input) => ({ id: "card_test", status: "human_review", questions: input.questions }),
  };
  const tools = createDefaultTools({ store, highlightService: { listTargets: () => [], highlight: () => ({ ok: true }) } });
  const prepareResult = await tools.find((tool) => tool.name === "prepare_doctor_question_card_request").execute({ drugId: "med_lisinopril" });
  assert.equal(prepareResult.structuredContent.expectedResponse.toolName, "cleardose_submit_doctor_question_card_draft");
  assert.deepEqual(prepareResult.structuredContent.expectedResponse.schema.required, ["exchangeId", "title", "questions"]);

  const invalid = await tools.find((tool) => tool.name === "submit_doctor_question_card_draft").execute({ exchangeId: "exchange_test", title: "Questions", questions: [] });
  assert.equal(invalid.isError, true);
  assert.equal(invalid.structuredContent.code, "INVALID_INPUT");
});

test("tool runtime validation returns structured non-retryable errors", async () => {
  const { createDefaultTools } = await vite.ssrLoadModule("/src/infrastructure/webmcp/tools/createDefaultTools.js");
  const tools = createDefaultTools({
    store: {},
    highlightService: { listTargets: () => ["udi-results"], highlight: () => ({ ok: true }) },
  });
  const result = await tools.find((tool) => tool.name === "compare_drug_prices").execute({ drugIds: [] });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.code, "INVALID_INPUT");
  assert.equal(result.structuredContent.retryable, false);
});

test("WebMCP is progressive enhancement when the browser API is unavailable", async () => {
  const { BrowserWebMcpAdapter } = await vite.ssrLoadModule("/src/infrastructure/webmcp/BrowserWebMcpAdapter.js");
  const registration = await new BrowserWebMcpAdapter({ documentRef: {} }).register({ name: "example" });
  assert.equal(registration.status, "unsupported");
});
