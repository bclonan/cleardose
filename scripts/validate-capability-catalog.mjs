import assert from "node:assert/strict";
import { capabilityCatalog, capabilityCategories } from "../src/infrastructure/webmcp/catalog/capabilityCatalog.js";
import { hackathonShortcuts } from "../src/services/api/shortcuts/hackathonShortcuts.js";

const categoryIds = new Set(capabilityCategories.map((item) => item.id));
const capabilityIds = new Set(capabilityCatalog.map((item) => item.id));
assert.equal(capabilityIds.size, capabilityCatalog.length, "Capability ids must be unique.");
assert.equal(new Set(capabilityCatalog.map((item) => item.qualifiedName)).size, capabilityCatalog.length, "Qualified names must be unique.");
for (const item of capabilityCatalog) {
  assert.match(item.id, /^cleardose\.[a-z0-9-]+\.[a-z0-9_]+$/);
  assert.match(item.toolName, /^[a-z][a-z0-9_]+$/);
  assert.ok(categoryIds.has(item.category));
  assert.ok(["imperative", "declarative"].includes(item.interactionModel));
  assert.match(item.machine.id, /^machine\.(tool|form)\.[a-z0-9-]+\.v1$/);
}
for (const shortcut of hackathonShortcuts) {
  assert.match(shortcut.id, /^[a-z0-9-]+$/);
  assert.ok(shortcut.scope.role && shortcut.scope.situation && shortcut.scope.step);
  shortcut.steps.forEach((step) => assert.ok(capabilityIds.has(step.capabilityId), `${shortcut.id} references unknown ${step.capabilityId}`));
}
const imperativeIds = capabilityCatalog.filter((item) => item.interactionModel === "imperative").map((item) => item.id);
const fullTourIds = new Set(hackathonShortcuts.find((item) => item.id === "full-judge-tour").steps.map((item) => item.capabilityId));
imperativeIds.forEach((id) => assert.ok(fullTourIds.has(id), `Full judge tour must include ${id}.`));
console.log(`Validated ${capabilityCatalog.length} capabilities and ${hackathonShortcuts.length} shortcut machines.`);
