<script setup>
import { computed, nextTick, reactive, ref } from "vue";
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
const announcement = ref("");
const invalidFields = ref([]);
const stepHeading = ref(null);
const errorSummary = ref(null);
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
const fieldElementIds = Object.freeze({
  line1: "checkout-address-line1",
  city: "checkout-city",
  state: "checkout-state",
  zip: "checkout-zip",
  bin: "benefit-bin",
  pcn: "benefit-pcn",
  group: "benefit-group",
  member: "benefit-member",
});

const prescriptionLabel = computed(() => ({
  "on-file": "Use a prescription already on file",
  provider: "My provider will send it",
  transfer: "Transfer from another pharmacy",
}[prescriptionMethod.value]));

function isInvalid(field) { return invalidFields.value.includes(field); }

function clearFieldError(field) {
  invalidFields.value = invalidFields.value.filter((item) => item !== field);
  if (!invalidFields.value.length) error.value = "";
}

function clearValidation() {
  error.value = "";
  invalidFields.value = [];
}

function reportValidationError(message, fields) {
  error.value = message;
  invalidFields.value = fields;
  announcement.value = `Checkout error. ${message}`;
  nextTick(() => globalThis.document?.getElementById(fieldElementIds[fields[0]])?.focus());
}

function reportOrderError(message) {
  error.value = message;
  announcement.value = `Checkout error. ${message}`;
  nextTick(() => errorSummary.value?.focus());
}

async function goToStep(nextStep) {
  clearValidation();
  step.value = Math.max(1, Math.min(4, nextStep));
  await nextTick();
  const current = steps.find((item) => item.id === step.value);
  announcement.value = `Checkout step ${step.value} of ${steps.length}. ${current?.label || "Review"}.`;
  stepHeading.value?.focus({ preventScroll: true });
}

function validateCurrentStep() {
  clearValidation();
  if (step.value === 1) {
    const missing = ["line1", "city", "state", "zip"].filter((field) => !address[field]?.trim());
    if (!missing.length) return true;
    reportValidationError("Complete the required delivery address fields.", missing);
    return false;
  }
  if (step.value === 3 && paymentMethod.value === "benefit") {
    const missing = ["bin", "pcn", "group", "member"].filter((field) => !benefit[field]?.trim());
    if (!missing.length) return true;
    reportValidationError("Complete all four mock benefit fields or choose the demo card.", missing);
    return false;
  }
  return true;
}

async function nextStep() {
  if (!validateCurrentStep()) return;
  await goToStep(step.value + 1);
}

async function previousStep() { await goToStep(step.value - 1); }

function placeOrder() {
  placing.value = true;
  error.value = "";
  try {
    const order = store.placeOrder({ address, prescriptionMethod: prescriptionMethod.value, paymentMethod: paymentMethod.value });
    if (!order) {
      placing.value = false;
      reportOrderError("The mock order could not be created.");
      return;
    }
    window.setTimeout(() => router.push(`/checkout/confirmation/${order.id}`), 550);
  } catch (caught) {
    placing.value = false;
    reportOrderError(caught instanceof Error ? caught.message : "The mock order could not be created.");
  }
}
</script>

<template>
  <div v-if="!store.currentCustomer" class="protected-state page-width checkout-gate">
    <span class="empty-icon"><LockKeyhole :size="31" /></span>
    <span class="eyebrow">Checkout saved</span>
    <h1>Sign in before checkout.</h1>
    <p>Your mock cart will stay here while you enter the seeded patient account or create a new one.</p>
    <RouterLink class="button button-orange" :to="{ name: 'login', query: { next: '/checkout' } }">Sign in and continue <ArrowRight :size="18" /></RouterLink>
    <aside v-if="store.state.cart.length" class="order-summary checkout-gate-summary" data-agent-section="cart-summary" aria-label="Pre-sign-in mock cart total">
      <h2>Cost review before sign-in</h2>
      <div v-for="item in store.state.cart" :key="item.variantId" class="checkout-summary-item"><div><strong>{{ item.name }}</strong><span>{{ item.strength }} · {{ item.quantity }} count</span></div><strong>{{ formatMoney(item.price * item.units) }}</strong></div>
      <div class="summary-divider"></div><div><span>Medications</span><strong>{{ formatMoney(store.cartSubtotal) }}</strong></div><div><span>Shipping</span><strong>{{ formatMoney(store.shipping) }}</strong></div><div class="summary-total"><span>Mock total</span><strong>{{ formatMoney(store.cartTotal) }}</strong></div>
      <span class="secure-caption"><LockKeyhole :size="15" /> Sign-in and checkout remain visible human actions</span>
    </aside>
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
        <button type="button" :class="{ active: step === item.id, complete: step > item.id }" :disabled="item.id > step" :aria-current="step === item.id ? 'step' : undefined" @click="goToStep(item.id)">
          <span><Check v-if="step > item.id" :size="15" /><component :is="item.icon" v-else :size="18" /></span>
          <small>Step {{ item.id }}</small><strong>{{ item.label }}</strong>
        </button>
        <i v-if="index < steps.length - 1" :class="{ complete: step > item.id }" aria-hidden="true"></i>
      </template>
    </div>

    <div class="page-width checkout-layout" data-agent-section="checkout-flow">
      <section class="checkout-form-card">
        <div v-if="step === 1">
          <div class="checkout-section-heading"><span class="list-icon"><MapPin :size="21" /></span><div><span class="eyebrow">Step 1 of 4</span><h2 ref="stepHeading" tabindex="-1">Where should we send it?</h2><p>Mailing address for this mock order.</p></div></div>
          <form class="stacked-form" autocomplete="on" @submit.prevent="nextStep">
            <label for="checkout-address-line1">Street address<input id="checkout-address-line1" v-model="address.line1" name="address-line1" autocomplete="shipping address-line1" placeholder="1400 Demo Avenue" required :aria-invalid="isInvalid('line1')" :aria-describedby="isInvalid('line1') ? 'checkout-error' : undefined" @input="clearFieldError('line1')" /></label>
            <label for="checkout-address-line2">Apartment or suite <small>Optional</small><input id="checkout-address-line2" v-model="address.line2" name="address-line2" autocomplete="shipping address-line2" placeholder="Apt 3B" /></label>
            <div class="form-row three-columns"><label for="checkout-city">City<input id="checkout-city" v-model="address.city" name="address-level2" autocomplete="shipping address-level2" required :aria-invalid="isInvalid('city')" :aria-describedby="isInvalid('city') ? 'checkout-error' : undefined" @input="clearFieldError('city')" /></label><label for="checkout-state">State<input id="checkout-state" v-model="address.state" name="address-level1" autocomplete="shipping address-level1" maxlength="2" required :aria-invalid="isInvalid('state')" :aria-describedby="isInvalid('state') ? 'checkout-error' : undefined" @input="clearFieldError('state')" /></label><label for="checkout-zip">ZIP code<input id="checkout-zip" v-model="address.zip" name="postal-code" autocomplete="shipping postal-code" inputmode="numeric" required :aria-invalid="isInvalid('zip')" :aria-describedby="isInvalid('zip') ? 'checkout-error' : undefined" @input="clearFieldError('zip')" /></label></div>
          </form>
        </div>

        <div v-else-if="step === 2">
          <div class="checkout-section-heading"><span class="list-icon"><Stethoscope :size="21" /></span><div><span class="eyebrow">Step 2 of 4</span><h2 ref="stepHeading" tabindex="-1">How will we receive the prescription?</h2><p>Choose the path that best matches the patient.</p></div></div>
          <div class="choice-card-list">
            <label :class="{ selected: prescriptionMethod === 'on-file' }"><input v-model="prescriptionMethod" name="prescription-method" type="radio" value="on-file" /><span><strong>Use a prescription already on file</strong><small>Best for Jamie's ready prescriptions in this seeded account.</small></span><Check v-if="prescriptionMethod === 'on-file'" :size="18" /></label>
            <label :class="{ selected: prescriptionMethod === 'provider' }"><input v-model="prescriptionMethod" name="prescription-method" type="radio" value="provider" /><span><strong>My provider will send it</strong><small>The order waits until the pharmacy matches an electronic prescription.</small></span><Check v-if="prescriptionMethod === 'provider'" :size="18" /></label>
            <label :class="{ selected: prescriptionMethod === 'transfer' }"><input v-model="prescriptionMethod" name="prescription-method" type="radio" value="transfer" /><span><strong>Transfer from another pharmacy</strong><small>A mock transfer request will appear on the confirmation screen.</small></span><Check v-if="prescriptionMethod === 'transfer'" :size="18" /></label>
          </div>
          <div class="information-callout compact-callout"><ShieldCheck :size="21" /><div><strong>Nothing is fulfilled without verification.</strong><p>This prototype separates the shopping commitment from the clinical prescription check.</p></div></div>
        </div>

        <div v-else-if="step === 3">
          <div class="checkout-section-heading"><span class="list-icon"><CreditCard :size="21" /></span><div><span class="eyebrow">Step 3 of 4</span><h2 ref="stepHeading" tabindex="-1">Choose a mock payment path.</h2><p>These controls only change local demo state.</p></div></div>
          <div class="choice-card-list payment-choices">
            <label :class="{ selected: paymentMethod === 'demo-card' }"><input v-model="paymentMethod" name="payment-method" type="radio" value="demo-card" /><span><strong>Demo Visa ···· 4242</strong><small>Expires 12/30 · Never processed</small></span><CreditCard :size="21" /></label>
            <label :class="{ selected: paymentMethod === 'benefit' }"><input v-model="paymentMethod" name="payment-method" type="radio" value="benefit" /><span><strong>Mock pharmacy benefit</strong><small>Demonstrates BIN, PCN, group, and member inputs.</small></span><ShieldCheck :size="21" /></label>
          </div>
          <div v-if="paymentMethod === 'benefit'" class="benefit-fields">
            <div class="form-row"><label for="benefit-bin">BIN<input id="benefit-bin" v-model="benefit.bin" name="benefit-bin" autocomplete="off" inputmode="numeric" placeholder="000000" aria-required="true" :aria-invalid="isInvalid('bin')" :aria-describedby="isInvalid('bin') ? 'checkout-error' : undefined" @input="clearFieldError('bin')" /></label><label for="benefit-pcn">PCN<input id="benefit-pcn" v-model="benefit.pcn" name="benefit-pcn" autocomplete="off" placeholder="DEMO" aria-required="true" :aria-invalid="isInvalid('pcn')" :aria-describedby="isInvalid('pcn') ? 'checkout-error' : undefined" @input="clearFieldError('pcn')" /></label></div>
            <div class="form-row"><label for="benefit-group">Group ID<input id="benefit-group" v-model="benefit.group" name="benefit-group" autocomplete="off" placeholder="SAMPLE01" aria-required="true" :aria-invalid="isInvalid('group')" :aria-describedby="isInvalid('group') ? 'checkout-error' : undefined" @input="clearFieldError('group')" /></label><label for="benefit-member">Member ID<input id="benefit-member" v-model="benefit.member" name="benefit-member" autocomplete="off" placeholder="MEMBER123" aria-required="true" :aria-invalid="isInvalid('member')" :aria-describedby="isInvalid('member') ? 'checkout-error' : undefined" @input="clearFieldError('member')" /></label></div>
          </div>
          <div class="demo-payment-warning"><LockKeyhole :size="18" /> Do not enter real card, insurance, or member information.</div>
        </div>

        <div v-else>
          <div class="checkout-section-heading"><span class="list-icon"><FileCheck2 :size="21" /></span><div><span class="eyebrow">Step 4 of 4</span><h2 ref="stepHeading" tabindex="-1">Review your order.</h2><p>Confirm the visible facts before creating the local mock order.</p></div></div>
          <div class="review-block"><div class="review-block-heading"><h3>Delivery</h3><button type="button" @click="goToStep(1)">Edit</button></div><p>{{ address.line1 }} {{ address.line2 }}<br />{{ address.city }}, {{ address.state }} {{ address.zip }}</p></div>
          <div class="review-block"><div class="review-block-heading"><h3>Prescription</h3><button type="button" @click="goToStep(2)">Edit</button></div><p>{{ prescriptionLabel }}</p></div>
          <div class="review-block"><div class="review-block-heading"><h3>Payment</h3><button type="button" @click="goToStep(3)">Edit</button></div><p>{{ paymentMethod === 'demo-card' ? 'Demo Visa ···· 4242' : 'Mock pharmacy benefit' }}</p></div>
          <label class="review-consent"><input type="checkbox" checked disabled /><span><strong>Demo acknowledgement</strong><small>This creates a local order only. No pharmacy or payment network is contacted.</small></span></label>
        </div>

        <div v-if="error" id="checkout-error" ref="errorSummary" class="form-error" role="alert" aria-live="assertive" tabindex="-1">{{ error }}</div>
        <div class="checkout-actions">
          <button v-if="step > 1" class="button button-ghost" type="button" @click="previousStep"><ArrowLeft :size="18" /> Back</button>
          <span v-else></span>
          <button v-if="step < 4" class="button button-orange" type="button" @click="nextStep">Continue <ArrowRight :size="18" /></button>
          <button v-else class="button button-orange" type="button" :disabled="placing" @click="placeOrder"><PackageCheck :size="18" />{{ placing ? 'Creating order...' : 'Place mock order' }}</button>
        </div>
      </section>

      <aside class="order-summary checkout-summary" data-agent-section="cart-summary">
        <h2>Your order</h2>
        <div v-for="item in store.state.cart" :key="item.variantId" class="checkout-summary-item"><div><strong>{{ item.name }}</strong><span>{{ item.strength }} · {{ item.quantity }} count</span></div><strong>{{ formatMoney(item.price * item.units) }}</strong></div>
        <div class="summary-divider"></div><div><span>Medications</span><strong>{{ formatMoney(store.cartSubtotal) }}</strong></div><div><span>Shipping</span><strong>{{ formatMoney(store.shipping) }}</strong></div><div class="summary-total"><span>Mock total</span><strong>{{ formatMoney(store.cartTotal) }}</strong></div>
        <span class="secure-caption"><LockKeyhole :size="15" /> No real payment is collected</span>
      </aside>
    </div>
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ announcement }}</p>
  </div>
</template>
