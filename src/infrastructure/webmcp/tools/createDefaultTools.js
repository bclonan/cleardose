import { toolError, toolResponse } from "../toolResponse";

export function createDefaultTools({ store }) {
  return [
    {
      name: "search_medications",
      title: "Search ClearDose medications",
      description: "Search the fictional ClearDose catalog by generic name, brand name, or category and return transparent mock prices.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Medication, brand, or category search text.", maxLength: 100 },
          category: { type: "string", description: "Optional exact ClearDose category." },
          sort: { type: "string", enum: ["name", "price", "savings"], default: "name" },
          limit: { type: "integer", minimum: 1, maximum: 20, default: 10 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute({ query = "", category = "All medications", sort = "name", limit = 10 } = {}) {
        const medications = store.searchMedications({ query, category, sort }).slice(0, limit);
        return toolResponse({ ok: true, count: medications.length, medications }, `Found ${medications.length} ClearDose medication${medications.length === 1 ? "" : "s"}.`);
      },
    },
    {
      name: "get_medication",
      title: "Get ClearDose medication details",
      description: "Return variants, mock price, typical retail price, and savings for one fictional ClearDose medication.",
      inputSchema: {
        type: "object",
        properties: {
          medicationId: { type: "string", description: "ClearDose medication id such as med_lisinopril." },
          slug: { type: "string", description: "ClearDose URL slug such as lisinopril." },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute({ medicationId, slug } = {}) {
        const medication = medicationId ? store.medicationById(medicationId) : store.medicationBySlug(slug);
        if (!medication) return toolError("Medication not found.", { medicationId, slug });
        return toolResponse({ ok: true, medication }, `Returned ${medication.name} with ${medication.variants.length} mock price options.`);
      },
    },
    {
      name: "get_cart",
      title: "Read the ClearDose cart",
      description: "Read the current fictional ClearDose cart and transparent mock totals without changing it.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      async execute() {
        return toolResponse({
          ok: true,
          items: store.state.cart,
          itemCount: store.cartCount,
          subtotal: store.cartSubtotal,
          shipping: store.shipping,
          total: store.cartTotal,
        }, `The ClearDose cart contains ${store.cartCount} item${store.cartCount === 1 ? "" : "s"}.`);
      },
    },
    {
      name: "add_to_cart",
      title: "Add a ClearDose medication to cart",
      description: "Add one fictional medication variant to the current ClearDose mock cart. This changes only local demo state.",
      inputSchema: {
        type: "object",
        properties: {
          medicationId: { type: "string", description: "ClearDose medication id." },
          variantId: { type: "string", description: "Exact variant id returned by a catalog tool." },
        },
        required: ["medicationId", "variantId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute({ medicationId, variantId }) {
        const added = store.addToCart(medicationId, variantId);
        if (!added) return toolError("Medication or variant not found.", { medicationId, variantId });
        return toolResponse({ ok: true, itemCount: store.cartCount, total: store.cartTotal }, "Added the medication to the ClearDose mock cart.");
      },
    },
  ];
}
