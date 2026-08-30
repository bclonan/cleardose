import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const readJson = async (relativePath) => JSON.parse(await readFile(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8"));
const schema = await readJson("../evals/schema.json");
const tools = schema.tools;
const evals = await readJson("../evals/cleardose.evals.json");
const smokeEvals = await readJson("../evals/cleardose.smoke.json");
const names = new Set();

function assertBoundedInputStrings(node, path) {
  if (!node || typeof node !== "object") return;
  if (node.type === "string") {
    assert.ok(Number.isInteger(node.maxLength) && node.maxLength > 0, `${path} needs a positive maxLength.`);
  }
  if (node.items) assertBoundedInputStrings(node.items, `${path}[]`);
  if (node.properties) {
    for (const [key, value] of Object.entries(node.properties)) assertBoundedInputStrings(value, `${path}.${key}`);
  }
  if (node.additionalProperties && typeof node.additionalProperties === "object") assertBoundedInputStrings(node.additionalProperties, `${path}.*`);
  if (node.propertyNames) assertBoundedInputStrings(node.propertyNames, `${path}.<key>`);
  for (const keyword of ["allOf", "anyOf", "oneOf"]) {
    if (Array.isArray(node[keyword])) node[keyword].forEach((value, index) => assertBoundedInputStrings(value, `${path}.${keyword}[${index}]`));
  }
}

assert.ok(Array.isArray(tools) && tools.length > 0, "Schema must export at least one tool.");
for (const tool of tools) {
  assert.match(tool.name, /^cleardose_[a-z0-9_]+$/, `Invalid namespaced tool name: ${tool.name}`);
  assert.ok(!names.has(tool.name), `Duplicate tool name: ${tool.name}`);
  names.add(tool.name);
  assert.ok(tool.description.length >= 45, `${tool.name} needs a precise description.`);
  assert.equal(tool.inputSchema?.type, "object", `${tool.name} needs an object input schema.`);
  assert.equal(tool.inputSchema?.additionalProperties, false, `${tool.name} must reject unknown properties.`);
  assertBoundedInputStrings(tool.inputSchema, `${tool.name}.input`);
  assert.equal(tool.outputSchema?.type, "object", `${tool.name} needs an output schema.`);
  assert.equal(typeof tool.annotations?.readOnlyHint, "boolean", `${tool.name} needs readOnlyHint.`);
  assert.equal(typeof tool.annotations?.untrustedContentHint, "boolean", `${tool.name} needs untrustedContentHint.`);
}

assert.ok(Array.isArray(evals) && evals.length >= 8, "Eval suite must cover direct, chained, and refusal journeys.");
for (const evalCase of evals) {
  assert.ok(evalCase.name && evalCase.messages?.length, "Every eval needs a name and at least one message.");
  if (evalCase.expectedCall == null) continue;
  for (const call of evalCase.expectedCall) {
    const calls = call.ordered ?? call.unordered ?? [call];
    for (const candidate of calls.flatMap((item) => item.ordered ?? [item])) {
      assert.ok(names.has(candidate.functionName), `${evalCase.name} references unknown tool ${candidate.functionName}.`);
    }
  }
}

assert.ok(smokeEvals.length > 0, "Smoke eval export must contain positive-call journeys.");
assert.ok(smokeEvals.every((evalCase) => Array.isArray(evalCase.expectedCall) && evalCase.expectedCall.length > 0), "Smoke evals cannot contain no-call refusal journeys.");

console.log(`Validated ${tools.length} tool contracts, ${evals.length} evaluation journeys, and ${smokeEvals.length} smoke journeys.`);
