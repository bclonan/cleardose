import { computed, markRaw, reactive, ref, shallowRef } from "vue";
import { defineStore } from "pinia";

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
  const webMcp = reactive({ supported: false, status: "idle", available: 0, registered: 0, tools: [] });

  const currentCustomer = computed(() => state.currentCustomer);
  const medications = computed(() => state.medications);
  const categories = computed(() => state.categories);
  const cartCount = computed(() => state.cart.reduce((sum, item) => sum + item.units, 0));
  const cartSubtotal = computed(() => state.cart.reduce((sum, item) => sum + item.price * item.units, 0));
  const shipping = computed(() => (state.cart.length ? 5 : 0));
  const cartTotal = computed(() => cartSubtotal.value + shipping.value);

  function configure({ facade: nextFacade, toolRegistry }) {
    facade.value = markRaw(nextFacade);
    toolRegistry?.subscribe((snapshot) => Object.assign(webMcp, snapshot));
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

  return {
    state,
    initialized,
    webMcp,
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
  };
});

export function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}
