<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleDollarSign,
  Info,
  MapPin,
  Package,
  Pill,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  Truck,
} from "@lucide/vue";
import { formatMoney, usePharmacyStore } from "../composables/usePharmacyStore";

const route = useRoute();
const router = useRouter();
const store = usePharmacyStore();
const medication = computed(() => store.medicationBySlug(route.params.slug));
const selectedVariantId = ref(medication.value?.variants[0]?.id ?? "");
const added = ref(false);
const locationId = ref("demo-baltimore");
const selectedOfferId = ref("");
const availability = ref(null);
const availabilityError = ref("");

watch(medication, (value) => { selectedVariantId.value = value?.variants[0]?.id ?? ""; });

const selectedVariant = computed(() => medication.value?.variants.find((variant) => variant.id === selectedVariantId.value));
const baseCost = computed(() => Math.max(0, (selectedVariant.value.price - 5) / 1.15));
const markup = computed(() => baseCost.value * 0.15);
const savings = computed(() => selectedVariant.value.retail - selectedVariant.value.price);
const demoLocations = computed(() => store.state.drugIndexSummary?.demoLocations ?? []);
const selectedOffer = computed(() => availability.value?.offers.find((offer) => offer.id === selectedOfferId.value) ?? null);

watch([selectedVariantId, locationId], () => checkAvailability(), { immediate: true });

function addItem() {
  store.addToCart(medication.value.id, selectedVariantId.value);
  added.value = true;
  window.setTimeout(() => { added.value = false; }, 2400);
}

function checkAvailability() {
  if (!medication.value?.id || !selectedVariantId.value) return;
  availabilityError.value = "";
  try {
    availability.value = store.getDrugAvailability({ drugId: medication.value.id, variantId: selectedVariantId.value, locationId: locationId.value });
    selectedOfferId.value = availability.value.offers.find((offer) => offer.inventory.status !== "unavailable")?.id ?? availability.value.offers[0]?.id ?? "";
  } catch (error) {
    availability.value = null;
    availabilityError.value = error instanceof Error ? error.message : "Availability check failed.";
  }
}

function deliveryLabel(offer) {
  const window = offer.fulfillment.shipping.deliveryWindow;
  if (offer.fulfillment.shipping.available && window) return `${window.minDays} to ${window.maxDays} demo days`;
  if (offer.fulfillment.pickup.available) return `Pickup in ${offer.fulfillment.pickup.estimatedFulfillmentMinutes} minutes`;
  return offer.inventory.estimatedRestockOn ? `Restock ${offer.inventory.estimatedRestockOn}` : "Unavailable";
}
</script>

<template>
  <div v-if="medication" class="detail-page">
    <div class="page-width detail-breadcrumbs">
      <RouterLink to="/medications"><ArrowLeft :size="17" /> All medications</RouterLink>
      <ChevronRight :size="15" />
      <span>{{ medication.name }}</span>
    </div>

    <section class="page-width detail-grid">
      <div class="product-visual-panel">
        <span class="generic-badge">Generic medication</span>
        <div class="product-identity-visual" aria-hidden="true">
          <span class="product-identity-icon"><Pill :size="54" /></span>
          <span class="mini-brand">ClearDose · agent-ready</span>
          <strong>{{ medication.name }}</strong>
          <small>{{ selectedVariant.strength }} · {{ selectedVariant.form }}</small>
          <span class="product-demo-stamp">DEMO PRODUCT</span>
        </div>
        <div class="visual-note"><Info :size="17" /><span>Illustrative packaging only. The real medication and manufacturer may vary.</span></div>
      </div>

      <div class="product-info-panel">
        <span class="eyebrow">{{ medication.category }}</span>
        <h1>{{ medication.name }}</h1>
        <p class="generic-for">Generic for {{ medication.genericFor }}</p>
        <p class="product-description">{{ medication.description }}</p>
        <div class="rx-required"><Stethoscope :size="19" /><span><strong>Prescription required</strong> Your prescriber must send a valid prescription before fulfillment.</span></div>

        <div class="variant-picker">
          <h2>Choose your prescription</h2>
          <div class="variant-options">
            <label v-for="variant in medication.variants" :key="variant.id" :class="{ selected: selectedVariantId === variant.id }">
              <input v-model="selectedVariantId" name="medication-variant" type="radio" :value="variant.id" />
              <span><strong>{{ variant.strength }}</strong><small>{{ variant.form }} · {{ variant.quantity }} count</small></span>
              <em>{{ formatMoney(variant.price) }}</em>
              <Check v-if="selectedVariantId === variant.id" :size="17" />
            </label>
          </div>
        </div>

        <section class="detail-provider-picker" data-agent-section="availability-results" aria-labelledby="detail-provider-title">
          <div><span class="eyebrow"><MapPin :size="16" /> Fictional provider check</span><h2 id="detail-provider-title">Choose a mock location and review one offer.</h2></div>
          <label>Mock location<select v-model="locationId" name="detailLocationId"><option v-for="location in demoLocations" :key="location.id" :value="location.id">{{ location.label }} · {{ location.postalCode }}</option></select></label>
          <div v-if="availability" class="detail-provider-options">
            <label v-for="offer in availability.offers" :key="offer.id" :class="{ selected: selectedOfferId === offer.id, unavailable: offer.inventory.status === 'unavailable' }" data-availability-offer>
              <input v-model="selectedOfferId" type="radio" name="providerOffer" :value="offer.id" />
              <span><strong>{{ offer.providerName }}</strong><small>{{ offer.inventory.status.replaceAll('_', ' ') }} · {{ deliveryLabel(offer) }}</small></span>
              <em>{{ offer.deliveredCashTotal == null ? 'Unavailable' : formatMoney(offer.deliveredCashTotal) }}</em>
            </label>
          </div>
          <div v-if="selectedOffer" class="detail-selected-offer"><Truck :size="17" /><span><strong>{{ selectedOffer.providerName }}</strong> {{ deliveryLabel(selectedOffer) }}. Cash package {{ formatMoney(selectedOffer.cashPrice) }}, shipping {{ formatMoney(selectedOffer.shipping) }}.</span></div>
          <p v-if="availabilityError" class="inline-error" role="alert">{{ availabilityError }}</p>
          <small>Provider selection is for review only. Adding the package does not reserve stock or contact a provider.</small>
        </section>

        <div class="purchase-panel" data-agent-section="primary-price">
          <div class="purchase-price">
            <span>Your mock drug price</span>
            <strong>{{ formatMoney(selectedVariant.price) }}</strong>
            <small>plus $5.00 shipping per order</small>
          </div>
          <div class="purchase-savings">
            <span>Typical retail {{ formatMoney(selectedVariant.retail) }}</span>
            <strong>You save {{ formatMoney(savings) }}</strong>
          </div>
          <button class="button button-orange button-wide" type="button" data-agent-section="add-to-cart-action" @click="addItem">
            <ShoppingCart :size="19" /> Add to mock cart
          </button>
          <Transition name="fade">
            <div v-if="added" class="added-message"><Check :size="17" /> Added to cart <button type="button" @click="router.push('/cart')">View cart</button></div>
          </Transition>
        </div>
      </div>
    </section>

    <section class="price-breakdown-section">
      <div class="page-width price-breakdown-grid">
        <div>
          <span class="eyebrow"><CircleDollarSign :size="17" /> Radical transparency</span>
          <h2>Here is how this demo price works.</h2>
          <p>The model exposes every component before the patient commits. These numbers are illustrative and recalculate with your selected medication.</p>
        </div>
        <div class="breakdown-card">
          <div><span>Medication cost</span><strong>{{ formatMoney(baseCost) }}</strong></div>
          <div><span>15% markup</span><strong>{{ formatMoney(markup) }}</strong></div>
          <div><span>Pharmacy labor</span><strong>$5.00</strong></div>
          <div class="breakdown-total"><span>Your drug price</span><strong>{{ formatMoney(selectedVariant.price) }}</strong></div>
          <small>Shipping is calculated once per order during checkout.</small>
        </div>
      </div>
    </section>

    <section class="page-width detail-assurance-grid">
      <article><ShieldCheck :size="25" /><h3>Licensed pharmacy workflow</h3><p>The experience keeps prescription verification separate from payment and fulfillment.</p></article>
      <article><Package :size="25" /><h3>Mail delivery</h3><p>One flat mock shipping fee covers every medication in the order.</p></article>
      <article><Stethoscope :size="25" /><h3>Prescriber handoff</h3><p>Clear instructions explain what the patient and provider each need to do.</p></article>
    </section>
  </div>
  <div v-else class="empty-state page-width">
    <h1>Medication not found</h1>
    <RouterLink class="button button-dark" to="/medications">Back to medications</RouterLink>
  </div>
</template>
