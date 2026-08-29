<script setup>
import { computed, ref } from "vue";
import { ArrowRight, Check, ClipboardList, RefreshCcw, ShoppingCart, Stethoscope } from "@lucide/vue";
import AccountNav from "../components/AccountNav.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";

const store = usePharmacyStore();
const prescriptions = computed(() => store.customerPrescriptions());
const addedId = ref(null);

function addPrescription(rx) {
  const medication = store.medicationById(rx.medicationId);
  const variant = medication.variants.find((item) => item.strength === rx.strength && item.quantity === rx.quantity) ?? medication.variants[0];
  store.addToCart(medication.id, variant.id);
  addedId.value = rx.id;
  window.setTimeout(() => { addedId.value = null; }, 2200);
}
</script>

<template>
  <div v-if="store.currentCustomer" class="account-page account-subpage">
    <div class="account-welcome compact-welcome"><div class="page-width"><span class="eyebrow">Patient account</span><h1>Prescriptions</h1><p>See which medications can move forward and which still need action.</p></div></div>
    <div class="page-width account-layout">
      <AccountNav />
      <div class="account-content">
        <div class="information-callout"><ClipboardList :size="22" /><div><strong>Three clear states, one next action.</strong><p>This mock pharmacy only enables ordering after a prescription is ready.</p></div></div>
        <div class="prescription-grid">
          <article v-for="rx in prescriptions" :key="rx.id" class="prescription-card">
            <div class="prescription-card-head"><span class="list-icon"><Stethoscope :size="22" /></span><StatusBadge :status="rx.status" /></div>
            <span class="eyebrow">Rx {{ rx.id.replace('rx_', '') }}</span>
            <h2>{{ store.medicationById(rx.medicationId)?.name }}</h2>
            <p>Generic for {{ store.medicationById(rx.medicationId)?.genericFor }}</p>
            <dl><div><dt>Strength</dt><dd>{{ rx.strength }}</dd></div><div><dt>Quantity</dt><dd>{{ rx.quantity }}</dd></div><div><dt>Refills</dt><dd>{{ rx.refills }}</dd></div></dl>
            <button v-if="rx.status === 'ready'" class="button button-orange button-wide" type="button" @click="addPrescription(rx)">
              <Check v-if="addedId === rx.id" :size="18" /><ShoppingCart v-else :size="18" />{{ addedId === rx.id ? 'Added to cart' : 'Add ready prescription' }}
            </button>
            <RouterLink v-else-if="rx.status === 'needs-renewal'" class="button button-dark button-wide" to="/contact-doctor"><RefreshCcw :size="18" /> Request renewal</RouterLink>
            <button v-else class="button button-disabled button-wide" type="button" disabled>Pharmacy review in progress</button>
            <small>Updated {{ rx.updatedAt }}</small>
          </article>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="protected-state page-width"><h1>Sign in to view prescriptions.</h1><RouterLink class="button button-orange" to="/login">Open demo account <ArrowRight :size="18" /></RouterLink></div>
</template>
