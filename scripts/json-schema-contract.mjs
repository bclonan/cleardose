import assert from "node:assert/strict";

function resolveInternalRef(root, ref, label) {
  assert.match(ref, /^#\/(?:\$defs|definitions)\/[a-zA-Z0-9_-]+$/, `${label} uses an unsupported schema reference: ${ref}`);
  return ref.slice(2).split("/").reduce((value, key) => value?.[key.replaceAll("~1", "/").replaceAll("~0", "~")], root);
}

function schemaTypes(schema) {
  if (Array.isArray(schema.type)) return schema.type;
  return schema.type ? [schema.type] : [];
}

export function assertBoundedJsonSchema(schema, label = "schema") {
  const visited = new Set();
  const active = new Set();
  function visit(node, path) {
    assert.ok(node && typeof node === "object" && !Array.isArray(node), `${path} must be a schema object.`);
    assert.ok(!active.has(node), `${path} contains a recursive schema reference without a finite depth bound.`);
    if (visited.has(node)) return;
    active.add(node);
    if (node.$ref) {
      const target = resolveInternalRef(schema, node.$ref, path);
      assert.ok(target, `${path} references a missing schema definition.`);
      visit(target, `${path}.${node.$ref}`);
      active.delete(node);
      visited.add(node);
      return;
    }

    const types = schemaTypes(node);
    if (types.includes("object")) {
      assert.ok(Number.isInteger(node.maxProperties) && node.maxProperties >= 0, `${path} needs maxProperties.`);
      assert.notEqual(node.additionalProperties, true, `${path} cannot allow unbounded additional properties.`);
      assert.notEqual(node.additionalProperties, undefined, `${path} needs an explicit additionalProperties contract.`);
      if (node.additionalProperties && typeof node.additionalProperties === "object") visit(node.additionalProperties, `${path}.*`);
      if (node.propertyNames) visit(node.propertyNames, `${path}.<key>`);
    }
    if (types.includes("array")) {
      assert.ok(Number.isInteger(node.maxItems) && node.maxItems >= 0, `${path} needs maxItems.`);
      assert.ok(node.items && typeof node.items === "object", `${path} needs an item schema.`);
      visit(node.items, `${path}[]`);
    }
    if (types.includes("string")) {
      const boundedEnum = Array.isArray(node.enum) && node.enum.length > 0 && node.enum.every((value) => typeof value === "string");
      assert.ok((Number.isInteger(node.maxLength) && node.maxLength >= 0) || boundedEnum, `${path} needs maxLength or a finite string enum.`);
    }

    Object.entries(node.properties ?? {}).forEach(([key, value]) => visit(value, `${path}.${key}`));
    Object.entries(node.$defs ?? {}).forEach(([key, value]) => visit(value, `${path}.$defs.${key}`));
    Object.entries(node.definitions ?? {}).forEach(([key, value]) => visit(value, `${path}.definitions.${key}`));
    for (const keyword of ["allOf", "anyOf", "oneOf"]) {
      (node[keyword] ?? []).forEach((value, index) => visit(value, `${path}.${keyword}[${index}]`));
    }
    active.delete(node);
    visited.add(node);
  }
  visit(schema, label);
}

function actualType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

export function assertJsonSchemaValue(value, schema, label = "value") {
  function validate(candidate, node, path) {
    if (node.$ref) {
      const target = resolveInternalRef(schema, node.$ref, path);
      assert.ok(target, `${path} references a missing schema definition.`);
      validate(candidate, target, path);
      return;
    }

    const types = schemaTypes(node);
    if (types.length) {
      const candidateType = actualType(candidate);
      const accepted = types.some((type) => type === candidateType || (type === "number" && candidateType === "integer"));
      assert.ok(accepted, `${path} must be ${types.join(" or ")}; received ${candidateType}.`);
    }
    if (node.const !== undefined) assert.deepEqual(candidate, node.const, `${path} must match const.`);
    if (node.enum) assert.ok(node.enum.some((item) => JSON.stringify(item) === JSON.stringify(candidate)), `${path} is not in its enum.`);

    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const keys = Object.keys(candidate);
      if (node.maxProperties != null) assert.ok(keys.length <= node.maxProperties, `${path} exceeds maxProperties.`);
      for (const required of node.required ?? []) assert.ok(Object.hasOwn(candidate, required), `${path}.${required} is required.`);
      for (const key of keys) {
        if (node.propertyNames) validate(key, node.propertyNames, `${path}.<key>`);
        if (node.properties && Object.hasOwn(node.properties, key)) validate(candidate[key], node.properties[key], `${path}.${key}`);
        else if (node.additionalProperties === false) assert.fail(`${path}.${key} is not declared.`);
        else if (node.additionalProperties && typeof node.additionalProperties === "object") validate(candidate[key], node.additionalProperties, `${path}.${key}`);
      }
    }
    if (Array.isArray(candidate)) {
      if (node.minItems != null) assert.ok(candidate.length >= node.minItems, `${path} is shorter than minItems.`);
      if (node.maxItems != null) assert.ok(candidate.length <= node.maxItems, `${path} exceeds maxItems.`);
      if (node.items) candidate.forEach((item, index) => validate(item, node.items, `${path}[${index}]`));
    }
    if (typeof candidate === "string") {
      if (node.minLength != null) assert.ok(candidate.length >= node.minLength, `${path} is shorter than minLength.`);
      if (node.maxLength != null) assert.ok(candidate.length <= node.maxLength, `${path} exceeds maxLength.`);
      if (node.pattern) assert.match(candidate, new RegExp(node.pattern), `${path} does not match its pattern.`);
    }
    if (typeof candidate === "number") {
      if (node.minimum != null) assert.ok(candidate >= node.minimum, `${path} is below minimum.`);
      if (node.maximum != null) assert.ok(candidate <= node.maximum, `${path} exceeds maximum.`);
    }

    for (const child of node.allOf ?? []) validate(candidate, child, path);
    if (node.anyOf) {
      const matches = node.anyOf.filter((child) => {
        try { validate(candidate, child, path); return true; } catch { return false; }
      });
      assert.ok(matches.length > 0, `${path} does not match any anyOf branch.`);
    }
    if (node.oneOf) {
      const matches = node.oneOf.filter((child) => {
        try { validate(candidate, child, path); return true; } catch { return false; }
      });
      assert.equal(matches.length, 1, `${path} must match exactly one oneOf branch.`);
    }
  }
  validate(value, schema, label);
}
