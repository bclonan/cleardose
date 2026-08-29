<script setup>
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  FileCheck2,
  LockKeyhole,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Stethoscope,
} from "@lucide/vue";
import { formatMoney, usePharmacyStore } from "../composables/usePharmacyStore";

const router = useRouter();
const store = usePharmacyStore();
const step = ref(1);
const error = ref("");
const address = reactive({
  line1: store.currentCustomer?.address.line1 ?? "",
  line2: store.currentCustomer?.address.line2 ?? "",
  city: store.currentCustomer?.address.city ?? "",
  state: store.currentCustomer?.address.state ?? "",
  zip: store.currentCustomer?.address.zip ?? "",
});
const prescriptionMethod = ref("on-file");
const paymentMethod = ref("demo-card");
const benefit = reactive({ bin: "", pcn: "", group: "", member: "" });
const placing = ref(false);

const steps = [
  { id: 1, label: "Delivery", icon: MapPin },
  { id: 2, label: "Prescription", icon: Stethoscope },
  { id: 3, label: "Payment", icon: CreditCard },
  { id: 4, label: "Review", icon: FileCheck2 },
];

const prescriptionLabel = computed(() => ({
  "on-file": "Use a prescription already on file",
  provider: "My provider will send it",
  transfer: "Transfer from another pharmacy",
}[prescriptionMethod.value]));

function validateCurrentStep() {
  error.value = "";
  if (step.value === 1 && (!address.line1 || !address.city || !address.state || !address.zip)) {
    error.value = "Complete the required delivery address fields.";
    return false;
  }
  if (step.value === 3 && paymentMethod.value === "benefit" && (!benefit.bin || !benefit.pcn || !benefit.group || !benefit.member)) {
    error.value = "Complete all four mock benefit fields or choose the demo card.";
    return false;
  }
  return true;
}

function nextStep() {
  if (!validateCurrentStep()) return;
  step.value = Math.min(4, step.value + 1);
}

function previousStep() {
  error.value = "";
  step.value = Math.max(1, step.value - 1);
}

function placeOrder() {
  placing.value = true;
  const order = store.placeOrder({ address, prescriptionMethod: prescriptionMethod.value, paymentMethod: paymentMethod.value });
  if (!order) {
    placing.value = false;
    error.value = "The mock order could not be created.";
    return;
  }
  window.setTimeout(() => router.push(`/checkout/confirmation/${order.id}`), 550);
}
</script>

<template>
  <div v-if="!store.currentCustomer" class="protected-state page-width checkout-gate">
    <span class="empty-icon"><LockKeyhole :size="31" /></span>
    <span class="eyebrow">Checkout saved</span>
    <h1>Sign in before checkout.</h1>
    <p>Your mock cart will stay here while you enter the seeded patient account or create a new one.</p>
    <RouterLink class="button button-orange" :to="{ name: 'login', query: { next: '/checkout' } }">Sign in and continue <ArrowRight :size="18" /></RouterLink>
  </div>

  <div v-else-if="!store.state.cart.length" class="protected-state page-width checkout-gate">
    <span class="empty-icon"><PackageCheck :size="31" /></span><h1>Your cart is empty.</h1><p>Add a medication before starting checkout.</p><RouterLink class="button button-dark" to="/medications">Browse medications</RouterLink>
  </div>

  <div v-else class="checkout-page">
    <div class="checkout-topbar">
      <div class="page-width"><RouterLink to="/cart"><ArrowLeft :size="17" /> Return to cart</RouterLink><span><LockKeyhole :size="15" /> Secure demo checkout</span></div>
    </div>
    <div class="page-width checkout-heading"><span class="eyebrow">Mock checkout</span><h1>Complete your order.</h1><p>No real prescription, payment, or health information is submitted.</p></div>

    <div class="page-width checkout-progress" aria-label="Checkout progress">
      <template v-for="(item, index) in steps" :key="item.id">
        <button type="button" :class="{ active: step === item.id, complete: step > item.id }" :disabled="item.id > step" @click="step = item.id">
          <span><Check v-if="step > item.id" :size="15" /><component :is="item.icon" v-else :size="18" /></span>
          <small>Step {{ item.id }}</small><strong>{{ item.label }}</strong>
        </button>
        <i v-if="index < steps.length - 1" :class="{ complete: step > item.id }"></i>
      </template>
    </div>

    <div class="page-width checkout-layout">
      <section class="checkout-form-card">
        <div v-if="step === 1">
          <div class="checkout-section-heading"><span class="list-icon"><MapPin :size="21" /></span><div><span class="eyebrow">Step 1 of 4</span><h2>Where should we send it?</h2><p>Mailing address for this mock order.</p></div></div>
          <form class="stacked-form" @submit.prevent="nextStep">
            <label>Street address<input v-model="address.line1" autocomplete="street-address" placeholder="1400 Demo Avenue" required /></label>
            <label>Apartment or suite <small>Optional</small><input v-model="address.line2" placeholder="Apt 3B" /></label>
            <div class="form-row three-columns"><label>City<input v-model="address.city" autocomplete="address-level2" required /></label><label>State<input v-model="address.state" autocomplete="address-level1" maxlength="2" required /></label><label>ZIP code<input v-model="address.zip" autocomplete="postal-code" required /></label></div>
          </form>
        </div>

        <div v-else-if="step === 2">
          <div class="checkout-section-heading"><span class="list-icon"><Stethoscope :size="21" /></span><div><span class="eyebrow">Step 2 of 4</span><h2>How will we receive the prescription?</h2><p>Choose the path that best matches the patient.</p></div></div>
          <div class="choice-card-list">
            <label :class="{ selected: prescriptionMethod === 'on-file' }"><input v-model="prescriptionMethod" type="radio" value="on-file" /><span><strong>Use a prescription already on file</strong><small>Best for Jamie's ready prescriptions in this seeded account.</small></span><Check v-if="prescriptionMethod === 'on-file'" :size="18" /></label>
            <label :class="{ selected: prescriptionMethod === 'provider' }"><input v-model="prescriptionMethod" type="radio" value="provider" /><span><strong>My provider will send it</strong><small>The order waits until the pharmacy matches an electronic prescription.</small></span><Check v-if="prescriptionMethod === 'provider'" :size="18" /></label>
            <label :class="{ selected: prescriptionMethod === 'transfer' }"><input v-model="prescriptionMethod" type="radio" value="transfer" /><span><strong>Transfer from another pharmacy</strong><small>A mock transfer request will appear on the confirmation screen.</small></span><Check v-if="prescriptionMethod === 'transfer'" :size="18" /></label>
          </div>
          <div class="information-callout compact-callout"><ShieldCheck :size="21" /><div><strong>Nothing is fulfilled without verification.</strong><p>This prototype separates the shopping commitment from the clinical prescription check.</p></div></div>
        </div>

        <div v-else-if="step === 3">
          <div class="checkout-section-heading"><span class="list-icon"><CreditCard :size="21" /></span><div><span class="eyebrow">Step 3 of 4</span><h2>Choose a mock payment path.</h2><p>These controls only change local demo state.</p></div></div>
          <div class="choice-card-list payment-choices">
            <label :class="{ selected: paymentMethod === 'demo-card' }"><input v-model="paymentMethod" type="radio" value="demo-card" /><span><strong>Demo Visa ···· 4242</strong><small>Expires 12/30 · Never processed</small></span><CreditCard :size="21" /></label>
            <label :class="{ selected: paymentMethod === 'benefit' }"><input v-model="paymentMethod" type="radio" value="benefit" /><span><strong>Mock pharmacy benefit</strong><small>Demonstrates BIN, PCN, group, and member inputs.</small></span><ShieldCheck :size="21" /></label>
          </div>
          <div v-if="paymentMethod === 'benefit'" class="benefit-fields">
            <div class="form-row"><label>BIN<input v-model="benefit.bin" placeholder="000000" /></label><label>PCN<input v-model="benefit.pcn" placeholder="DEMO" /></label></div>
            <div class="form-row"><label>Group ID<input v-model="benefit.group" placeholder="SAMPLE01" /></label><label>Member ID<input v-model="benefit.member" placeholder="MEMBER123" /></label></div>
          </div>
          <div class="demo-payment-warning"><LockKeyhole :size="18" /> Do not enter real card, insurance, or member information.</div>
        </div>

        <div v-else>
          <div class="checkout-section-heading"><span class="list-icon"><FileCheck2 :size="21" /></span><div><span class="eyebrow">Step 4 of 4</span><h2>Review your order.</h2><p>Confirm the visible facts before creating the local mock order.</p></div></div>
          <div class="review-block"><div class="review-block-heading"><h3>Delivery</h3><button type="button" @click="step = 1">Edit</button></div><p>{{ address.line1 }} {{ address.line2 }}<br />{{ address.city }}, {{ address.state }} {{ address.zip }}</p></div>
          <div class="review-block"><div class="review-block-heading"><h3>Prescription</h3><button type="button" @click="step = 2">Edit</button></div><p>{{ prescriptionLabel }}</p></div>
          <div class="review-block"><div class="review-block-heading"><h3>Payment</h3><button type="button" @click="step = 3">Edit</button></div><p>{{ paymentMethod === 'demo-card' ? 'Demo Visa ···· 4242' : 'Mock pharmacy benefit' }}</p></div>
          <label class="review-consent"><input type="checkbox" checked disabled /><span><strong>Demo acknowledgement</strong><small>This creates a local order only. No pharmacy or payment network is contacted.</small></span></label>
        </div>

        <div v-if="error" class="form-error" role="alert">{{ error }}</div>
        <div class="checkout-actions">
          <button v-if="step > 1" class="button button-ghost" type="button" @click="previousStep"><ArrowLeft :size="18" /> Back</button>
          <span v-else></span>
          <button v-if="step < 4" class="button button-orange" type="button" @click="nextStep">Continue <ArrowRight :size="18" /></button>
          <button v-else class="button button-orange" type="button" :disabled="placing" @click="placeOrder"><PackageCheck :size="18" />{{ placing ? 'Creating order…' : 'Place mock order' }}</button>
        </div>
      </section>

      <aside class="order-summary checkout-summary">
        <h2>Your order</h2>
        <div v-for="item in store.state.cart" :key="item.variantId" class="checkout-summary-item"><div><strong>{{ item.name }}</strong><span>{{ item.strength }} · {{ item.quantity }} count</span></div><strong>{{ formatMoney(item.price * item.units) }}</strong></div>
        <div class="summary-divider"></div><div><span>Medications</span><strong>{{ formatMoney(store.cartSubtotal) }}</strong></div><div><span>Shipping</span><strong>{{ formatMoney(store.shipping) }}</strong></div><div class="summary-total"><span>Mock total</span><strong>{{ formatMoney(store.cartTotal) }}</strong></div>
        <span class="secure-caption"><LockKeyhole :size="15" /> No real payment is collected</span>
      </aside>
    </div>
  </div>
</template>
