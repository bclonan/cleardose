const categoryDefinitions = Object.freeze([
  { id: "discovery-and-pricing", label: "Discovery & pricing", description: "Local UDI search, price facts, related records, and synthetic review flags." },
  { id: "patient-and-clinician", label: "Patient & clinician", description: "Bounded handoffs, prescription recovery, and human-reviewed discussion documents." },
  { id: "shopping-and-procurement", label: "Shopping & procurement", description: "Fictional planning and resettable local cart operations." },
  { id: "dynamic-documents-and-memory", label: "Documents & memory", description: "Editable, user-controlled artifacts that never leave the browser without a user action." },
  { id: "interface-and-observability", label: "Interface & observability", description: "Shared focus, live state, events, and bounded context inspection." },
  { id: "declarative-forms", label: "Declarative forms", description: "Visible HTML forms exposed through declarative WebMCP attributes." },
  { id: "user-generated", label: "User-created", description: "Locally authored workflow and document-tool templates that require review before loading." },
]);

function tool(id, category, prompt, { kind = "static", role = "patient" } = {}) {
  return Object.freeze({
    id: `cleardose.${category}.${id}`,
    toolName: id,
    qualifiedName: `cleardose_${id}`,
    category,
    interactionModel: "imperative",
    examplePrompt: prompt,
    machine: Object.freeze({ id: `machine.tool.${id.replaceAll("_", "-")}.v1`, kind, role, states: Object.freeze(["queued", "running", "complete", "error"]) }),
  });
}

function form(id, category, prompt, route) {
  return Object.freeze({
    id: `cleardose.${category}.${id}`,
    toolName: id,
    qualifiedName: id,
    category,
    interactionModel: "declarative",
    route,
    examplePrompt: prompt,
    machine: Object.freeze({ id: `machine.form.${id.replaceAll("_", "-")}.v1`, kind: "static", role: "patient", states: Object.freeze(["idle", "editing", "validating", "ready", "rejected"]) }),
  });
}

export const capabilityCatalog = Object.freeze([
  tool("search_drug_index", "discovery-and-pricing", "Find lisinopril in the local ClearDose drug index."),
  tool("get_drug_index_entry", "discovery-and-pricing", "Show the exact indexed packages for med_lisinopril."),
  tool("compare_drug_prices", "discovery-and-pricing", "Compare fictional prices for lisinopril and losartan without calling them substitutes."),
  tool("find_related_drugs", "discovery-and-pricing", "Find discussion-only records related to lisinopril so I can prepare doctor questions."),
  tool("review_demo_interaction_flags", "discovery-and-pricing", "Review the synthetic flags for sildenafil and isosorbide mononitrate and state the coverage limit."),
  tool("prepare_doctor_question_card_request", "patient-and-clinician", "Prepare a bounded doctor question-card handoff for lisinopril."),
  tool("submit_doctor_question_card_draft", "patient-and-clinician", "Use the prepared exchange schema to return two neutral questions for human review.", { role: "agent" }),
  tool("prepare_prescription_follow_up", "patient-and-clinician", "My lisinopril order says prescription required. Prepare editable next steps; do not contact anyone."),
  tool("build_procurement_plan", "shopping-and-procurement", "Build a lowest-total fictional procurement plan for lisinopril and atorvastatin. Do not order."),
  tool("get_cart", "shopping-and-procurement", "Read my local mock cart and total without exposing profile data."),
  tool("add_to_cart", "shopping-and-procurement", "Add the exact indexed lisinopril package I selected to the local demo cart."),
  tool("prepare_agent_memory_packet", "dynamic-documents-and-memory", "Create a reviewable memory packet for this demo with facts, decisions, next steps, and flow references.", { kind: "dynamic" }),
  tool("inspect_workflow_runtime", "interface-and-observability", "Show current ClearDose flows, recent event ids, states, and bounded context."),
  tool("highlight_section", "interface-and-observability", "Highlight the visible workflow runtime so we can inspect the same section."),
  form("navigate_to_drug_search", "declarative-forms", "Fill the header medication search with lisinopril and submit it.", "global"),
  form("navigate_to_mobile_drug_search", "declarative-forms", "Fill the mobile medication search with lisinopril and submit it.", "global"),
  form("navigate_to_home_drug_search", "declarative-forms", "Use the home search to find atorvastatin.", "/"),
  form("filter_visible_drug_index", "declarative-forms", "Filter the visible UDI to statins.", "/udi"),
  form("filter_visible_medication_catalog", "declarative-forms", "Filter the visible medication catalog to blood pressure.", "/medications"),
  form("prepare_provider_note", "declarative-forms", "Fill a fictional provider-routing note for my review; do not send it.", "/contact-doctor"),
  form("populate_question_card_demo", "declarative-forms", "Populate the visible question-card demo with lisinopril.", "/flow-lab"),
  form("compose_dynamic_capability_template", "declarative-forms", "Fill the Capability Studio with a reviewable workflow or document-tool template. Do not register it automatically.", "/studio"),
]);

const byToolName = new Map(capabilityCatalog.map((item) => [item.toolName, item]));
const byQualifiedName = new Map(capabilityCatalog.map((item) => [item.qualifiedName, item]));

export const capabilityCategories = categoryDefinitions;

export function getCapability(name) {
  const value = String(name || "");
  return byToolName.get(value.replace(/^cleardose_/, "")) ?? byQualifiedName.get(value) ?? null;
}

export function groupCapabilities(items = capabilityCatalog) {
  return categoryDefinitions.map((category) => ({ ...category, capabilities: items.filter((item) => item.category === category.id) }));
}

export function decorateToolDefinitions(definitions) {
  return definitions.map((definition) => {
    const capability = getCapability(definition.name);
    if (!capability) throw new TypeError(`Missing capability catalog entry for ${definition.name}.`);
    return { ...definition, capabilityId: capability.id, category: capability.category, interactionModel: capability.interactionModel, machine: capability.machine, examplePrompt: capability.examplePrompt };
  });
}
