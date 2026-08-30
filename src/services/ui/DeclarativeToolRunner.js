import { getCapability } from "../../infrastructure/webmcp/catalog/capabilityCatalog.js";

const SENSITIVE_FIELD = /(?:password|passcode|secret|token|authorization|api[_-]?key|member|subscriber|policy|patient[-_]?(?:name|email|phone|dob))/i;

function escapeSelector(value) {
  return globalThis.CSS?.escape?.(String(value)) ?? String(value).replace(/[^a-z0-9_-]/gi, "");
}

function inputError(message, field = "") {
  return { ok: false, code: "INVALID_INPUT", retryable: false, message, ...(field ? { field } : {}) };
}

function validateValue(value, schema = {}, field = "input") {
  if (schema.type === "string") {
    if (typeof value !== "string") return `${field} must be a string.`;
    if (schema.minLength != null && value.length < schema.minLength) return `${field} must contain at least ${schema.minLength} characters.`;
    if (schema.maxLength != null && value.length > schema.maxLength) return `${field} must contain at most ${schema.maxLength} characters.`;
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return `${field} has an invalid format.`;
  } else if (schema.type === "integer") {
    if (!Number.isInteger(value)) return `${field} must be an integer.`;
  } else if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return `${field} must be a finite number.`;
  } else if (schema.type === "boolean") {
    if (typeof value !== "boolean") return `${field} must be a boolean.`;
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) return `${field} must be an array.`;
    if (schema.minItems != null && value.length < schema.minItems) return `${field} needs at least ${schema.minItems} items.`;
    if (schema.maxItems != null && value.length > schema.maxItems) return `${field} allows at most ${schema.maxItems} items.`;
    for (let index = 0; index < value.length; index += 1) {
      const itemError = validateValue(value[index], schema.items ?? {}, `${field}[${index}]`);
      if (itemError) return itemError;
    }
  } else if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return `${field} must be an object.`;
  }
  if (schema.enum && !schema.enum.includes(value)) return `${field} must be one of: ${schema.enum.join(", ")}.`;
  if (typeof value === "number" && schema.minimum != null && value < schema.minimum) return `${field} is below the minimum.`;
  if (typeof value === "number" && schema.maximum != null && value > schema.maximum) return `${field} exceeds the maximum.`;
  return "";
}

function validateInput(input, schema = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return inputError("Declarative tool input must be an object.");
  const properties = schema.properties ?? {};
  const unknown = Object.keys(input).find((field) => !(field in properties));
  if (schema.additionalProperties === false && unknown) return inputError(`Unknown input field: ${unknown}.`, unknown);
  const missing = (schema.required ?? []).find((field) => input[field] == null || input[field] === "");
  if (missing) return inputError(`${missing} is required.`, missing);
  for (const [field, value] of Object.entries(input)) {
    const message = validateValue(value, properties[field] ?? {}, field);
    if (message) return inputError(message, field);
  }
  return null;
}

function dispatchControlEvent(control, type) {
  const EventConstructor = control?.ownerDocument?.defaultView?.Event ?? globalThis.Event;
  if (typeof EventConstructor === "function") control.dispatchEvent(new EventConstructor(type, { bubbles: true }));
  else control.dispatchEvent?.({ type, bubbles: true });
}

function changeControl(control, value) {
  const type = String(control?.type || "").toLowerCase();
  if (type === "checkbox") {
    control.checked = Array.isArray(value) ? value.map(String).includes(String(control.value)) : Boolean(value);
  } else if (type === "radio") {
    control.checked = String(control.value) === String(value);
  } else if (control?.multiple && Array.isArray(value)) {
    [...control.options].forEach((option) => { option.selected = value.map(String).includes(String(option.value)); });
  } else {
    control.value = String(value ?? "");
  }
  dispatchControlEvent(control, "input");
  dispatchControlEvent(control, "change");
}

function fieldValue(controls) {
  const first = controls[0];
  const type = String(first?.type || "").toLowerCase();
  if (type === "checkbox") {
    if (controls.length === 1 && !first.value) return Boolean(first.checked);
    return controls.filter((control) => control.checked).map((control) => String(control.value));
  }
  if (type === "radio") return controls.find((control) => control.checked)?.value ?? "";
  if (first?.multiple) return [...first.selectedOptions].map((option) => String(option.value));
  return String(first?.value ?? "");
}

function safeFieldValue(field, value) {
  return SENSITIVE_FIELD.test(field) ? "[redacted]" : value;
}

export class DeclarativeToolRunner {
  constructor({ documentRef = globalThis.document } = {}) {
    this.documentRef = documentRef;
  }

  isAvailable(toolName) {
    return Boolean(this.documentRef?.querySelector?.(`[toolname="${escapeSelector(toolName)}"]`));
  }

  invoke(toolName, input = {}) {
    const capability = getCapability(toolName);
    const validationError = validateInput(input, capability?.inputSchema ?? { type: "object", properties: {}, additionalProperties: false });
    if (validationError) return validationError;

    const form = this.documentRef?.querySelector?.(`[toolname="${escapeSelector(toolName)}"]`);
    if (!form) {
      return {
        ok: false,
        code: "TOOL_UNAVAILABLE_ON_ROUTE",
        retryable: true,
        toolName,
        recommendedRoute: capability?.route ?? "",
        message: `${toolName} is not present on the current route.`,
      };
    }

    const controlsByField = new Map();
    const missingFields = [];
    for (const name of Object.keys(input)) {
      const controls = [...form.querySelectorAll(`[name="${escapeSelector(name)}"]`)];
      if (!controls.length) missingFields.push(name);
      else controlsByField.set(name, controls);
    }
    if (missingFields.length) {
      return {
        ok: false,
        code: "MISSING_VISIBLE_FIELD",
        retryable: false,
        message: `The visible form does not expose: ${missingFields.join(", ")}.`,
        missingFields,
      };
    }

    const changes = [];
    for (const [name, value] of Object.entries(input)) {
      const controls = controlsByField.get(name);
      const before = fieldValue(controls);
      controls.forEach((control) => changeControl(control, value));
      const after = fieldValue(controls);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        changes.push({ field: name, before: safeFieldValue(name, before), after: safeFieldValue(name, after) });
      }
    }

    const submitted = form.hasAttribute("toolautosubmit");
    let submitError = "";
    if (submitted) {
      try { form.requestSubmit?.(); }
      catch { submitError = "The visible form changed, but its local submit handler could not run."; }
    }
    const visibleForm = {
      toolName,
      submitted: submitted && !submitError,
      presentAfterRun: form.isConnected !== false,
      changedFields: [...controlsByField.keys()],
      changes,
    };
    if (submitError) return { ok: false, code: "VISIBLE_FORM_SUBMIT_FAILED", retryable: true, message: submitError, visibleForm };
    return {
      ok: true,
      toolName,
      interactionModel: "declarative",
      visibleForm,
      mocked: true,
      message: submitted ? "Updated and submitted the visible local form." : "Updated the visible local form for human review.",
    };
  }
}
