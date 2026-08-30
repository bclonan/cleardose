import { computed, markRaw, reactive, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { buildPrescriptionFollowUp } from "../services/api/recovery/recoveryGuidance";

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
  const workflowRuntime = shallowRef(null);
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

  const currentCustomer = computed(() => state.currentCustomer);
  const medications = computed(() => state.medications);
  const categories = computed(() => state.categories);
  const cartCount = computed(() => state.cart.reduce((sum, item) => sum + item.units, 0));
  const cartSubtotal = computed(() => state.cart.reduce((sum, item) => sum + item.price * item.units, 0));
  const shipping = computed(() => (state.cart.length ? 5 : 0));
  const cartTotal = computed(() => cartSubtotal.value + shipping.value);

  function configure({ facade: nextFacade, toolRegistry, workflowRuntime: nextWorkflowRuntime, capabilityTemplateService: nextTemplateService }) {
    facade.value = markRaw(nextFacade);
    toolRegistry?.subscribe((snapshot) => Object.assign(webMcp, snapshot));
    if (nextWorkflowRuntime) {
      workflowRuntime.value = markRaw(nextWorkflowRuntime);
      nextWorkflowRuntime.subscribe((snapshot) => {
        Object.assign(workflow, snapshot);
        if (!selectedFlowId.value && snapshot.flows[0]) selectedFlowId.value = snapshot.flows[0].id;
      });
    }
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
  function inspectWorkflow(input) { return workflowRuntime.value?.inspect(input) ?? { database: workflow.database, flows: [], events: [], cards: [] }; }

  async function searchLocalDrugIndex(input) {
    if (!workflowRuntime.value) return searchDrugIndex(input);
    const drugs = await workflowRuntime.value.querySeededDrugs(input);
    return drugs.map((drug) => ({ id: drug.id, udi: drug.identifiers?.udi, name: drug.name, genericFor: drug.genericFor, category: drug.category, drugClass: drug.drugClass, fromPrice: Math.min(...drug.variants.map((item) => item.price)), variantCount: drug.variants.length }));
  }

  async function localDrugIndexEntry(drugId) {
    if (!workflowRuntime.value) return drugIndexEntry(drugId);
    return workflowRuntime.value.getSeededDrug(drugId);
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
    if (!workflowRuntime.value) throw new Error("Workflow runtime is not configured.");
    const primaryDrug = facade.value.drugIndexEntry(drugId);
    if (!primaryDrug) throw new TypeError(`Unknown UDI drug id: ${drugId}.`);
    const suggested = facade.value.findRelatedDrugs({ drugId, limit: 6 }).related;
    const selectedIds = relatedDrugIds.length ? new Set(relatedDrugIds) : new Set(suggested.slice(0, 2).map((drug) => drug.id));
    const relatedDrugs = suggested.filter((drug) => selectedIds.has(drug.id)).slice(0, 3);
    if (relatedDrugIds.some((id) => !relatedDrugs.some((drug) => drug.id === id))) {
      throw new TypeError("Every relatedDrugId must be a discussion-only record returned for the primary drug.");
    }
    const exchange = await workflowRuntime.value.prepareDoctorQuestionCard({ primaryDrug, relatedDrugs, concerns });
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
    selectedFlowId.value = "";
  }

  async function runWorkflowScenario(scenarioId) {
    if (!workflowRuntime.value) throw new Error("Workflow runtime is not configured.");
    const flow = await workflowRuntime.value.runNegativeScenario(scenarioId);
    selectedFlowId.value = flow.id;
    return flow;
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
    searchLocalDrugIndex,
    localDrugIndexEntry,
    startWorkflow,
    transitionWorkflow,
    prepareDoctorQuestionCard,
    submitDoctorQuestionCard,
    markQuestionCardReviewed,
    clearWorkflowLab,
    runWorkflowScenario,
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
