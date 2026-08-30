import { computed, markRaw, reactive, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { buildPrescriptionFollowUp } from "../services/api/recovery/recoveryGuidance";
import { demoScenarios, getDemoScenario, getDemoScenariosForRoute } from "../services/api/demos/demoScenarios";
import { capabilityReplayScenarioId, createCapabilityReplayScenario } from "../services/api/demos/capabilityReplayScenario";
import { hackathonShortcuts } from "../services/api/shortcuts/hackathonShortcuts";
import { capabilityCatalog, capabilityCategories, getCapability } from "../infrastructure/webmcp/catalog/capabilityCatalog";

const EXPLORER_LIMITS = Object.freeze({ maxArrayLength: 40, maxDepth: 6, maxObjectKeys: 60, maxStringLength: 800 });
const EXPLORER_TRANSIENT_LIMITS = Object.freeze({ ...EXPLORER_LIMITS, maxStringLength: 16000 });
const SENSITIVE_EXPLORER_KEY = /(?:password|passcode|secret|token|authorization|cookie|api[_-]?key|member|subscriber|policy[-_]?(?:id|number)|insurance[-_]?(?:id|member)|card[-_]?number|security[-_]?code|session[-_]?id|patient[-_]?(?:name|email|phone|dob)|customer[-_]?(?:name|email|phone)|provider[-_]?(?:name|email|phone)|address|postal|zip|date[-_]?of[-_]?birth)/i;
const SENSITIVE_EXPLORER_TEXT = /(?:password|passcode|secret|token|authorization|api[_-]?key|member(?:id|number)?|subscriber|policy(?:id|number))\s*(?:=|:)\s*/i;
const AUTHORED_EXPLORER_KEY = /^(?:concerns?|questions?|title|goal|facts?|decisions?|nextSteps?|notes?|prompt|instruction|content|guide|markdown|body|description|examplePrompt|voiceGuide)$/i;
const AUTHORED_EXPLORER_TEXT = /(?:concerns?|questions?|title|goal|facts?|decisions?|nextSteps?|notes?|prompt|instruction|content|guide|markdown|body|description|examplePrompt|voiceGuide)["']?\s*(?:=|:)\s*/i;

function redactedExplorerValue(value) {
  if (Array.isArray(value)) return value.slice(0, EXPLORER_LIMITS.maxArrayLength).map(() => "[redacted]");
  if (value && typeof value === "object") return { redacted: true };
  return "[redacted]";
}

function redactExplorerText(value, maximum = EXPLORER_LIMITS.maxStringLength) {
  return String(value)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [redacted]")
    .replace(/((?:password|passcode|secret|token|authorization|api[_-]?key|member(?:id|number)?|subscriber|policy(?:id|number))\s*(?:=|:)\s*)(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gi, "$1[redacted]")
    .replace(/\b(?:Bearer\s+)?(?:sk|pk|ghp|github_pat)[-_A-Za-z0-9.]{12,}\b/gi, "[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .slice(0, maximum);
}

export function sanitizeExplorerValue(value, { depth = 0, seen = new WeakSet(), limits = EXPLORER_LIMITS, redactAuthored = false, redactSensitive = true } = {}) {
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "string") return redactSensitive ? redactExplorerText(value, limits.maxStringLength) : value.slice(0, limits.maxStringLength);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString().slice(0, limits.maxStringLength);
  if (typeof value !== "object") return redactSensitive ? redactExplorerText(String(value), limits.maxStringLength) : String(value).slice(0, limits.maxStringLength);
  if (depth >= limits.maxDepth) return "[bounded]";
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (value instanceof Date) {
    const result = value.toISOString();
    seen.delete(value);
    return result;
  }
  if (Array.isArray(value)) {
    const result = value.slice(0, limits.maxArrayLength).map((item) => sanitizeExplorerValue(item, { depth: depth + 1, seen, limits, redactAuthored, redactSensitive }));
    seen.delete(value);
    return result;
  }
  const result = {};
  for (const [key, item] of Object.entries(value).slice(0, limits.maxObjectKeys)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) continue;
    result[key] = (redactSensitive && SENSITIVE_EXPLORER_KEY.test(key)) || (redactAuthored && AUTHORED_EXPLORER_KEY.test(key))
      ? redactedExplorerValue(item)
      : sanitizeExplorerValue(item, { depth: depth + 1, seen, limits, redactAuthored, redactSensitive });
  }
  seen.delete(value);
  return result;
}

export function sanitizeExplorerJsonText(value, { invalid = false } = {}) {
  const text = String(value ?? "");
  if (invalid && (SENSITIVE_EXPLORER_TEXT.test(text) || SENSITIVE_EXPLORER_KEY.test(text) || AUTHORED_EXPLORER_TEXT.test(text))) {
    return JSON.stringify({ redacted: "Sensitive values were removed from invalid JSON." }, null, 2);
  }
  return redactExplorerText(text, 12_000);
}

export function sanitizeExplorerInvocationValue(value) {
  return sanitizeExplorerValue(value, { limits: EXPLORER_TRANSIENT_LIMITS, redactSensitive: false });
}

const emptyState = () => ({
  currentCustomerId: null,
  currentCustomer: null,
  medications: [],
  categories: [],
  drugClasses: [],
  drugIndexSummary: null,
  cart: [],
  orders: [],
  prescriptions: [],
});

export const usePharmacyStore = defineStore("pharmacy", () => {
  const state = reactive(emptyState());
  const initialized = ref(false);
  const facade = shallowRef(null);
  const toolRegistryRef = shallowRef(null);
  const workflowRuntime = shallowRef(null);
  const replayRuntime = shallowRef(null);
  const declarativeToolRunner = shallowRef(null);
  const capabilityTemplateService = shallowRef(null);
  const webMcp = reactive({ supported: false, status: "idle", available: 0, registered: 0, tools: [] });
  const workflow = reactive({
    database: { engine: "duckdb-wasm", persistence: "initializing", state: "idle", drugCount: 0 },
    definitions: [],
    scenarios: [],
    flows: [],
    events: [],
    exchanges: [],
    cards: [],
    artifacts: [],
    memoryPackets: [],
  });
  const selectedFlowId = ref("");
  const capabilityTemplates = reactive({ initialized: false, templates: [], statuses: {} });
  const replay = reactive({
    status: "idle", scenarioId: "", route: "", runId: "", workflowFlowId: "",
    currentStepIndex: -1, nextStepIndex: 0, startedAt: "", completedAt: "",
    totalElapsedMs: 0, steps: [], error: null, warnings: [],
  });
  const explorer = reactive({ invoking: false, lastInvocation: null });
  const demoLab = reactive({ open: false, tab: "prompts", selectedScenarioId: "", selectedToolName: "" });

  const currentCustomer = computed(() => state.currentCustomer);
  const medications = computed(() => state.medications);
  const categories = computed(() => state.categories);
  const cartCount = computed(() => state.cart.reduce((sum, item) => sum + item.units, 0));
  const cartSubtotal = computed(() => state.cart.reduce((sum, item) => sum + item.price * item.units, 0));
  const shipping = computed(() => (state.cart.length ? 5 : 0));
  const cartTotal = computed(() => cartSubtotal.value + shipping.value);

  function configure({ facade: nextFacade, toolRegistry, workflowRuntime: nextWorkflowRuntime, replayRuntime: nextReplayRuntime, declarativeToolRunner: nextDeclarativeToolRunner, capabilityTemplateService: nextTemplateService }) {
    facade.value = markRaw(nextFacade);
    toolRegistryRef.value = toolRegistry ? markRaw(toolRegistry) : null;
    toolRegistry?.subscribe((snapshot) => Object.assign(webMcp, snapshot));
    if (nextWorkflowRuntime) {
      workflowRuntime.value = markRaw(nextWorkflowRuntime);
      nextWorkflowRuntime.subscribe((snapshot) => {
        Object.assign(workflow, snapshot);
        if (!selectedFlowId.value && snapshot.flows[0]) selectedFlowId.value = snapshot.flows[0].id;
      });
    }
    if (nextReplayRuntime) {
      replayRuntime.value = markRaw(nextReplayRuntime);
      nextReplayRuntime.subscribe((snapshot) => Object.assign(replay, snapshot));
    }
    if (nextDeclarativeToolRunner) declarativeToolRunner.value = markRaw(nextDeclarativeToolRunner);
    if (nextTemplateService) {
      capabilityTemplateService.value = markRaw(nextTemplateService);
      nextTemplateService.subscribe((snapshot) => Object.assign(capabilityTemplates, snapshot));
    }
  }

  function refresh() {
    if (!facade.value) throw new Error("ClearDose facade is not configured. Install the ClearDose plugin before mounting.");
    Object.assign(state, facade.value.getSnapshot().state);
    initialized.value = true;
    return state;
  }

  function afterMutation(result) { refresh(); return result; }
  function searchMedications(filters) { return facade.value.searchMedications(filters); }
  function medicationById(id) { return facade.value.medicationById(id); }
  function medicationBySlug(slug) { return facade.value.medicationBySlug(slug); }
  function searchDrugIndex(input) { return facade.value.searchDrugIndex(input); }
  function drugIndexEntry(drugId) { return facade.value.drugIndexEntry(drugId); }
  function compareDrugPrices(input) { return facade.value.compareDrugPrices(input); }
  function listCompatibleOptions(input) { return facade.value.listCompatibleOptions(input); }
  function compareMedicationOptions(input) { return facade.value.compareMedicationOptions(input); }
  function getDrugAvailability(input) { return facade.value.getDrugAvailability(input); }
  function compareDrugAvailability(input) { return facade.value.compareDrugAvailability(input); }
  function estimateDelivery(input) { return facade.value.estimateDelivery(input); }
  function findRelatedDrugs(input) { return facade.value.findRelatedDrugs(input); }
  function reviewInteractionFlags(input) { return facade.value.reviewInteractionFlags(input); }
  function buildProcurementPlan(input) { return facade.value.buildProcurementPlan(input); }
  function compareMedications(input) { return facade.value.compareMedications(input); }
  function addToCart(medicationId, variantId) { return afterMutation(facade.value.addToCart(medicationId, variantId)); }
  function removeFromCart(variantId) { facade.value.removeFromCart(variantId); refresh(); }
  function setCartUnits(variantId, units) { facade.value.setCartUnits(variantId, units); refresh(); }
  function authenticate(email, password) { return afterMutation(facade.value.authenticate(email, password)); }
  function createCustomer(input) { return afterMutation(facade.value.createCustomer(input)); }
  function updateCurrentCustomer(changes) { return afterMutation(facade.value.updateCurrentCustomer(changes)); }
  function logout() { facade.value.logout(); refresh(); }
  function placeOrder(input) { return afterMutation(facade.value.placeOrder(input)); }
  function resetDemo() { facade.value.resetDemo(); refresh(); }
  function customerOrders() { return state.orders.filter((order) => order.customerId === state.currentCustomerId); }
  function customerPrescriptions() { return state.prescriptions.filter((item) => item.customerId === state.currentCustomerId); }
  function selectWorkflow(flowId) { selectedFlowId.value = String(flowId || ""); }
  function seededRuntime() {
    if (!workflowRuntime.value) throw new Error("The seeded local drug index is not configured.");
    return workflowRuntime.value;
  }
  function inspectWorkflow(input) { return workflowRuntime.value?.inspect(input) ?? { database: workflow.database, flows: [], events: [], cards: [] }; }
  function inspectWorkflowState(input) { return workflowRuntime.value?.inspectState(input) ?? null; }
  function getWorkflowHistory(input) { return workflowRuntime.value?.getHistory(input) ?? { events: [] }; }
  function getAvailableWorkflowActions(input) { return workflowRuntime.value?.getAvailableActions(input) ?? { valid: [], disabled: [] }; }
  function getWorkflowTransition(input) { return workflowRuntime.value?.getTransition(input) ?? null; }
  async function dispatchWorkflowTransition(input) {
    if (!workflowRuntime.value) throw new Error("Workflow runtime is not configured.");
    return workflowRuntime.value.dispatch(input);
  }
  async function resetWorkflowState(input) {
    if (!workflowRuntime.value) throw new Error("Workflow runtime is not configured.");
    return workflowRuntime.value.resetFlow(input);
  }

  async function searchLocalDrugIndex(input) {
    const drugs = await seededRuntime().querySeededDrugs(input);
    return drugs.map((drug) => ({ id: drug.id, udi: drug.identifiers?.udi, name: drug.name, genericFor: drug.genericFor, category: drug.category, drugClass: drug.drugClass, fromPrice: Math.min(...drug.variants.map((item) => item.price)), variantCount: drug.variants.length }));
  }

  async function localDrugIndexEntry(drugId) {
    return seededRuntime().getSeededDrug(drugId);
  }

  async function compareLocalDrugPrices(input) { return seededRuntime().compareSeededDrugPrices(input); }
  async function findLocalRelatedDrugs(input) { return seededRuntime().findSeededRelatedDrugs(input); }
  async function listLocalCompatibleOptions(input) { return seededRuntime().listSeededCompatibleOptions(input); }
  async function compareLocalMedicationOptions(input) { return seededRuntime().compareSeededMedicationOptions(input); }
  async function getLocalDrugAvailability(input) { return seededRuntime().getSeededDrugAvailability(input); }
  async function compareLocalDrugAvailability(input) { return seededRuntime().compareSeededDrugAvailability(input); }
  async function estimateLocalDelivery(input) { return seededRuntime().estimateSeededDelivery(input); }
  async function reviewLocalInteractionFlags(input) { return seededRuntime().reviewSeededInteractionFlags(input); }
  async function buildLocalProcurementPlan(input) { return seededRuntime().buildSeededProcurementPlan(input); }

  async function addLocalDrugToCart(drugId, variantId) {
    const drug = await seededRuntime().getSeededDrug(drugId);
    const packageExists = drug?.variants?.some((variant) => variant.id === variantId);
    if (!packageExists) return { added: false, drug };
    return { added: Boolean(afterMutation(facade.value.addToCart(drugId, variantId))), drug };
  }

  async function startWorkflow(input) {
    if (!workflowRuntime.value) throw new Error("Workflow runtime is not configured.");
    const flow = await workflowRuntime.value.startFlow(input);
    selectedFlowId.value = flow.id;
    return flow;
  }

  async function transitionWorkflow(flowId, input) {
    if (!workflowRuntime.value) throw new Error("Workflow runtime is not configured.");
    return workflowRuntime.value.transition(flowId, input);
  }

  async function prepareDoctorQuestionCard({ drugId, relatedDrugIds = [], concerns = [] }) {
    const runtime = seededRuntime();
    const primaryDrug = await runtime.getSeededDrug(drugId);
    if (!primaryDrug) throw new TypeError(`Unknown UDI drug id: ${drugId}.`);
    const suggested = (await runtime.findSeededRelatedDrugs({ drugId, limit: 6 })).related;
    const selectedIds = relatedDrugIds.length ? new Set(relatedDrugIds) : new Set(suggested.slice(0, 2).map((drug) => drug.id));
    const relatedDrugs = suggested.filter((drug) => selectedIds.has(drug.id)).slice(0, 3);
    if (relatedDrugIds.some((id) => !relatedDrugs.some((drug) => drug.id === id))) {
      throw new TypeError("Every relatedDrugId must be a discussion-only record returned for the primary drug.");
    }
    const exchange = await runtime.prepareDoctorQuestionCard({ primaryDrug, relatedDrugs, concerns });
    selectedFlowId.value = exchange.flowId;
    return exchange;
  }

  async function submitDoctorQuestionCard(input) {
    if (!workflowRuntime.value) throw new Error("Workflow runtime is not configured.");
    const card = await workflowRuntime.value.submitDoctorQuestionCard(input);
    selectedFlowId.value = card.flowId;
    return card;
  }

  async function markQuestionCardReviewed(cardId) {
    if (!workflowRuntime.value) throw new Error("Workflow runtime is not configured.");
    return workflowRuntime.value.markCardReviewed(cardId);
  }

  async function clearWorkflowLab() {
    if (!workflowRuntime.value) return;
    await workflowRuntime.value.clear();
    const snapshot = await workflowRuntime.value.seedDemoFlows();
    selectedFlowId.value = snapshot.flows.find((flow) => flow.definitionId === "state-interaction-demo")?.id ?? snapshot.flows[0]?.id ?? "";
  }

  async function runWorkflowScenario(scenarioId) {
    if (!workflowRuntime.value) throw new Error("Workflow runtime is not configured.");
    const flow = await workflowRuntime.value.runNegativeScenario(scenarioId);
    selectedFlowId.value = flow.id;
    return flow;
  }

  function openDemoLab(tab = "prompts", { scenarioId = "", toolName = "" } = {}) {
    demoLab.open = true;
    demoLab.tab = ["prompts", "replay", "state"].includes(tab) ? tab : "prompts";
    if (scenarioId) demoLab.selectedScenarioId = String(scenarioId);
    if (toolName) demoLab.selectedToolName = String(toolName);
  }

  function closeDemoLab() { demoLab.open = false; }

  function demoScenario(id) { return replayRuntime.value?.getScenario(id) ?? getDemoScenario(id); }
  function demoScenariosForRoute(route) { return getDemoScenariosForRoute(route); }
  function capabilityByName(name) { return getCapability(name); }

  function replayScenarioIdForCapability(capability) { return capabilityReplayScenarioId(capability); }

  function capabilityReplayScenario(capability, options = {}) {
    if (!replayRuntime.value) throw new Error("Programmatic replay is not configured.");
    const scenario = createCapabilityReplayScenario(capability, { route: options.route });
    replayRuntime.value.registerScenario(scenario);
    return scenario;
  }

  async function runCapabilityReplay(capability, options = {}) {
    const scenario = capabilityReplayScenario(capability, options);
    return runReplayScenario(scenario.id, { ...options, route: scenario.routes[0] });
  }

  async function runReplayScenario(scenarioId, options = {}) {
    if (!replayRuntime.value) throw new Error("Programmatic replay is not configured.");
    demoLab.selectedScenarioId = String(scenarioId);
    openDemoLab("replay", { scenarioId });
    return replayRuntime.value.run(scenarioId, options);
  }

  async function stepReplayScenario(scenarioId, options = {}) {
    if (!replayRuntime.value) throw new Error("Programmatic replay is not configured.");
    demoLab.selectedScenarioId = String(scenarioId || replay.scenarioId);
    openDemoLab("replay", { scenarioId: demoLab.selectedScenarioId });
    return replayRuntime.value.step(scenarioId || replay.scenarioId, options);
  }

  async function pauseReplay() { return replayRuntime.value?.pause(); }
  async function resumeReplay() { return replayRuntime.value?.resume(); }
  async function restartReplay(options = {}) { return replayRuntime.value?.restart(options); }
  async function resetReplay() { return replayRuntime.value?.reset(); }

  function replayObservation() {
    const selected = workflow.flows.find((flow) => flow.id === selectedFlowId.value) ?? workflow.flows[0] ?? null;
    return {
      cart: { itemCount: cartCount.value, subtotal: cartSubtotal.value, shipping: shipping.value, total: cartTotal.value },
      workflow: { selectedFlowId: selected?.id ?? "", state: selected?.state ?? "", version: selected?.eventCount ?? 0, flowCount: workflow.flows.length, eventCount: workflow.events.length },
      webMcp: { status: webMcp.status, available: webMcp.available, registered: webMcp.registered },
    };
  }

  async function invokeWebMcpTool(name, input = {}, { interactionModel = "imperative" } = {}) {
    explorer.invoking = true;
    const invocationInput = sanitizeExplorerInvocationValue(input ?? {});
    const startedAt = new Date().toISOString();
    const started = globalThis.performance?.now?.() ?? Date.now();
    const before = sanitizeExplorerValue(replayObservation());
    let response;
    let error = null;
    try {
      if (interactionModel === "declarative") {
        response = declarativeToolRunner.value?.invoke(name, invocationInput) ?? { ok: false, code: "DECLARATIVE_RUNNER_UNAVAILABLE", retryable: false };
      } else {
        if (!toolRegistryRef.value) throw new Error("WebMCP tool registry is not configured.");
        response = await toolRegistryRef.value.invoke(name, invocationInput, { source: "webmcp-explorer" });
      }
    } catch (caught) {
      error = sanitizeExplorerValue({
        code: caught?.code ?? "TOOL_INVOCATION_FAILED",
        message: "The local tool call failed. Use the code and retry guidance to correct the request.",
        ...(caught?.details && typeof caught.details === "object" ? { details: caught.details } : {}),
      }, { redactAuthored: true });
    }
    const after = sanitizeExplorerValue(replayObservation());
    const stateChanges = Object.keys(before).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map((key) => ({ key, source: "application-state", before: before[key], after: after[key] }));
    const safeResponse = response ? sanitizeExplorerValue(response, { redactAuthored: true }) : null;
    const domChanges = (safeResponse?.visibleForm?.changes ?? safeResponse?.structuredContent?.visibleForm?.changes ?? []).map((change) => ({
      key: `dom.${String(change.field || "field")}`,
      source: "visible-form",
      before: sanitizeExplorerValue(change.before),
      after: sanitizeExplorerValue(change.after),
    }));
    const changes = sanitizeExplorerValue([...stateChanges, ...domChanges]);
    const elapsedMs = Math.max(0, Math.round(((globalThis.performance?.now?.() ?? Date.now()) - started) * 100) / 100);
    explorer.lastInvocation = {
      id: `call_${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      toolName: String(name), interactionModel, mocked: true, path: "local-programmatic-invocation",
      request: sanitizeExplorerValue(invocationInput, { redactAuthored: true }), response: safeResponse, error,
      before, after, changes, startedAt, completedAt: new Date().toISOString(), elapsedMs,
    };
    explorer.invoking = false;
    demoLab.selectedToolName = String(name);
    return explorer.lastInvocation;
  }

  async function startHackathonShortcut(shortcut) {
    if (!workflowRuntime.value) throw new Error("Workflow runtime is not configured.");
    const flow = await workflowRuntime.value.startShortcut(shortcut);
    selectedFlowId.value = flow.id;
    return flow;
  }

  async function advanceHackathonShortcut(flowId, shortcut, index) {
    if (!workflowRuntime.value) throw new Error("Workflow runtime is not configured.");
    return workflowRuntime.value.advanceShortcut(flowId, shortcut, index);
  }

  async function completeHackathonShortcut(flowId) { return workflowRuntime.value?.completeShortcut(flowId); }

  async function recordDeclarativeForm(input) { return workflowRuntime.value?.recordDeclarativeForm(input); }

  async function preparePrescriptionFollowUp({ drugId, preferredPath = "undecided", questions = [] }) {
    if (!workflowRuntime.value) throw new Error("Workflow runtime is not configured.");
    const drug = await localDrugIndexEntry(drugId);
    if (!drug) throw new TypeError(`Unknown UDI drug id: ${drugId}.`);
    const guidance = buildPrescriptionFollowUp({ drug, preferredPath, questions });
    const result = await workflowRuntime.value.preparePrescriptionFollowUp(guidance);
    selectedFlowId.value = result.flowId;
    return result;
  }

  async function prepareAgentMemoryPacket(input) {
    if (!workflowRuntime.value) throw new Error("Workflow runtime is not configured.");
    const packet = await workflowRuntime.value.prepareMemoryPacket(input);
    selectedFlowId.value = packet.flowId;
    return packet;
  }

  async function markMemoryExported(packetId, method) { return workflowRuntime.value?.markMemoryExported(packetId, method); }

  function saveCapabilityTemplate(input) {
    if (!capabilityTemplateService.value) throw new Error("Capability template service is not configured.");
    return capabilityTemplateService.value.save(input);
  }
  function importCapabilityTemplate(input) { return capabilityTemplateService.value?.import(input); }
  function previewCapabilityTemplate(idOrTemplate, input) { return capabilityTemplateService.value?.render(idOrTemplate, input); }
  async function registerCapabilityTemplate(id) { return capabilityTemplateService.value?.register(id); }
  async function unregisterCapabilityTemplate(id) { return capabilityTemplateService.value?.unregister(id); }
  async function removeCapabilityTemplate(id) { return capabilityTemplateService.value?.remove(id); }
  async function runCapabilityTemplate(id, input) {
    const result = await capabilityTemplateService.value?.run(id, input);
    const flowId = result?.id?.startsWith?.("flow_") ? result.id : result?.structuredContent?.artifact?.flowId;
    if (flowId) selectedFlowId.value = flowId;
    return result;
  }
  async function advanceCapabilityWorkflow(flowId, template, stateIndex) {
    const index = Math.max(1, Math.min(template.states.length - 1, Number(stateIndex) || 1));
    return transitionWorkflow(flowId, { type: `USER_TEMPLATE_STATE_${index + 1}_ENTERED`, toState: template.states[index], context: { templateId: template.id, templateStateIndex: index }, source: "capability-studio" });
  }

  return {
    state,
    initialized,
    webMcp,
    workflow,
    replay,
    explorer,
    demoLab,
    demoScenarioCatalog: demoScenarios,
    hackathonShortcutCatalog: hackathonShortcuts,
    capabilityManifest: capabilityCatalog,
    capabilityCategoryManifest: capabilityCategories,
    capabilityTemplates,
    selectedFlowId,
    currentCustomer,
    medications,
    categories,
    cartCount,
    cartSubtotal,
    shipping,
    cartTotal,
    configure,
    refresh,
    searchMedications,
    medicationById,
    medicationBySlug,
    searchDrugIndex,
    drugIndexEntry,
    compareDrugPrices,
    listCompatibleOptions,
    compareMedicationOptions,
    getDrugAvailability,
    compareDrugAvailability,
    estimateDelivery,
    findRelatedDrugs,
    reviewInteractionFlags,
    buildProcurementPlan,
    compareMedications,
    addToCart,
    removeFromCart,
    setCartUnits,
    authenticate,
    createCustomer,
    updateCurrentCustomer,
    logout,
    placeOrder,
    resetDemo,
    customerOrders,
    customerPrescriptions,
    selectWorkflow,
    inspectWorkflow,
    inspectWorkflowState,
    getWorkflowHistory,
    getAvailableWorkflowActions,
    getWorkflowTransition,
    dispatchWorkflowTransition,
    resetWorkflowState,
    searchLocalDrugIndex,
    localDrugIndexEntry,
    compareLocalDrugPrices,
    findLocalRelatedDrugs,
    listLocalCompatibleOptions,
    compareLocalMedicationOptions,
    getLocalDrugAvailability,
    compareLocalDrugAvailability,
    estimateLocalDelivery,
    reviewLocalInteractionFlags,
    buildLocalProcurementPlan,
    addLocalDrugToCart,
    startWorkflow,
    transitionWorkflow,
    prepareDoctorQuestionCard,
    submitDoctorQuestionCard,
    markQuestionCardReviewed,
    clearWorkflowLab,
    runWorkflowScenario,
    openDemoLab,
    closeDemoLab,
    demoScenario,
    demoScenariosForRoute,
    capabilityByName,
    replayScenarioIdForCapability,
    capabilityReplayScenario,
    runCapabilityReplay,
    runReplayScenario,
    stepReplayScenario,
    pauseReplay,
    resumeReplay,
    restartReplay,
    resetReplay,
    replayObservation,
    invokeWebMcpTool,
    startHackathonShortcut,
    advanceHackathonShortcut,
    completeHackathonShortcut,
    recordDeclarativeForm,
    preparePrescriptionFollowUp,
    prepareAgentMemoryPacket,
    markMemoryExported,
    saveCapabilityTemplate,
    importCapabilityTemplate,
    previewCapabilityTemplate,
    registerCapabilityTemplate,
    unregisterCapabilityTemplate,
    removeCapabilityTemplate,
    runCapabilityTemplate,
    advanceCapabilityWorkflow,
  };
});

export function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}
