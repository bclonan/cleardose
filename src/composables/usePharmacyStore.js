import { computed, reactive, watch } from "vue";
import { medications, seededCustomer, seededOrders, seededPrescriptions } from "../data/mockDb";

const STORAGE_KEY = "cpd-flow-demo-v1";

function initialState() {
  return {
    currentCustomerId: null,
    customers: [structuredClone(seededCustomer)],
    cart: [],
    orders: structuredClone(seededOrders),
    prescriptions: structuredClone(seededPrescriptions),
  };
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...initialState(), ...JSON.parse(stored) } : initialState();
  } catch {
    return initialState();
  }
}

const state = reactive(loadState());

watch(
  state,
  (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)),
  { deep: true },
);

const currentCustomer = computed(() =>
  state.customers.find((customer) => customer.id === state.currentCustomerId) ?? null,
);

const cartCount = computed(() => state.cart.reduce((sum, item) => sum + item.units, 0));
const cartSubtotal = computed(() => state.cart.reduce((sum, item) => sum + item.price * item.units, 0));
const shipping = computed(() => (state.cart.length ? 5 : 0));
const cartTotal = computed(() => cartSubtotal.value + shipping.value);

function medicationById(id) {
  return medications.find((medication) => medication.id === id);
}

function medicationBySlug(slug) {
  return medications.find((medication) => medication.slug === slug);
}

function addToCart(medicationId, variantId) {
  const medication = medicationById(medicationId);
  const variant = medication?.variants.find((item) => item.id === variantId);
  if (!medication || !variant) return false;

  const existing = state.cart.find((item) => item.variantId === variantId);
  if (existing) {
    existing.units += 1;
    return true;
  }

  state.cart.push({
    medicationId,
    variantId,
    name: medication.name,
    genericFor: medication.genericFor,
    form: variant.form,
    strength: variant.strength,
    quantity: variant.quantity,
    price: variant.price,
    retail: variant.retail,
    units: 1,
  });
  return true;
}

function removeFromCart(variantId) {
  const index = state.cart.findIndex((item) => item.variantId === variantId);
  if (index >= 0) state.cart.splice(index, 1);
}

function setCartUnits(variantId, units) {
  const item = state.cart.find((entry) => entry.variantId === variantId);
  if (!item) return;
  const next = Math.max(0, Math.min(3, Number(units) || 0));
  if (next === 0) removeFromCart(variantId);
  else item.units = next;
}

function authenticate(email, password) {
  const customer = state.customers.find(
    (item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password,
  );
  if (!customer) return { ok: false, message: "We couldn't match that demo email and password." };
  state.currentCustomerId = customer.id;
  return { ok: true, customer };
}

function createCustomer(input) {
  if (state.customers.some((item) => item.email.toLowerCase() === input.email.trim().toLowerCase())) {
    return { ok: false, message: "An account with that email already exists." };
  }
  const customer = {
    id: `cust_${Date.now()}`,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    phone: input.phone.trim(),
    dateOfBirth: input.dateOfBirth,
    address: { line1: "", line2: "", city: "", state: "", zip: "" },
  };
  state.customers.push(customer);
  state.currentCustomerId = customer.id;
  return { ok: true, customer };
}

function updateCurrentCustomer(changes) {
  if (!currentCustomer.value) return false;
  Object.assign(currentCustomer.value, changes);
  return true;
}

function logout() {
  state.currentCustomerId = null;
}

function placeOrder({ address, prescriptionMethod, paymentMethod }) {
  if (!currentCustomer.value || !state.cart.length) return null;
  const id = `CPD-${String(Date.now()).slice(-5)}`;
  const order = {
    id,
    customerId: currentCustomer.value.id,
    placedAt: new Date().toISOString().slice(0, 10),
    status: prescriptionMethod === "on-file" ? "processing" : "waiting-for-prescription",
    tracking: null,
    subtotal: Number(cartSubtotal.value.toFixed(2)),
    shipping: shipping.value,
    tax: 0,
    total: Number(cartTotal.value.toFixed(2)),
    address: structuredClone(address),
    prescriptionMethod,
    paymentMethod,
    items: structuredClone(state.cart),
  };
  state.orders.unshift(order);
  currentCustomer.value.address = structuredClone(address);
  state.cart.splice(0, state.cart.length);
  return order;
}

function resetDemo() {
  Object.assign(state, initialState());
  localStorage.removeItem(STORAGE_KEY);
}

function customerOrders() {
  return state.orders.filter((order) => order.customerId === state.currentCustomerId);
}

function customerPrescriptions() {
  return state.prescriptions.filter((prescription) => prescription.customerId === state.currentCustomerId);
}

export function usePharmacyStore() {
  return {
    state,
    currentCustomer,
    cartCount,
    cartSubtotal,
    shipping,
    cartTotal,
    medicationById,
    medicationBySlug,
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
}

export function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}
