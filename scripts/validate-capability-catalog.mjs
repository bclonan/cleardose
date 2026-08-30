import assert from "node:assert/strict";
import { capabilityCatalog, capabilityCategories } from "../src/infrastructure/webmcp/catalog/capabilityCatalog.js";
import { hackathonShortcuts } from "../src/services/api/shortcuts/hackathonShortcuts.js";
import { demoScenarios } from "../src/services/api/demos/demoScenarios.js";

const categoryIds = new Set(capabilityCategories.map((item) => item.id));
const capabilityIds = new Set(capabilityCatalog.map((item) => item.id));
assert.equal(capabilityIds.size, capabilityCatalog.length, "Capability ids must be unique.");
assert.equal(new Set(capabilityCatalog.map((item) => item.qualifiedName)).size, capabilityCatalog.length, "Qualified names must be unique.");
for (const item of capabilityCatalog) {
  assert.match(item.id, /^cleardose\.[a-z0-9-]+\.[a-z0-9_]+$/);
  assert.match(item.toolName, /^[a-z][a-z0-9_]+$/);
  assert.equal(item.qualifiedName, `cleardose_${item.toolName}`, `${item.id} needs the shared cleardose_ qualified name.`);
  assert.ok(categoryIds.has(item.category));
  assert.ok(["imperative", "declarative"].includes(item.interactionModel));
  assert.match(item.machine.id, /^machine\.(tool|form)\.[a-z0-9-]+\.v1$/);
  assert.ok(item.machine.scope?.role && item.machine.scope?.situation && item.machine.scope?.step, `${item.id} needs a complete machine scope.`);
  assert.ok(Array.isArray(item.routes) && item.routes.length > 0, `${item.id} needs at least one route.`);
  assert.ok(Array.isArray(item.permissions) && item.permissions.length > 0, `${item.id} needs explicit permissions.`);
  assert.equal(item.outputSchema?.type, "object", `${item.id} needs an output schema.`);
  assert.ok(Array.isArray(item.exampleRequests) && item.exampleRequests.length > 0, `${item.id} needs a prebuilt request.`);
  assert.ok(item.examplePrompt && item.voicePrompt && item.advancedPrompt && item.expectedResult, `${item.id} needs complete prompt guidance.`);
  assert.ok(Array.isArray(item.deterministicErrors), `${item.id} needs deterministic error metadata.`);
  assert.ok(Array.isArray(item.relatedTools), `${item.id} needs related-tool metadata.`);
  assert.ok(Array.isArray(item.scenarioIds), `${item.id} needs scenario metadata.`);
  const executableScenarioIds = demoScenarios.filter((scenario) => scenario.capabilityIds.includes(item.id)).map((scenario) => scenario.id);
  assert.deepEqual(item.scenarioIds, executableScenarioIds, `${item.id} scenario metadata must match executable replay steps.`);
}
for (const shortcut of hackathonShortcuts) {
  assert.match(shortcut.id, /^[a-z0-9-]+$/);
  assert.ok(shortcut.scope.role && shortcut.scope.situation && shortcut.scope.step);
  shortcut.steps.forEach((step) => assert.ok(capabilityIds.has(step.capabilityId), `${shortcut.id} references unknown ${step.capabilityId}`));
}
console.log(`Validated ${capabilityCatalog.length} capabilities and ${hackathonShortcuts.length} shortcut machines.`);
