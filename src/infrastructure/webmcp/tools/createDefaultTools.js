import { toolError, toolResponse } from "../toolResponse.js";
import { createStructuredExchangeToolPair } from "../templates/createStructuredExchangeToolPair.js";
import { doctorQuestionCardResponseSchema } from "../../../services/api/workflows/doctorQuestionCardExchange.js";

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

function integerValue(input, key, { fallback, minimum = 1, maximum = 100 } = {}) {
  const value = input?.[key];
  if (value == null || value === "") return fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new ToolInputError(`${key} must be an integer from ${minimum} to ${maximum}.`, { field: key });
  }
  return value;
}

function stringArray(input, key, { minimum = 1, maximum = 10 } = {}) {
  const value = input?.[key];
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new ToolInputError(`${key} must contain ${minimum} to ${maximum} non-empty strings.`, { field: key });
  }
  return value.map((item) => item.trim());
}

function optionalStringArray(input, key, options = {}) {
  if (input?.[key] == null) return [];
  return stringArray(input, key, { minimum: 0, ...options });
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
    } catch (error) {
      const invalidInput = error instanceof ToolInputError || error instanceof TypeError;
      return toolError(error instanceof Error ? error.message : "The tool could not complete.", {
        code: invalidInput ? "INVALID_INPUT" : "TOOL_FAILURE",
        retryable: false,
        ...(error instanceof ToolInputError ? error.details : {}),
      });
    }
  };
}

const readOnlyAnnotations = Object.freeze({ readOnlyHint: true, untrustedContentHint: false });
const localMutationAnnotations = Object.freeze({ readOnlyHint: false, untrustedContentHint: false });

export function createDefaultTools({ store, highlightService, workflowRuntime }) {
  const tools = [
    {
      name: "search_drug_index",
      title: "Search the Universal Drug Index",
      description: "Search ClearDose's local fictional Universal Drug Index by generic name, brand, category, drug class, or UDI id. Use this when the user needs candidate records or exact drug ids for another tool.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Raw search text such as lisinopril, Lipitor, Statin, or udi:cleardose:lisinopril." },
          category: { type: "string", description: "Optional exact category returned by a prior search." },
          drugClass: { type: "string", description: "Optional exact drug class returned by a prior search." },
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
        const drugs = store.searchDrugIndex({ query, category, drugClass, limit });
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
          drugId: { type: "string", description: "Exact ClearDose UDI drug id such as med_lisinopril." },
        },
        required: ["drugId"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const drugId = stringValue(input, "drugId", { required: true, maxLength: 100 });
        const drug = store.drugIndexEntry(drugId);
        if (!drug) throw new ToolInputError(`Unknown UDI drug id: ${drugId}.`, { field: "drugId" });
        return toolResponse({ ok: true, drug }, `Returned ${drug.name} with ${drug.variants.length} fictional package variants.`);
      }, ["drugId"]),
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
            items: { type: "string" },
          },
          strength: { type: "string", description: "Optional exact strength, such as 10mg. If unavailable, the tool returns the closest indexed package and names it explicitly." },
          quantity: { type: "integer", description: "Optional package quantity. If unavailable, the tool returns the closest indexed package and names it explicitly.", minimum: 1, maximum: 365 },
        },
        required: ["drugIds"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const drugIds = stringArray(input, "drugIds", { minimum: 1, maximum: 4 });
        const strength = stringValue(input, "strength", { maxLength: 40 });
        const quantity = integerValue(input, "quantity", { fallback: undefined, maximum: 365 });
        const comparison = store.compareDrugPrices({ drugIds, strength, quantity });
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
          drugId: { type: "string", description: "Exact ClearDose UDI drug id returned by search_drug_index." },
          limit: { type: "integer", description: "Maximum related records to return.", minimum: 1, maximum: 12, default: 6 },
        },
        required: ["drugId"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const drugId = stringValue(input, "drugId", { required: true, maxLength: 100 });
        const limit = integerValue(input, "limit", { fallback: 6, maximum: 12 });
        const result = store.findRelatedDrugs({ drugId, limit });
        return toolResponse({ ok: true, ...result }, `Found ${result.related.length} related demo index entr${result.related.length === 1 ? "y" : "ies"}.`);
      }, ["drugId", "limit"]),
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
            items: { type: "string" },
          },
        },
        required: ["drugIds"],
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: safe(async (input) => {
        const drugIds = stringArray(input, "drugIds", { minimum: 2, maximum: 10 });
        const review = store.reviewInteractionFlags({ drugIds });
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
                drugId: { type: "string", description: "Exact UDI drug id returned by search_drug_index." },
                strength: { type: "string", description: "Optional exact indexed strength." },
                quantity: { type: "integer", description: "Optional exact indexed package quantity.", minimum: 1, maximum: 365 },
              },
              required: ["drugId"],
              additionalProperties: false,
            },
          },
          strategy: {
            type: "string",
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
        const plan = store.buildProcurementPlan({ items, strategy });
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
          drugId: { type: "string", description: "Exact UDI drug id returned by get_drug_index_entry." },
          variantId: { type: "string", description: "Exact package variant id returned by get_drug_index_entry." },
        },
        required: ["drugId", "variantId"],
        additionalProperties: false,
      },
      annotations: localMutationAnnotations,
      execute: safe(async (input) => {
        const drugId = stringValue(input, "drugId", { required: true, maxLength: 100 });
        const variantId = stringValue(input, "variantId", { required: true, maxLength: 140 });
        const added = store.addToCart(drugId, variantId);
        if (!added) throw new ToolInputError("The UDI drug or package variant was not found.", { field: "variantId" });
        return toolResponse({ ok: true, itemCount: store.cartCount, total: store.cartTotal }, "Added the indexed package to the local fictional cart.");
      }, ["drugId", "variantId"]),
    },
  ];

  tools.splice(6, 0, {
    name: "inspect_workflow_runtime",
    title: "Inspect local workflow runtime",
    description: "Read recent ClearDose workflow instances, transitions, bounded context snapshots, generated cards, and the local DuckDB-Wasm status. Use this to explain what the site and agent have completed without changing state.",
    inputSchema: {
      type: "object",
      properties: {
        flowId: { type: "string", description: "Optional exact flow id. Omit it to inspect concurrent recent flows." },
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
  });

  const exchangeTools = createStructuredExchangeToolPair({
    id: "doctor_question_card",
    prepareTitle: "Prepare a doctor question card handoff",
    prepareDescription: "Resolve one UDI record, up to three related discussion-only records, and optional patient concerns into a bounded site-to-agent handoff. The result contains an instruction and exact response schema for a second tool call; it does not create clinical guidance.",
    prepareSchema: {
      type: "object",
      properties: {
        drugId: { type: "string", description: "Exact primary ClearDose UDI drug id." },
        relatedDrugIds: { type: "array", description: "Zero to three discussion-only ids returned by find_related_drugs. Omit to use up to two indexed suggestions.", minItems: 0, maxItems: 3, items: { type: "string" } },
        concerns: { type: "array", description: "Zero to six short patient concerns to transform into neutral questions, not instructions or diagnoses.", minItems: 0, maxItems: 6, items: { type: "string", maxLength: 160 } },
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
      const relatedDrugIds = optionalStringArray(input, "relatedDrugIds", { maximum: 3 });
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
  tools.splice(7, 0, ...exchangeTools);

  if (!workflowRuntime) return tools;
  return tools.map((tool) => ({
    ...tool,
    execute: (input) => workflowRuntime.runTool(tool.name, input, () => tool.execute(input)),
  }));
}
