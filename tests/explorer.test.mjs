import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createPinia, setActivePinia } from "pinia";
import { createServer } from "vite";
import { assertBoundedJsonSchema } from "../scripts/json-schema-contract.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  configFile: false,
  root,
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
});
after(async () => vite.close());

test("bounded schema validation rejects recursive output contracts", () => {
  const schema = {
    type: "object",
    maxProperties: 1,
    additionalProperties: { $ref: "#/$defs/value" },
    $defs: {
      value: {
        type: "object",
        maxProperties: 1,
        additionalProperties: { $ref: "#/$defs/value" },
      },
    },
  };
  assert.throws(() => assertBoundedJsonSchema(schema), /recursive schema reference/);
});

test("Explorer sanitization removes secrets before a receipt is stored", async () => {
  const { sanitizeExplorerJsonText, sanitizeExplorerValue, usePharmacyStore } = await vite.ssrLoadModule("/src/stores/pharmacyStore.js");
  const raw = {
    password: "demo-password",
    "patient-name": "Real Name Sentinel",
    patient_email: "real@example.test",
    "card-number": "4111111111111111",
    security_code: "123",
    concerns: ["Real health concern sentinel"],
    nested: { accessToken: "token-value", memberNumber: "member-value", note: "authorization: Bearer private-token-value" },
    items: [{ policyId: "policy-value" }],
  };
  const sanitized = sanitizeExplorerValue(raw);
  assert.equal(sanitized.password, "[redacted]");
  assert.equal(sanitized["patient-name"], "[redacted]");
  assert.equal(sanitized.patient_email, "[redacted]");
  assert.equal(sanitized["card-number"], "[redacted]");
  assert.equal(sanitized.security_code, "[redacted]");
  assert.deepEqual(sanitized.concerns, ["Real health concern sentinel"]);
  assert.equal(sanitized.nested.accessToken, "[redacted]");
  assert.equal(sanitized.nested.memberNumber, "[redacted]");
  assert.equal(sanitized.items[0].policyId, "[redacted]");
  assert.doesNotMatch(JSON.stringify(sanitized), /demo-password|token-value|member-value|policy-value/);
  assert.doesNotMatch(sanitizeExplorerJsonText('{"password":"unfinished', { invalid: true }), /unfinished/);
  assert.doesNotMatch(sanitizeExplorerJsonText('{"concerns":["Real health concern sentinel"', { invalid: true }), /Real health concern sentinel/);

  setActivePinia(createPinia());
  const store = usePharmacyStore();
  let handlerInput = null;
  store.configure({
    facade: { getSnapshot: () => ({ state: {} }) },
    toolRegistry: {
      subscribe() {},
      async invoke(name, input) {
        handlerInput = input;
        if (name === "cleardose_postal") return { structuredContent: { ok: input.postalCode === "21201", postalCode: input.postalCode } };
        if (name === "cleardose_error") {
          const error = new Error("token: response-token-value");
          error.details = { memberId: "response-member-value" };
          throw error;
        }
        return { structuredContent: { ok: true, password: "response-password", questions: ["Real health concern sentinel"], title: "Real Name Sentinel", nested: { refreshToken: "response-token" } } };
      },
    },
  });

  const receipt = await store.invokeWebMcpTool("cleardose_safe", raw);
  assert.equal(handlerInput.password, "demo-password");
  assert.equal(handlerInput["patient-name"], "Real Name Sentinel");
  assert.deepEqual(handlerInput.concerns, ["Real health concern sentinel"]);
  assert.equal(handlerInput.nested.accessToken, "token-value");
  assert.equal(receipt.request.password, "[redacted]");
  assert.equal(receipt.request["patient-name"], "[redacted]");
  assert.deepEqual(receipt.request.concerns, ["[redacted]"]);
  assert.equal(receipt.response.structuredContent.password, "[redacted]");
  assert.deepEqual(receipt.response.structuredContent.questions, ["[redacted]"]);
  assert.equal(receipt.response.structuredContent.title, "[redacted]");
  assert.equal(receipt.response.structuredContent.nested.refreshToken, "[redacted]");
  assert.doesNotMatch(JSON.stringify(store.explorer.lastInvocation), /demo-password|response-password|response-token|Real Name Sentinel|Real health concern sentinel|real@example\.test|4111111111111111/);

  const postalReceipt = await store.invokeWebMcpTool("cleardose_postal", { postalCode: "21201" });
  assert.equal(handlerInput.postalCode, "21201");
  assert.equal(postalReceipt.response.structuredContent.ok, true);
  assert.equal(postalReceipt.request.postalCode, "[redacted]");
  assert.equal(postalReceipt.response.structuredContent.postalCode, "[redacted]");

  const failed = await store.invokeWebMcpTool("cleardose_error", raw);
  assert.doesNotMatch(JSON.stringify(failed), /response-token-value|response-member-value|demo-password/);
  assert.equal(failed.error.message, "The local tool call failed. Use the code and retry guidance to correct the request.");
  assert.equal(failed.error.details.memberId, "[redacted]");

  let declarativeInput = null;
  store.configure({
    facade: { getSnapshot: () => ({ state: {} }) },
    declarativeToolRunner: { invoke: (_name, input) => { declarativeInput = input; return { ok: true, visibleForm: { changes: [] } }; } },
  });
  const longBody = "x".repeat(1000);
  const longReceipt = await store.invokeWebMcpTool("cleardose_compose_dynamic_capability_template", { body: longBody }, { interactionModel: "declarative" });
  assert.equal(declarativeInput.body, longBody);
  assert.equal(longReceipt.request.body, "[redacted]");
});

function fakeControl({ name, value = "", type = "text", checked = false } = {}) {
  return {
    name,
    value,
    type,
    checked,
    multiple: false,
    ownerDocument: { defaultView: { Event: class { constructor(eventType) { this.type = eventType; } } } },
    events: [],
    dispatchEvent(event) { this.events.push(event.type); },
  };
}

function fakeForm(toolName, controls, { autoSubmit = false, disconnectOnSubmit = false, submitError = false } = {}) {
  return {
    toolName,
    isConnected: true,
    querySelectorAll(selector) {
      const name = selector.match(/\[name="([^"]+)"\]/)?.[1];
      return controls.filter((control) => control.name === name);
    },
    hasAttribute(name) { return name === "toolautosubmit" && autoSubmit; },
    requestSubmit() {
      if (submitError) throw new Error("Seeded form rejected submission.");
      if (disconnectOnSubmit) this.isConnected = false;
    },
  };
}

test("declarative runner validates first and reports visible changes after route navigation", async () => {
  const { DeclarativeToolRunner } = await vite.ssrLoadModule("/src/services/ui/DeclarativeToolRunner.js");
  const query = fakeControl({ name: "query", value: "" });
  const form = fakeForm("cleardose_navigate_to_drug_search", [query], { autoSubmit: true, disconnectOnSubmit: true });
  const runner = new DeclarativeToolRunner({ documentRef: { querySelector: () => form } });

  const wrongType = runner.invoke("cleardose_navigate_to_drug_search", { query: 42 });
  assert.equal(wrongType.code, "INVALID_INPUT");
  assert.equal(query.value, "");
  const unknown = runner.invoke("cleardose_navigate_to_drug_search", { query: "lisinopril", password: "do-not-retain" });
  assert.equal(unknown.code, "INVALID_INPUT");
  assert.equal(query.value, "");

  const result = runner.invoke("cleardose_navigate_to_drug_search", { query: "lisinopril" });
  assert.equal(result.ok, true);
  assert.equal(result.visibleForm.submitted, true);
  assert.equal(result.visibleForm.presentAfterRun, false);
  assert.deepEqual(result.visibleForm.changes, [{ field: "query", before: "", after: "lisinopril" }]);
  assert.deepEqual(query.events, ["input", "change"]);

  const failedSubmitControl = fakeControl({ name: "query", value: "" });
  const failedSubmitForm = fakeForm("cleardose_navigate_to_drug_search", [failedSubmitControl], { autoSubmit: true, submitError: true });
  const failedSubmitRunner = new DeclarativeToolRunner({ documentRef: { querySelector: () => failedSubmitForm } });
  const failedSubmit = failedSubmitRunner.invoke("cleardose_navigate_to_drug_search", { query: "lisinopril" });
  assert.equal(failedSubmit.code, "VISIBLE_FORM_SUBMIT_FAILED");
  assert.equal(failedSubmit.visibleForm.submitted, false);
  assert.deepEqual(failedSubmit.visibleForm.changedFields, ["query"]);
});

test("Studio declarative replay fills one prepared fresh tool input and leaves save to the user", async () => {
  const { DeclarativeToolRunner } = await vite.ssrLoadModule("/src/services/ui/DeclarativeToolRunner.js");
  const { getCapability } = await vite.ssrLoadModule("/src/infrastructure/webmcp/catalog/capabilityCatalog.js");
  const capability = getCapability("compose_dynamic_capability_template");
  const input = capability.exampleRequests[0];
  const controls = Object.keys(input).map((name) => fakeControl({
    name,
    value: name === "kind" ? "tool" : "",
    type: name === "kind" ? "radio" : name === "field_0_required" ? "checkbox" : "text",
    checked: name === "kind",
  }));
  const runner = new DeclarativeToolRunner({ documentRef: { querySelector: () => fakeForm(capability.qualifiedName, controls) } });

  const result = runner.invoke(capability.qualifiedName, input);
  assert.equal(result.ok, true);
  assert.equal(result.visibleForm.submitted, false);
  assert.deepEqual(result.visibleForm.changedFields, Object.keys(input));
  assert.equal(controls.find((control) => control.name === "field_0_name").value, "topic");
  assert.match(controls.find((control) => control.name === "body").value, /input\.topic/);
  assert.equal(runner.invoke(capability.qualifiedName, { ...input, kind: "workflow" }).code, "INVALID_INPUT");
});

test("declarative form identity values are redacted from observable changes", async () => {
  const { DeclarativeToolRunner } = await vite.ssrLoadModule("/src/services/ui/DeclarativeToolRunner.js");
  const controls = [
    fakeControl({ name: "patient-name" }), fakeControl({ name: "patient-email" }),
    fakeControl({ name: "provider-name" }), fakeControl({ name: "medication" }),
  ];
  const form = fakeForm("cleardose_prepare_provider_note", controls);
  const runner = new DeclarativeToolRunner({ documentRef: { querySelector: () => form } });
  const result = runner.invoke("cleardose_prepare_provider_note", {
    "patient-name": "Jamie Demo", "patient-email": "jamie@demo.invalid", "provider-name": "Dr. Sample", medication: "Lisinopril 10mg",
  });
  const byField = new Map(result.visibleForm.changes.map((change) => [change.field, change]));
  assert.equal(byField.get("patient-name").after, "[redacted]");
  assert.equal(byField.get("patient-email").after, "[redacted]");
  assert.equal(byField.get("provider-name").after, "Dr. Sample");
});

test("Explorer receipts include declarative DOM changes", async () => {
  const { usePharmacyStore } = await vite.ssrLoadModule("/src/stores/pharmacyStore.js");
  setActivePinia(createPinia());
  const store = usePharmacyStore();
  store.configure({
    facade: { getSnapshot: () => ({ state: {} }) },
    declarativeToolRunner: {
      invoke: () => ({ ok: true, visibleForm: { changes: [{ field: "query", before: "", after: "lisinopril" }] } }),
    },
  });
  const receipt = await store.invokeWebMcpTool("cleardose_navigate_to_drug_search", { query: "lisinopril" }, { interactionModel: "declarative" });
  assert.deepEqual(receipt.changes, [{ key: "dom.query", source: "visible-form", before: "", after: "lisinopril" }]);
});

test("catalog examples and bounded state schemas match the executable response shape", async () => {
  const { capabilityCatalog, getCapability } = await vite.ssrLoadModule("/src/infrastructure/webmcp/catalog/capabilityCatalog.js");
  assert.ok(capabilityCatalog.every((capability) => Number.isInteger(capability.outputSchema.maxProperties) && capability.outputSchema.maxProperties > 0));
  const declarative = capabilityCatalog.filter((capability) => capability.interactionModel === "declarative");
  assert.ok(declarative.every((capability) => Object.keys(capability.exampleRequests[0]).length > 0));
  assert.ok(declarative.every((capability) => capability.inputSchema.additionalProperties === false));
  const autoSubmitNames = [
    "navigate_to_drug_search",
    "navigate_to_mobile_drug_search",
    "navigate_to_home_drug_search",
    "filter_visible_drug_index",
    "filter_visible_medication_catalog",
    "populate_visible_price_comparison",
  ];
  assert.deepEqual(declarative.filter((capability) => capability.autoSubmit).map((capability) => capability.toolName), autoSubmitNames);
  assert.ok(declarative.filter((capability) => capability.autoSubmit).every((capability) => capability.permissions.includes("visible-form-submit") && !capability.permissions.includes("human-submit") && capability.exampleResponse.visibleForm.submitted));
  assert.ok(declarative.filter((capability) => !capability.autoSubmit).every((capability) => capability.permissions.includes("human-submit") && !capability.exampleResponse.visibleForm.submitted));
  assert.equal(getCapability("navigate_to_home_drug_search").exampleResponse.visibleForm.presentAfterRun, false);

  const state = getCapability("inspect_workflow_state");
  assert.equal(state.outputSchema.additionalProperties, false);
  assert.ok("flow" in state.outputSchema.properties);
  assert.ok("currentState" in state.outputSchema.properties);
  assert.ok("version" in state.outputSchema.properties);
  assert.equal("state" in state.exampleResponse, false);
  const history = getCapability("get_workflow_history");
  assert.ok(Array.isArray(history.exampleResponse.events));
  assert.equal("history" in history.exampleResponse, false);
  const dispatch = getCapability("dispatch_workflow_transition");
  assert.equal(dispatch.exampleResponse.state, "comparing");
  assert.ok(dispatch.exampleResponse.event.id);

  const availabilityCodes = getCapability("get_drug_availability").deterministicErrors.map((error) => error.code);
  assert.deepEqual(availabilityCodes, ["LOCATION_UNAVAILABLE", "LOCATION_MISMATCH", "PACKAGE_UNAVAILABLE"]);
  assert.deepEqual(getCapability("highlight_section").deterministicErrors.map((error) => error.code), ["INVALID_INPUT"]);
  const declarativeForm = getCapability("navigate_to_drug_search");
  assert.ok("recommendedRoute" in declarativeForm.outputSchema.properties);
  assert.ok("missingFields" in declarativeForm.outputSchema.properties);
  assert.ok(declarativeForm.deterministicErrors.some((error) => error.code === "VISIBLE_FORM_SUBMIT_FAILED"));
  const studioForm = getCapability("compose_dynamic_capability_template");
  assert.deepEqual(studioForm.inputSchema.properties.kind.enum, ["tool"]);
  assert.ok("field_0_name" in studioForm.inputSchema.properties);
  assert.ok("field_0_type" in studioForm.inputSchema.properties);
  assert.equal("states" in studioForm.inputSchema.properties, false);
  assert.equal(studioForm.exampleRequests[0].field_0_name, "topic");
  assert.match(studioForm.exampleRequests[0].body, /input\.topic/);
});

test("Explorer search and prompt tabs keep stable keyboard and autofill contracts", async () => {
  const source = await readFile(fileURLToPath(new URL("../src/components/WebMcpExplorer.vue", import.meta.url)), "utf8");
  assert.match(source, /name="webmcp-tool-search"[^>]+autocomplete="off"/);
  assert.match(source, /name="webmcp-tool-parameters"[^>]+autocomplete="off"/);
  assert.match(source, /role="tablist"[^>]+@keydown="handlePromptTabKeydown"/);
  assert.match(source, /:aria-controls="promptPanelId"/);
  assert.match(source, /:tabindex="promptMode === 'human' \? 0 : -1"/);
  assert.match(source, /role="tabpanel"[^>]+:aria-labelledby="promptTabId\(promptMode\)"/);
  assert.match(source, /function loadRequest\(input\)[^{]*\{[^}]*sanitizeExplorerInvocationValue\(input\)/);
  assert.match(source, /const invocationInput = sanitizeExplorerInvocationValue\(input\)/);
  assert.match(source, /Missing required field:/);
  assert.match(source, /Invalid \$\{enumField\[0\]\} option/);
  assert.match(source, /Tool unavailable on this route/);
  assert.match(source, /Empty seeded result/);
  assert.match(source, /store\.capabilityReplayScenario\(selected\.value/);
  assert.match(source, /> Run programmatic replay</);
  assert.match(source, /namespace: tool\.namespace \?\? tool\.name\.split/);
});
