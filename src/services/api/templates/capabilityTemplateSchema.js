const fieldTypes = new Set(["string", "number", "integer", "boolean"]);
const TEMPLATE_STRING_MAX = 2000;
const TEMPLATE_NUMBER_MIN = -1000000;
const TEMPLATE_NUMBER_MAX = 1000000;

function text(value, field, { required = true, max = 500 } = {}) {
  const normalized = String(value ?? "").trim();
  if (required && !normalized) throw new TypeError(`${field} is required.`);
  if (normalized.length > max) throw new TypeError(`${field} must be ${max} characters or fewer.`);
  return normalized;
}

function name(value) {
  const normalized = text(value, "name", { max: 60 }).toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!/^[a-z][a-z0-9_]{2,59}$/.test(normalized)) throw new TypeError("name must be a snake_case verb phrase with at least three characters.");
  return normalized;
}

function inputFields(values = []) {
  if (!Array.isArray(values) || values.length > 12) throw new TypeError("inputFields must contain zero to twelve fields.");
  const seen = new Set();
  return values.map((value, index) => {
    const fieldName = name(value?.name);
    if (seen.has(fieldName)) throw new TypeError(`Duplicate input field: ${fieldName}.`);
    seen.add(fieldName);
    const type = String(value?.type || "string");
    if (!fieldTypes.has(type)) throw new TypeError(`inputFields[${index}].type is unsupported.`);
    return Object.freeze({ name: fieldName, label: text(value?.label || fieldName.replaceAll("_", " "), `inputFields[${index}].label`, { max: 80 }), description: text(value?.description, `inputFields[${index}].description`, { required: false, max: 180 }), type, required: Boolean(value?.required), example: value?.example == null ? "" : String(value.example).slice(0, 180) });
  });
}

function states(values, kind) {
  if (kind === "tool") return Object.freeze(["queued", "running", "complete", "error"]);
  const records = Array.isArray(values) ? values : String(values || "").split(",");
  const normalized = records.map((value) => String(value).trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_")).filter(Boolean);
  if (normalized.length < 2 || normalized.length > 12 || new Set(normalized).size !== normalized.length) throw new TypeError("Workflow states must contain two to twelve unique values.");
  if (normalized.some((value) => !/^[a-z][a-z0-9_]*$/.test(value))) throw new TypeError("Workflow states must be snake_case.");
  return Object.freeze(normalized);
}

export function buildTemplateInputSchema(fields) {
  const properties = Object.fromEntries(fields.map((field) => {
    const bounds = field.type === "string"
      ? { maxLength: TEMPLATE_STRING_MAX }
      : ["number", "integer"].includes(field.type)
        ? { minimum: TEMPLATE_NUMBER_MIN, maximum: TEMPLATE_NUMBER_MAX }
        : {};
    return [field.name, { type: field.type, ...bounds, description: field.description || field.label, ...(field.example !== "" ? { examples: [field.example] } : {}) }];
  }));
  const required = fields.filter((field) => field.required).map((field) => field.name);
  return Object.freeze({ type: "object", properties, ...(required.length ? { required } : {}), additionalProperties: false });
}

export function normalizeCapabilityTemplate(record, { now = new Date().toISOString(), idFactory = () => `template_${globalThis.crypto?.randomUUID?.() ?? Date.now()}` } = {}) {
  const kind = record?.kind === "workflow" ? "workflow" : "tool";
  const normalizedName = name(record?.name);
  const fields = inputFields(record?.inputFields);
  const scope = Object.freeze({ role: text(record?.scope?.role || "patient", "scope.role", { max: 60 }), situation: text(record?.scope?.situation || "user-created", "scope.situation", { max: 80 }), step: text(record?.scope?.step || normalizedName, "scope.step", { max: 80 }) });
  return Object.freeze({
    id: String(record?.id || idFactory()), version: 1, kind, name: normalizedName,
    title: text(record?.title, "title", { max: 100 }),
    description: text(record?.description, "description", { max: 500 }),
    examplePrompt: text(record?.examplePrompt, "examplePrompt", { required: false, max: 500 }),
    voiceGuide: text(record?.voiceGuide, "voiceGuide", { required: false, max: 1200 }),
    body: text(record?.body, "body", { max: 12000 }), inputFields: Object.freeze(fields), inputSchema: buildTemplateInputSchema(fields),
    states: states(record?.states, kind), scope, autoRegister: Boolean(record?.autoRegister),
    createdAt: String(record?.createdAt || now), updatedAt: now,
  });
}

export function validateTemplateInput(template, input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Template input must be an object.");
  const allowed = new Set(template.inputFields.map((field) => field.name));
  const unknown = Object.keys(input).find((key) => !allowed.has(key));
  if (unknown) throw new TypeError(`Unknown template input: ${unknown}.`);
  const output = {};
  for (const field of template.inputFields) {
    const value = input[field.name];
    if (field.required && (value == null || value === "")) throw new TypeError(`${field.name} is required.`);
    if (value == null || value === "") continue;
    if (field.type === "string" && typeof value !== "string") throw new TypeError(`${field.name} must be a string.`);
    if (field.type === "string" && value.length > TEMPLATE_STRING_MAX) throw new TypeError(`${field.name} must be ${TEMPLATE_STRING_MAX} characters or fewer.`);
    if (field.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) throw new TypeError(`${field.name} must be a finite number.`);
    if (field.type === "integer" && !Number.isInteger(value)) throw new TypeError(`${field.name} must be an integer.`);
    if (["number", "integer"].includes(field.type) && (value < TEMPLATE_NUMBER_MIN || value > TEMPLATE_NUMBER_MAX)) throw new TypeError(`${field.name} must be between ${TEMPLATE_NUMBER_MIN} and ${TEMPLATE_NUMBER_MAX}.`);
    if (field.type === "boolean" && typeof value !== "boolean") throw new TypeError(`${field.name} must be a boolean.`);
    output[field.name] = value;
  }
  return output;
}
