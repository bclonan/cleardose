import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ configFile: false, root, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
after(async () => vite.close());

test("safe EJS-style engine escapes values and rejects executable or ambiguous tags", async () => {
  const { SafeEjsTemplateEngine } = await vite.ssrLoadModule("/src/services/templates/SafeEjsTemplateEngine.js");
  const engine = new SafeEjsTemplateEngine();
  assert.equal(engine.render("Hello <%= input.name %>.<% if input.note %> Note: <%= input.note %><% endif %>", { input: { name: "<Pat>", note: "review & share" } }), "Hello &lt;Pat&gt;. Note: review &amp; share");
  assert.equal(engine.render("<% if input.note %>private<% endif %>", { input: {} }), "");
  assert.throws(() => engine.validate("<% process.exit() %>"), /Only escaped path interpolation/);
  assert.throws(() => engine.validate("<%- input.name %>"), /Raw EJS output/);
  assert.throws(() => engine.validate("<%= input.constructor %>"), /Unsupported template path/);
  assert.throws(() => engine.validate("<% if input.ok %>unfinished"), /must end/);
  assert.throws(() => engine.validate("<% if input.a %><% if input.b %>nested<% endif %><% endif %>"), /Nested/);
});

test("capability templates use closed schemas and require explicit local registration", async () => {
  const { CapabilityTemplateService } = await vite.ssrLoadModule("/src/services/templates/CapabilityTemplateService.js");
  const saved = [];
  const registrations = [];
  const dynamicDefinitions = new Map();
  const artifacts = [];
  const dao = { load: () => [], saveAll: (records) => { saved.splice(0, saved.length, ...structuredClone(records)); } };
  const toolRegistry = {
    async registerDefinitions(definitions, options) { registrations.push({ definitions, options }); },
    unregister: () => true,
  };
  const workflowRuntime = {
    registerDynamicDefinition(definition) { dynamicDefinitions.set(definition.id, definition); },
    unregisterDynamicDefinition(id) { dynamicDefinitions.delete(id); },
    async runTool(name, input, execute) { return execute({ flowId: `flow_${name}`, input }); },
    async createTemplateArtifact(value) { artifacts.push(value); return { id: "artifact_test", status: "human_review" }; },
    async startDynamicMachine(value) { return { id: "flow_dynamic", context: value.context }; },
  };
  const service = new CapabilityTemplateService({ dao, toolRegistry, workflowRuntime });
  const initial = await service.initialize();
  assert.equal(initial.templates.length, 2);
  assert.equal(registrations.length, 0);

  const record = service.save({
    kind: "tool", name: "make_visit_note", title: "Make a visit note", description: "Create a reviewable note.",
    examplePrompt: "Please make a visit note for lisinopril.", body: "# <%= input.drug_name %>",
    scope: { role: "patient", situation: "visit", step: "note" },
    inputFields: [{ name: "drug_name", label: "Medication", type: "string", required: true }],
  });
  assert.equal(record.inputSchema.additionalProperties, false);
  assert.throws(() => service.render(record.id, { drug_name: "Lisinopril", hidden: true }), /Unknown template input/);
  await service.register(record.id);
  assert.equal(registrations[0].options.namespace, "cleardose_user");
  assert.equal(registrations[0].definitions[0].annotations.untrustedContentHint, true);
  const savedAgain = service.save({ id: record.id, kind: record.kind, name: record.name, title: record.title, description: record.description, examplePrompt: record.examplePrompt, body: record.body, scope: record.scope, inputFields: record.inputFields });
  assert.equal(savedAgain.autoRegister, true);
  assert.equal(service.snapshot().statuses[record.id], "registered");
  const result = await service.run(record.id, { drug_name: "<Lisinopril>" });
  assert.equal(result.structuredContent.visibleState, "human_review");
  assert.match(result.structuredContent.content, /&lt;Lisinopril&gt;/);
  assert.equal(artifacts[0].template.name, "make_visit_note");
  assert.ok(saved.some((item) => item.name === "make_visit_note" && item.autoRegister));
});

test("clipboard service falls back to a temporary selection when permission is denied", async () => {
  const { ClipboardService } = await vite.ssrLoadModule("/src/services/ui/ClipboardService.js");
  const events = [];
  const textarea = { value: "", style: {}, setAttribute() {}, select() { events.push("select"); }, remove() { events.push("remove"); } };
  const documentRef = { body: { appendChild() { events.push("append"); } }, createElement: () => textarea, execCommand(command) { events.push(command); return true; } };
  const navigatorRef = { clipboard: { async writeText() { throw new Error("denied"); } } };
  const result = await new ClipboardService({ navigatorRef, documentRef }).copy("Visible prompt");
  assert.equal(result.method, "selection-fallback");
  assert.equal(textarea.value, "Visible prompt");
  assert.deepEqual(events, ["append", "select", "copy", "remove"]);
});

test("clipboard service does not hang when browser permission never settles", async () => {
  const { ClipboardService } = await vite.ssrLoadModule("/src/services/ui/ClipboardService.js");
  const textarea = { value: "", style: {}, setAttribute() {}, select() {}, remove() {} };
  const documentRef = { body: { appendChild() {} }, createElement: () => textarea, execCommand: () => true };
  const navigatorRef = { clipboard: { writeText: () => new Promise(() => {}) } };
  const result = await new ClipboardService({ navigatorRef, documentRef, timeoutMs: 5 }).copy("Readable prompt");
  assert.equal(result.method, "selection-fallback");
});
