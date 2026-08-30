import { toolError, toolResponse } from "../toolResponse.js";
import { createStructuredExchangeToolPair } from "../templates/createStructuredExchangeToolPair.js";
import { doctorQuestionCardResponseSchema } from "../../../services/api/workflows/doctorQuestionCardExchange.js";
import { decorateToolDefinitions } from "../catalog/capabilityCatalog.js";

class ToolInputError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ToolInputError";
    this.details = details;
  }
}

function stringValue(input, key, { required = false, maxLength = 120 } = {}) {
  const value = input?.[key];
  if (value == null || value === "") {
    if (required) throw new ToolInputError(`${key} is required.`, { field: key });
    return "";
  }
  if (typeof value !== "string") throw new ToolInputError(`${key} must be a string.`, { field: key });
  const normalized = value.trim();
  if (required && !normalized) throw new ToolInputError(`${key} is required.`, { field: key });
  if (normalized.length > maxLength) throw new ToolInputError(`${key} must be ${maxLength} characters or fewer.`, { field: key });
  return normalized;
}

function integerValue(input, key, { fallback, minimum = 1, maximum = 100, required = false } = {}) {
  const value = input?.[key];
  if (value == null || value === "") {
    if (required) throw new ToolInputError(`${key} is required.`, { field: key });
    return fallback;
  }
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new ToolInputError(`${key} must be an integer from ${minimum} to ${maximum}.`, { field: key });
  }
  return value;
}

function stringArray(input, key, { minimum = 1, maximum = 10, maxLength = 240 } = {}) {
  const value = input?.[key];
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum || value.some((item) => typeof item !== "string" || !item.trim() || item.trim().length > maxLength)) {
    throw new ToolInputError(`${key} must contain ${minimum} to ${maximum} non-empty strings no longer than ${maxLength} characters.`, { field: key });
  }
  return value.map((item) => item.trim());
}

function optionalStringArray(input, key, options = {}) {
  if (input?.[key] == null) return [];
  return stringArray(input, key, { minimum: 0, ...options });
}

function enumValue(input, key, values, { fallback = "", required = false } = {}) {
  const value = stringValue(input, key, { required, maxLength: Math.max(...values.map((item) => item.length)) });
  const normalized = value || fallback;
  if (normalized && !values.includes(normalized)) {
    throw new ToolInputError(`${key} must be one of: ${values.join(", ")}.`, { field: key, allowed: values });
  }
  return normalized;
}

function optionalStringMap(input, key, { allowedKeys = [], maximum = 4, maxKeyLength = 100, maxValueLength = 140 } = {}) {
  const value = input?.[key];
  if (value == null) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ToolInputError(`${key} must be an object keyed by drug id.`, { field: key });
  }
  const entries = Object.entries(value);
  if (entries.length > maximum) throw new ToolInputError(`${key} may contain at most ${maximum} entries.`, { field: key });
  return Object.fromEntries(entries.map(([mapKey, mapValue]) => {
    const normalizedKey = String(mapKey).trim();
    if (!normalizedKey || normalizedKey.length > maxKeyLength || (allowedKeys.length && !allowedKeys.includes(normalizedKey))) {
      throw new ToolInputError(`${key} contains an unknown or invalid drug id.`, { field: `${key}.${mapKey}` });
    }
    if (typeof mapValue !== "string" || !mapValue.trim() || mapValue.trim().length > maxValueLength) {
      throw new ToolInputError(`${key}.${normalizedKey} must be a non-empty variant id no longer than ${maxValueLength} characters.`, { field: `${key}.${normalizedKey}` });
    }
    return [normalizedKey, mapValue.trim()];
  }));
}

function boundedJsonValue(value, { field, depth = 0, maximum = 12 } = {}) {
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    if (value.length > 240) throw new ToolInputError(`${field} must be 240 characters or fewer.`, { field });
    return value;
  }
  if (depth >= 4) throw new ToolInputError(`${field} is nested too deeply.`, { field });
  if (Array.isArray(value)) {
    if (value.length > 20) throw new ToolInputError(`${field} may contain at most 20 items.`, { field });
    return value.map((item, index) => boundedJsonValue(item, { field: `${field}[${index}]`, depth: depth + 1, maximum }));
  }
  if (!value || typeof value !== "object") throw new ToolInputError(`${field} must contain JSON-compatible values.`, { field });
  const entries = Object.entries(value);
  if (entries.length > maximum) throw new ToolInputError(`${field} may contain at most ${maximum} fields.`, { field });
  return Object.fromEntries(entries.map(([mapKey, item]) => {
    if (["__proto__", "prototype", "constructor"].includes(mapKey)) throw new ToolInputError(`${field}.${mapKey} is not allowed.`, { field: `${field}.${mapKey}` });
    return [mapKey, boundedJsonValue(item, { field: `${field}.${mapKey}`, depth: depth + 1, maximum })];
  }));
}

function objectValue(input, key, { fallback = {}, maximum = 12 } = {}) {
  const value = input?.[key];
  if (value == null) return boundedJsonValue(fallback, { field: key, maximum });
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ToolInputError(`${key} must be an object.`, { field: key });
  return boundedJsonValue(value, { field: key, maximum });
}

function requestIdValue(input) {
  const requestId = stringValue(input, "requestId", { required: true, maxLength: 120 });
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(requestId)) {
    throw new ToolInputError("requestId must contain only safe identifier characters.", { field: "requestId" });
  }
  return requestId;
}

function structuredToolError(error) {
  const message = error instanceof Error ? error.message : "The tool could not complete.";
  if (typeof error?.toStructuredContent === "function") {
    const details = error.toStructuredContent();
    return toolError(details?.message ?? message, details);
  }
  if (typeof error?.code === "string" && /^[A-Z][A-Z0-9_]*$/.test(error.code)) {
    return toolError(message, {
      code: error.code,
      retryable: Boolean(error.retryable),
      recommendedTool: error.recommendedTool || null,
      ...(error.recoveryInput ? { recoveryInput: error.recoveryInput } : {}),
      ...(error.details ? { details: error.details } : {}),
    });
  }
  const invalidInput = error instanceof ToolInputError || error instanceof TypeError;
  return toolError(message, {
    code: invalidInput ? "INVALID_INPUT" : "TOOL_FAILURE",
    retryable: false,
    ...(error instanceof ToolInputError ? error.details : {}),
  });
}

function safe(execute, allowedKeys = []) {
  return async (input = {}) => {
    try {
      const normalizedInput = input ?? {};
      if (!normalizedInput || typeof normalizedInput !== "object" || Array.isArray(normalizedInput)) {
        throw new ToolInputError("Tool input must be an object.");
      }
      const unknownKeys = Object.keys(normalizedInput).filter((key) => !allowedKeys.includes(key));
      if (unknownKeys.length) throw new ToolInputError(`Unknown input field: ${unknownKeys[0]}.`, { field: unknownKeys[0] });
      return await execute(normalizedInput);
    } catch (error) { return structuredToolError(error); }
  };
}

const readOnlyAnnotations = Object.freeze({ readOnlyHint: true, untrustedContentHint: false });
const localMutationAnnotations = Object.freeze({ readOnlyHint: false, untrustedContentHint: false });
const workflowMutationAnnotations = Object.freeze({ readOnlyHint: false, untrustedContentHint: true });

export function createDefaultTools({ store, highlightService, workflowRuntime }) {
  const tools = [
    {
      name: "search_drug_index",
      title: "Search the Universal Drug Index",
      description: "Search ClearDose's local fictional Universal Drug Index by generic name, brand, category, drug class, or UDI id. Use this when the user needs candidate records or exact drug ids for another tool.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", maxLength: 120, description: "Raw search text such as lisinopril, Lipitor, Statin, or udi:cleardose:lisinopril." },
          category: { type: "string", maxLength: 80, description: "Optional exact category returned by a prior search." },
          drugClass: { type: "string", maxLength: 80, description: "Optional exact drug class returned by a prior search." },
          limit: { type: "integer", description: "Maximum compact records to return.", minimum: 1, maximum: 50, default: 12 },
        },
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const query = stringValue(input, "query", { maxLength: 120 });
        const category = stringValue(input, "category", { maxLength: 80 }) || "All medications";
        const drugClass = stringValue(input, "drugClass", { maxLength: 80 });
        const limit = integerValue(input, "limit", { fallback: 12, maximum: 50 });
        const drugs = await store.searchLocalDrugIndex({ query, category, drugClass, limit });
        return toolResponse({ ok: true, count: drugs.length, drugs }, `Found ${drugs.length} matching UDI record${drugs.length === 1 ? "" : "s"}.`);
      }, ["query", "category", "drugClass", "limit"]),
    },
    {
      name: "get_drug_index_entry",
      title: "Get one Universal Drug Index entry",
      description: "Return normalized identity, class, package variants, and fictional price offers for one exact ClearDose UDI drug id. Use after search_drug_index identifies the record.",
      inputSchema: {
        type: "object",
        properties: {
          drugId: { type: "string", maxLength: 100, description: "Exact ClearDose UDI drug id such as med_lisinopril." },
        },
        required: ["drugId"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const drugId = stringValue(input, "drugId", { required: true, maxLength: 100 });
        const drug = await store.localDrugIndexEntry(drugId);
        if (!drug) throw new ToolInputError(`Unknown UDI drug id: ${drugId}.`, { field: "drugId" });
        return toolResponse({ ok: true, drug }, `Returned ${drug.name} with ${drug.variants.length} fictional package variants.`);
      }, ["drugId"]),
    },
    {
      name: "find_compatible_options",
      title: "Find explicitly compatible medication options",
      description: "Return the seeded ClearDose relationships that permit a same-medication provider comparison or a discussion-only clinician handoff. The result does not claim therapeutic equivalence or recommend substitution.",
      inputSchema: {
        type: "object",
        properties: {
          drugId: { type: "string", minLength: 1, maxLength: 100, description: "Exact ClearDose UDI drug id returned by search_drug_index." },
          purpose: { type: "string", maxLength: 17, enum: ["facts", "price", "fulfillment", "doctor_discussion"], default: "facts", description: "The reason for checking compatibility. Eligibility differs by purpose." },
        },
        required: ["drugId"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const drugId = stringValue(input, "drugId", { required: true, maxLength: 100 });
        const purpose = enumValue(input, "purpose", ["facts", "price", "fulfillment", "doctor_discussion"], { fallback: "facts" });
        const compatibility = await store.listLocalCompatibleOptions({ drugId, purpose });
        return toolResponse({ ok: true, compatibility }, `Returned ${compatibility.eligible.length} eligible seeded option${compatibility.eligible.length === 1 ? "" : "s"} for ${purpose}.`);
      }, ["drugId", "purpose"]),
    },
    {
      name: "compare_medication_options",
      title: "Compare explicitly compatible medication options",
      description: "Compare structured facts and fictional provider offers for one to four exact UDI records after ClearDose confirms the requested relationship. Discussion-only records are not ranked as substitutes.",
      inputSchema: {
        type: "object",
        properties: {
          drugIds: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", minLength: 1, maxLength: 100 }, description: "One to four exact UDI drug ids. A single id compares providers for the same medication." },
          variantIds: {
            type: "object",
            maxProperties: 4,
            propertyNames: { type: "string", minLength: 1, maxLength: 100 },
            additionalProperties: { type: "string", minLength: 1, maxLength: 140 },
            description: "Optional exact variant ids keyed by an id in drugIds.",
          },
          purpose: { type: "string", maxLength: 17, enum: ["facts", "price", "fulfillment", "doctor_discussion"], default: "facts" },
          locationId: { type: "string", maxLength: 80, description: "Optional seeded demo location id." },
          postalCode: { type: "string", maxLength: 16, description: "Optional seeded demo postal code." },
        },
        required: ["drugIds"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const drugIds = stringArray(input, "drugIds", { minimum: 1, maximum: 4, maxLength: 100 });
        const variantIds = optionalStringMap(input, "variantIds", { allowedKeys: drugIds, maximum: 4 });
        const purpose = enumValue(input, "purpose", ["facts", "price", "fulfillment", "doctor_discussion"], { fallback: "facts" });
        const locationId = stringValue(input, "locationId", { maxLength: 80 });
        const postalCode = stringValue(input, "postalCode", { maxLength: 16 });
        const comparison = await store.compareLocalMedicationOptions({ drugIds, variantIds, purpose, locationId, postalCode });
        return toolResponse({ ok: true, comparison }, `Compared ${comparison.selections.length} seeded medication selection${comparison.selections.length === 1 ? "" : "s"}; rankable is ${comparison.rankable}.`);
      }, ["drugIds", "variantIds", "purpose", "locationId", "postalCode"]),
    },
    {
      name: "compare_drug_prices",
      title: "Compare fictional drug price offers",
      description: "Compare package and delivered-price offers for one to four exact UDI drug ids. Use for price facts only; different drugs are not treated as therapeutic substitutes.",
      inputSchema: {
        type: "object",
        properties: {
          drugIds: {
            type: "array",
            description: "One to four exact ids returned by search_drug_index.",
            minItems: 1,
            maxItems: 4,
            items: { type: "string", maxLength: 100 },
          },
          strength: { type: "string", maxLength: 40, description: "Optional exact strength, such as 10mg. If unavailable, the tool returns the closest indexed package and names it explicitly." },
          quantity: { type: "integer", description: "Optional package quantity. If unavailable, the tool returns the closest indexed package and names it explicitly.", minimum: 1, maximum: 365 },
        },
        required: ["drugIds"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const drugIds = stringArray(input, "drugIds", { minimum: 1, maximum: 4, maxLength: 100 });
        const strength = stringValue(input, "strength", { maxLength: 40 });
        const quantity = integerValue(input, "quantity", { fallback: undefined, maximum: 365 });
        const comparison = await store.compareLocalDrugPrices({ drugIds, strength, quantity });
        return toolResponse({ ok: true, comparison }, `Compared fictional price offers for ${comparison.selections.length} UDI record${comparison.selections.length === 1 ? "" : "s"}.`);
      }, ["drugIds", "strength", "quantity"]),
    },
    {
      name: "find_related_drugs",
      title: "Find related drug index entries",
      description: "Find other UDI entries in the same broad demo comparison group as one exact drug id. Use the discussion-only matches to prepare questions for a clinician; every result explicitly states that it is not a therapeutic-equivalence or substitution recommendation.",
      inputSchema: {
        type: "object",
        properties: {
          drugId: { type: "string", maxLength: 100, description: "Exact ClearDose UDI drug id returned by search_drug_index." },
          limit: { type: "integer", description: "Maximum related records to return.", minimum: 1, maximum: 12, default: 6 },
        },
        required: ["drugId"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const drugId = stringValue(input, "drugId", { required: true, maxLength: 100 });
        const limit = integerValue(input, "limit", { fallback: 6, maximum: 12 });
        const result = await store.findLocalRelatedDrugs({ drugId, limit });
        return toolResponse({ ok: true, ...result }, `Found ${result.related.length} related demo index entr${result.related.length === 1 ? "y" : "ies"}.`);
      }, ["drugId", "limit"]),
    },
    {
      name: "get_drug_availability",
      title: "Get fictional provider availability",
      description: "Return deterministic stock, provider, pickup, shipping, and delivery facts for one exact indexed package at a seeded demo location. This does not contact a pharmacy or reserve inventory.",
      inputSchema: {
        type: "object",
        properties: {
          drugId: { type: "string", minLength: 1, maxLength: 100, description: "Exact ClearDose UDI drug id." },
          variantId: { type: "string", maxLength: 140, description: "Preferred exact package variant id." },
          strength: { type: "string", maxLength: 40, description: "Exact strength when variantId is omitted." },
          quantity: { type: "integer", minimum: 1, maximum: 365, description: "Exact package quantity when variantId is omitted." },
          locationId: { type: "string", maxLength: 80, description: "Seeded demo location id." },
          postalCode: { type: "string", maxLength: 16, description: "Seeded demo postal code." },
        },
        required: ["drugId"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const availability = await store.getLocalDrugAvailability({
          drugId: stringValue(input, "drugId", { required: true, maxLength: 100 }),
          variantId: stringValue(input, "variantId", { maxLength: 140 }),
          strength: stringValue(input, "strength", { maxLength: 40 }),
          quantity: integerValue(input, "quantity", { fallback: undefined, maximum: 365 }),
          locationId: stringValue(input, "locationId", { maxLength: 80 }),
          postalCode: stringValue(input, "postalCode", { maxLength: 16 }),
        });
        return toolResponse({ ok: true, availability }, `Returned ${availability.offers.length} fictional provider offer${availability.offers.length === 1 ? "" : "s"} for ${availability.location.label}.`);
      }, ["drugId", "variantId", "strength", "quantity", "locationId", "postalCode"]),
    },
    {
      name: "compare_drug_availability",
      title: "Compare fictional availability and delivery",
      description: "Rank seeded provider offers for one exact medication package by fictional price and fulfillment timing. Cross-medication candidates must pass the explicit fulfillment compatibility rules.",
      inputSchema: {
        type: "object",
        properties: {
          drugId: { type: "string", minLength: 1, maxLength: 100, description: "Exact source UDI drug id." },
          variantId: { type: "string", maxLength: 140, description: "Exact source package variant id." },
          compatibleDrugIds: { type: "array", minItems: 0, maxItems: 3, items: { type: "string", minLength: 1, maxLength: 100 }, description: "Optional candidates returned by find_compatible_options for fulfillment." },
          locationId: { type: "string", maxLength: 80, description: "Seeded demo location id." },
          postalCode: { type: "string", maxLength: 16, description: "Seeded demo postal code." },
          fulfillmentMode: { type: "string", maxLength: 8, enum: ["shipping", "pickup", "either"], default: "shipping" },
          maxDeliveryDays: { type: "integer", minimum: 1, maximum: 30, description: "Optional latest acceptable fictional delivery day." },
        },
        required: ["drugId"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const comparison = await store.compareLocalDrugAvailability({
          drugId: stringValue(input, "drugId", { required: true, maxLength: 100 }),
          variantId: stringValue(input, "variantId", { maxLength: 140 }),
          compatibleDrugIds: optionalStringArray(input, "compatibleDrugIds", { maximum: 3, maxLength: 100 }),
          locationId: stringValue(input, "locationId", { maxLength: 80 }),
          postalCode: stringValue(input, "postalCode", { maxLength: 16 }),
          fulfillmentMode: enumValue(input, "fulfillmentMode", ["shipping", "pickup", "either"], { fallback: "shipping" }),
          maxDeliveryDays: integerValue(input, "maxDeliveryDays", { fallback: undefined, maximum: 30 }),
        });
        return toolResponse({ ok: true, comparison }, `Ranked ${comparison.options.length} fictional fulfillment option${comparison.options.length === 1 ? "" : "s"}; no inventory was reserved.`);
      }, ["drugId", "variantId", "compatibleDrugIds", "locationId", "postalCode", "fulfillmentMode", "maxDeliveryDays"]),
    },
    {
      name: "estimate_delivery",
      title: "Estimate fictional package delivery",
      description: "Return one deterministic pickup or shipping estimate for an exact indexed package and seeded provider offer. The estimate is not a fulfillment promise.",
      inputSchema: {
        type: "object",
        properties: {
          drugId: { type: "string", minLength: 1, maxLength: 100, description: "Exact ClearDose UDI drug id." },
          variantId: { type: "string", maxLength: 140, description: "Exact package variant id." },
          offerId: { type: "string", maxLength: 140, description: "Optional exact offer id returned by get_drug_availability." },
          providerId: { type: "string", maxLength: 100, description: "Optional seeded provider id. Do not combine with offerId." },
          locationId: { type: "string", maxLength: 80, description: "Seeded demo location id." },
          postalCode: { type: "string", maxLength: 16, description: "Seeded demo postal code." },
          fulfillmentMode: { type: "string", maxLength: 8, enum: ["shipping", "pickup"], default: "shipping" },
        },
        required: ["drugId"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const offerId = stringValue(input, "offerId", { maxLength: 140 });
        const providerId = stringValue(input, "providerId", { maxLength: 100 });
        if (offerId && providerId) throw new ToolInputError("Use offerId or providerId, not both.", { field: "offerId" });
        const estimate = await store.estimateLocalDelivery({
          drugId: stringValue(input, "drugId", { required: true, maxLength: 100 }),
          variantId: stringValue(input, "variantId", { maxLength: 140 }),
          offerId,
          providerId,
          locationId: stringValue(input, "locationId", { maxLength: 80 }),
          postalCode: stringValue(input, "postalCode", { maxLength: 16 }),
          fulfillmentMode: enumValue(input, "fulfillmentMode", ["shipping", "pickup"], { fallback: "shipping" }),
        });
        return toolResponse({ ok: true, estimate }, `Returned a fictional ${estimate.fulfillmentMode} estimate from ${estimate.offer.providerName}.`);
      }, ["drugId", "variantId", "offerId", "providerId", "locationId", "postalCode", "fulfillmentMode"]),
    },
    {
      name: "review_demo_interaction_flags",
      title: "Review synthetic medication interaction flags",
      description: "Review two to ten exact UDI drug ids against ClearDose's intentionally incomplete synthetic interaction fixtures. Every result exposes coverage gaps and requires verification by a licensed pharmacist.",
      inputSchema: {
        type: "object",
        properties: {
          drugIds: {
            type: "array",
            description: "Two to ten exact ClearDose UDI ids representing the medication list to review.",
            minItems: 2,
            maxItems: 10,
            items: { type: "string", maxLength: 100 },
          },
        },
        required: ["drugIds"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const drugIds = stringArray(input, "drugIds", { minimum: 2, maximum: 10, maxLength: 100 });
        const review = await store.reviewLocalInteractionFlags({ drugIds });
        return toolResponse({ ok: true, review }, `Returned ${review.flags.length} synthetic review flag${review.flags.length === 1 ? "" : "s"}; professional verification is required.`);
      }, ["drugIds"]),
    },
    {
      name: "build_procurement_plan",
      title: "Build a local fictional procurement plan",
      description: "Build a local-only plan for one to twelve requested UDI medications using fictional package offers. The result is planning-only and leaves prescription validation, inventory reservation, and ordering to human-controlled workflows.",
      inputSchema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            description: "Requested UDI records and optional exact package preferences.",
            minItems: 1,
            maxItems: 12,
            items: {
              type: "object",
              properties: {
                drugId: { type: "string", maxLength: 100, description: "Exact UDI drug id returned by search_drug_index." },
                strength: { type: "string", maxLength: 40, description: "Optional exact indexed strength." },
                quantity: { type: "integer", description: "Optional exact indexed package quantity.", minimum: 1, maximum: 365 },
              },
              required: ["drugId"],
              additionalProperties: false,
            },
          },
          strategy: {
            type: "string",
            maxLength: 30,
            description: "How to select fictional offers: lowest delivered total, fewest channels, or a simple cost-and-speed balance.",
            enum: ["lowest_total", "fewest_shipments", "balanced"],
            default: "lowest_total",
          },
        },
        required: ["items"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 12) {
          throw new ToolInputError("items must contain between one and twelve requested medications.", { field: "items" });
        }
        const items = input.items.map((item, index) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) throw new ToolInputError(`items[${index}] must be an object.`, { field: `items[${index}]` });
          const unknownKeys = Object.keys(item).filter((key) => !["drugId", "strength", "quantity"].includes(key));
          if (unknownKeys.length) throw new ToolInputError(`Unknown field items[${index}].${unknownKeys[0]}.`, { field: `items[${index}].${unknownKeys[0]}` });
          return {
            drugId: stringValue(item, "drugId", { required: true, maxLength: 100 }),
            strength: stringValue(item, "strength", { maxLength: 40 }),
            quantity: integerValue(item, "quantity", { fallback: undefined, maximum: 365 }),
          };
        });
        const strategy = stringValue(input, "strategy", { maxLength: 30 }) || "lowest_total";
        const plan = await store.buildLocalProcurementPlan({ items, strategy });
        return toolResponse({ ok: true, plan }, `Built a local fictional procurement plan for ${plan.items.length} item${plan.items.length === 1 ? "" : "s"}; no order was placed.`);
      }, ["items", "strategy"]),
    },
    {
      name: "highlight_section",
      title: "Highlight a visible ClearDose section",
      description: "Move keyboard focus to and visibly highlight one stable section on the current ClearDose page so the user and agent can discuss the same content.",
      inputSchema: {
        type: "object",
        properties: {
          target: {
            type: "string",
            maxLength: 80,
            enum: highlightService.listTargets(),
            description: "Stable section identifier. If the section is not on the current page, the tool returns a clear non-retryable error.",
          },
        },
        required: ["target"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const target = stringValue(input, "target", { required: true, maxLength: 80 });
        if (!highlightService.listTargets().includes(target)) throw new ToolInputError(`Unknown highlight target: ${target}.`, { field: "target" });
        const result = highlightService.highlight(target);
        if (!result.ok) throw new ToolInputError(result.message, { field: "target", target });
        return toolResponse(result, result.message);
      }, ["target"]),
    },
    {
      name: "get_cart",
      title: "Read the local ClearDose cart",
      description: "Read the current fictional ClearDose cart with item-level and total prices. This tool does not change state or expose customer profile data.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: readOnlyAnnotations,
      execute: safe(async () => toolResponse({
        ok: true,
        items: store.state.cart,
        itemCount: store.cartCount,
        subtotal: store.cartSubtotal,
        shipping: store.shipping,
        total: store.cartTotal,
      }, `The local ClearDose cart contains ${store.cartCount} item${store.cartCount === 1 ? "" : "s"}.`), []),
    },
    {
      name: "add_to_cart",
      title: "Add one indexed package to the local cart",
      description: "Add one exact fictional UDI medication package to the local ClearDose cart. Use get_drug_index_entry first to obtain the exact drugId and variantId. This changes only resettable browser demo state.",
      inputSchema: {
        type: "object",
        properties: {
          drugId: { type: "string", maxLength: 100, description: "Exact UDI drug id returned by get_drug_index_entry." },
          variantId: { type: "string", maxLength: 140, description: "Exact package variant id returned by get_drug_index_entry." },
        },
        required: ["drugId", "variantId"],
        additionalProperties: false,
      },
      annotations: localMutationAnnotations,
      execute: safe(async (input) => {
        const drugId = stringValue(input, "drugId", { required: true, maxLength: 100 });
        const variantId = stringValue(input, "variantId", { required: true, maxLength: 140 });
        const { added, drug } = await store.addLocalDrugToCart(drugId, variantId);
        if (!added) throw new ToolInputError("The seeded UDI drug or package variant was not found.", { field: "variantId" });
        const fulfillmentGate = drug ? {
          code: "PRESCRIPTION_REQUIRED",
          title: "Prescription required",
          summary: "Your prescriber must send a valid prescription before fulfillment.",
          recommendedTool: "cleardose_prepare_prescription_follow_up",
          humanReviewRequired: true,
        } : null;
        return toolResponse({ ok: true, itemCount: store.cartCount, total: store.cartTotal, fulfillmentGate }, fulfillmentGate ? "Added the indexed package to the local cart. Prescription follow-up is required before fictional fulfillment." : "Added the indexed package to the local fictional cart.");
      }, ["drugId", "variantId"]),
    },
  ];

  tools.splice(11, 0,
    {
      name: "inspect_workflow_runtime",
      title: "Inspect local workflow runtime",
      description: "Read recent ClearDose workflow instances, transitions, bounded context snapshots, generated cards, and the local DuckDB-Wasm status. Use this to explain what the site and agent have completed without changing state.",
      inputSchema: {
        type: "object",
        properties: {
          flowId: { type: "string", maxLength: 100, description: "Optional exact flow id. Omit it to inspect concurrent recent flows." },
          limit: { type: "integer", description: "Maximum recent events to return.", minimum: 1, maximum: 100, default: 40 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: safe(async (input) => {
        const flowId = stringValue(input, "flowId", { maxLength: 100 });
        const limit = integerValue(input, "limit", { fallback: 40, maximum: 100 });
        const runtime = store.inspectWorkflow({ flowId, limit });
        if (flowId && !runtime.flows.length) throw new ToolInputError(`Unknown workflow id: ${flowId}.`, { field: "flowId" });
        return toolResponse({ ok: true, runtime }, `Returned ${runtime.flows.length} workflow instance${runtime.flows.length === 1 ? "" : "s"} and ${runtime.events.length} event${runtime.events.length === 1 ? "" : "s"}.`);
      }, ["flowId", "limit"]),
    },
    {
      name: "inspect_workflow_state",
      title: "Inspect one workflow state",
      description: "Return one local workflow's current state, version, state metadata, valid agent actions, human-only actions, and disabled actions without changing it.",
      inputSchema: {
        type: "object",
        properties: { flowId: { type: "string", minLength: 1, maxLength: 100, description: "Exact flow id returned by inspect_workflow_runtime." } },
        required: ["flowId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: safe(async (input) => {
        const state = store.inspectWorkflowState({ flowId: stringValue(input, "flowId", { required: true, maxLength: 100 }) });
        if (!state) throw new Error("Workflow runtime is not configured.");
        return toolResponse({ ok: true, ...state }, `Workflow ${state.flow.id} is at ${state.currentState}, version ${state.version}.`);
      }, ["flowId"]),
    },
    {
      name: "get_workflow_history",
      title: "Get one workflow event history",
      description: "Return up to one hundred chronological events for one exact local workflow, including bounded context snapshots and stable event versions.",
      inputSchema: {
        type: "object",
        properties: {
          flowId: { type: "string", minLength: 1, maxLength: 100, description: "Exact local workflow id." },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 40, description: "Maximum most-recent events to return in chronological order." },
        },
        required: ["flowId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: safe(async (input) => {
        const history = store.getWorkflowHistory({
          flowId: stringValue(input, "flowId", { required: true, maxLength: 100 }),
          limit: integerValue(input, "limit", { fallback: 40, maximum: 100 }),
        });
        return toolResponse({ ok: true, ...history }, `Returned ${history.events.length} event${history.events.length === 1 ? "" : "s"} for workflow ${history.flowId}.`);
      }, ["flowId", "limit"]),
    },
    {
      name: "get_available_workflow_actions",
      title: "Get available workflow actions",
      description: "List every valid agent action, human-only action, and unavailable action for one exact local workflow state without dispatching anything.",
      inputSchema: {
        type: "object",
        properties: { flowId: { type: "string", minLength: 1, maxLength: 100, description: "Exact local workflow id." } },
        required: ["flowId"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const actions = store.getAvailableWorkflowActions({ flowId: stringValue(input, "flowId", { required: true, maxLength: 100 }) });
        return toolResponse({ ok: true, ...actions }, `Workflow ${actions.flowId} has ${actions.availableActions.length} agent action${actions.availableActions.length === 1 ? "" : "s"} available.`);
      }, ["flowId"]),
    },
    {
      name: "get_workflow_transition",
      title: "Inspect one workflow transition",
      description: "Explain one declared action, its source and target state, input schema, availability, human-control status, and recovery metadata without dispatching it.",
      inputSchema: {
        type: "object",
        properties: {
          flowId: { type: "string", minLength: 1, maxLength: 100, description: "Exact local workflow id." },
          action: { type: "string", minLength: 1, maxLength: 80, pattern: "^[A-Za-z][A-Za-z0-9_]*$", description: "Declared action name such as COMPARE." },
        },
        required: ["flowId", "action"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const result = store.getWorkflowTransition({
          flowId: stringValue(input, "flowId", { required: true, maxLength: 100 }),
          action: stringValue(input, "action", { required: true, maxLength: 80 }),
        });
        return toolResponse({ ok: true, ...result }, `${result.transition.action} leads from ${result.transition.from.join(", ")} to ${result.transition.to}.`);
      }, ["flowId", "action"]),
    },
    {
      name: "dispatch_workflow_transition",
      title: "Dispatch one local workflow transition",
      description: "Dispatch one declared agent action against the exact observed workflow version. The runtime validates the action-specific input, rejects stale state, and blocks human-only transitions.",
      inputSchema: {
        type: "object",
        properties: {
          flowId: { type: "string", minLength: 1, maxLength: 100, description: "Exact local workflow id." },
          action: { type: "string", minLength: 1, maxLength: 80, pattern: "^[A-Za-z][A-Za-z0-9_]*$", description: "One currently available agent action." },
          input: { type: "object", maxProperties: 12, additionalProperties: true, description: "Action-specific input. Its selected transition schema performs the final validation." },
          expectedVersion: { type: "integer", minimum: 1, maximum: 1000000, description: "Current version returned by inspect_workflow_state." },
          requestId: { type: "string", minLength: 1, maxLength: 120, pattern: "^[a-zA-Z0-9][a-zA-Z0-9._:-]*$", description: "Unique idempotency id for this dispatch." },
        },
        required: ["flowId", "action", "expectedVersion", "requestId"],
        additionalProperties: false,
      },
      annotations: workflowMutationAnnotations,
      execute: safe(async (input) => {
        const result = await store.dispatchWorkflowTransition({
          flowId: stringValue(input, "flowId", { required: true, maxLength: 100 }),
          action: stringValue(input, "action", { required: true, maxLength: 80 }),
          input: objectValue(input, "input"),
          expectedVersion: integerValue(input, "expectedVersion", { minimum: 1, maximum: 1000000, required: true }),
          requestId: requestIdValue(input),
        });
        return toolResponse(result, `Applied ${result.event.type}; workflow ${result.flow.id} is now ${result.state} at version ${result.version}.`);
      }, ["flowId", "action", "input", "expectedVersion", "requestId"]),
    },
    {
      name: "reset_workflow_state",
      title: "Reset one local workflow state",
      description: "Reset one local workflow to its declared initial state using the exact observed version and a unique request id. Existing history remains available.",
      inputSchema: {
        type: "object",
        properties: {
          flowId: { type: "string", minLength: 1, maxLength: 100, description: "Exact local workflow id." },
          expectedVersion: { type: "integer", minimum: 1, maximum: 1000000, description: "Current version returned by inspect_workflow_state." },
          requestId: { type: "string", minLength: 1, maxLength: 120, pattern: "^[a-zA-Z0-9][a-zA-Z0-9._:-]*$", description: "Unique idempotency id for this reset." },
        },
        required: ["flowId", "expectedVersion", "requestId"],
        additionalProperties: false,
      },
      annotations: workflowMutationAnnotations,
      execute: safe(async (input) => {
        const result = await store.resetWorkflowState({
          flowId: stringValue(input, "flowId", { required: true, maxLength: 100 }),
          expectedVersion: integerValue(input, "expectedVersion", { minimum: 1, maximum: 1000000, required: true }),
          requestId: requestIdValue(input),
        });
        return toolResponse(result, `Reset workflow ${result.flow.id} to ${result.state} at version ${result.version}; prior events remain in history.`);
      }, ["flowId", "expectedVersion", "requestId"]),
    },
  );

  const exchangeTools = createStructuredExchangeToolPair({
    id: "doctor_question_card",
    prepareTitle: "Prepare a doctor question card handoff",
    prepareDescription: "Resolve one UDI record, up to three related discussion-only records, and optional patient concerns into a bounded site-to-agent handoff. The result contains an instruction and exact response schema for a second tool call; it does not create clinical guidance.",
    prepareSchema: {
      type: "object",
      properties: {
        drugId: { type: "string", maxLength: 100, description: "Exact primary ClearDose UDI drug id." },
        relatedDrugIds: { type: "array", description: "Zero to three discussion-only ids returned by find_related_drugs. Omit to use up to two indexed suggestions.", minItems: 0, maxItems: 3, items: { type: "string", maxLength: 100 } },
        concerns: { type: "array", description: "Zero to six short fictional concern prompts used only during this call. Never enter real health information. ClearDose persists only the count, not the authored text.", minItems: 0, maxItems: 6, items: { type: "string", maxLength: 160 } },
      },
      required: ["drugId"],
      additionalProperties: false,
    },
    responseTitle: "Submit a doctor question card draft",
    responseDescription: "Submit the structured response for an existing ClearDose question-card exchange. This stores a local draft for human review and derives all displayed fictional price facts from the UDI rather than agent text.",
    responseSchema: doctorQuestionCardResponseSchema,
    prepareAnnotations: { readOnlyHint: false, untrustedContentHint: true },
    submitAnnotations: localMutationAnnotations,
    prepare: safe(async (input) => {
      const drugId = stringValue(input, "drugId", { required: true, maxLength: 100 });
      const relatedDrugIds = optionalStringArray(input, "relatedDrugIds", { maximum: 3, maxLength: 100 });
      const concerns = optionalStringArray(input, "concerns", { maximum: 6 });
      const exchange = await store.prepareDoctorQuestionCard({ drugId, relatedDrugIds, concerns });
      return toolResponse({
        ok: true,
        exchangeId: exchange.id,
        flowId: exchange.flowId,
        context: exchange.requestContext,
        instruction: exchange.instruction,
        expectedResponse: { toolName: "cleardose_submit_doctor_question_card_draft", schema: exchange.expectedResponseSchema },
      }, "Prepared a bounded question-card handoff. Follow the returned instruction and response schema to submit the draft.");
    }, ["drugId", "relatedDrugIds", "concerns"]),
    submit: safe(async (input) => {
      const exchangeId = stringValue(input, "exchangeId", { required: true, maxLength: 100 });
      const title = stringValue(input, "title", { required: true, maxLength: 90 });
      const questions = stringArray(input, "questions", { minimum: 2, maximum: 8 });
      const card = await store.submitDoctorQuestionCard({ exchangeId, title, questions });
      return toolResponse({ ok: true, card, visibleState: "human_review" }, `Stored a ${card.questions.length}-question local draft for patient review.`);
    }, ["exchangeId", "title", "questions"]),
  });
  tools.splice(11, 0, ...exchangeTools);

  tools.splice(13, 0, {
    name: "prepare_prescription_follow_up",
    title: "Prepare prescription-required follow-up",
    description: "Turn a prescription-required fulfillment gate into deterministic next steps and an editable prompt for patient review. This tool does not contact a prescriber, transfer a prescription, or make a clinical recommendation.",
    inputSchema: {
      type: "object",
      properties: {
        drugId: { type: "string", maxLength: 100, description: "Exact ClearDose UDI drug id." },
        preferredPath: { type: "string", maxLength: 30, enum: ["prescriber_send", "transfer", "on_file", "undecided"], default: "undecided", description: "Patient-selected administrative path." },
        questions: { type: "array", minItems: 0, maxItems: 6, items: { type: "string", maxLength: 160 }, description: "Optional short questions to preserve in the editable handoff." },
      },
      required: ["drugId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    execute: safe(async (input) => {
      const drugId = stringValue(input, "drugId", { required: true, maxLength: 100 });
      const preferredPath = stringValue(input, "preferredPath", { maxLength: 30 }) || "undecided";
      if (!["prescriber_send", "transfer", "on_file", "undecided"].includes(preferredPath)) throw new ToolInputError("preferredPath is not supported.", { field: "preferredPath" });
      const questions = optionalStringArray(input, "questions", { maximum: 6 });
      const followUp = await store.preparePrescriptionFollowUp({ drugId, preferredPath, questions });
      return toolResponse({ ok: true, followUp, visibleState: "human_review" }, "Prepared editable prescription follow-up steps for patient review; no external action was taken.");
    }, ["drugId", "preferredPath", "questions"]),
  });

  tools.splice(14, 0, {
    name: "prepare_agent_memory_packet",
    title: "Prepare a user-controlled agent memory packet",
    description: "Create a bounded Markdown and structured context packet for the user to review, edit, copy, or save locally. The tool does not write to an external agent memory or filesystem automatically.",
    inputSchema: {
      type: "object",
      properties: {
        label: { type: "string", maxLength: 100 }, goal: { type: "string", maxLength: 500 },
        facts: { type: "array", minItems: 0, maxItems: 12, items: { type: "string", maxLength: 240 } },
        decisions: { type: "array", minItems: 0, maxItems: 12, items: { type: "string", maxLength: 240 } },
        nextSteps: { type: "array", minItems: 0, maxItems: 12, items: { type: "string", maxLength: 240 } },
        flowIds: { type: "array", minItems: 0, maxItems: 12, items: { type: "string", maxLength: 120 } },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    execute: safe(async (input) => {
      const packet = await store.prepareAgentMemoryPacket({
        label: stringValue(input, "label", { maxLength: 100 }) || "ClearDose demo memory",
        goal: stringValue(input, "goal", { maxLength: 500 }),
        facts: optionalStringArray(input, "facts", { maximum: 12 }), decisions: optionalStringArray(input, "decisions", { maximum: 12 }),
        nextSteps: optionalStringArray(input, "nextSteps", { maximum: 12 }), flowIds: optionalStringArray(input, "flowIds", { maximum: 12 }),
      });
      return toolResponse({ ok: true, packet, visibleState: "human_review" }, "Prepared a local memory packet. The user must review and explicitly copy or save it.");
    }, ["label", "goal", "facts", "decisions", "nextSteps", "flowIds"]),
  });

  const executableTools = !workflowRuntime ? tools : tools.map((tool) => ({
    ...tool,
    execute: (input) => workflowRuntime.runTool(tool.name, input, () => tool.execute(input)),
  }));
  return decorateToolDefinitions(executableTools);
}
