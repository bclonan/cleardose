<script setup>
import { computed, ref, watch } from "vue";
import { ArrowRight, Bot, Check, CircleAlert, Database, MapPin, Package, RefreshCw, Search, ShieldCheck, Truck } from "@lucide/vue";
import { formatMoney, usePharmacyStore } from "../composables/usePharmacyStore";

const store = usePharmacyStore();
const query = ref("");
const category = ref("All medications");
const drugClass = ref("");
const selectedDrugId = ref("med_lisinopril");
const interactionLeft = ref("med_sildenafil");
const interactionRight = ref("med_isosorbide_mononitrate");
const planSecondDrugId = ref("med_atorvastatin");
const planStrategy = ref("lowest_total");
const interactionReview = ref(null);
const procurementPlan = ref(null);
const selectedVariantId = ref("");
const locationId = ref("demo-baltimore");
const fulfillmentMode = ref("shipping");
const maxDeliveryDays = ref(3);
const availability = ref(null);
const availabilityRanking = ref(null);
const availabilityError = ref(null);
const announcement = ref("Universal Drug Index ready.");

const summary = computed(() => store.state.drugIndexSummary ?? {});
const results = computed(() => store.searchDrugIndex({
  query: query.value,
  category: category.value,
  drugClass: drugClass.value,
  limit: 18,
}));
const selectedDrug = computed(() => store.drugIndexEntry(selectedDrugId.value));
const related = computed(() => store.findRelatedDrugs({ drugId: selectedDrugId.value, limit: 5 }));
const priceComparison = computed(() => store.compareDrugPrices({ drugIds: [selectedDrugId.value] }));
const demoLocations = computed(() => summary.value.demoLocations ?? []);

watch(selectedDrug, (drug) => {
  selectedVariantId.value = drug?.variants?.[0]?.id ?? "";
  availability.value = null;
  availabilityRanking.value = null;
}, { immediate: true });

function selectDrug(drugId) {
  selectedDrugId.value = drugId;
  announcement.value = `Selected ${selectedDrug.value?.name ?? drugId}.`;
}

function runInteractionReview() {
  interactionReview.value = store.reviewInteractionFlags({ drugIds: [interactionLeft.value, interactionRight.value] });
  announcement.value = `Interaction demonstration returned ${interactionReview.value.flags.length} synthetic review flags.`;
}

function buildPlan() {
  procurementPlan.value = store.buildProcurementPlan({
    items: [{ drugId: selectedDrugId.value }, { drugId: planSecondDrugId.value }],
    strategy: planStrategy.value,
  });
  announcement.value = `Built a local fictional procurement plan for ${procurementPlan.value.items.length} items. No order was placed.`;
}

function runAvailability() {
  availabilityError.value = null;
  availability.value = null;
  try {
    const input = { drugId: selectedDrugId.value, variantId: selectedVariantId.value, locationId: locationId.value };
    availability.value = store.getDrugAvailability(input);
    availabilityRanking.value = store.compareDrugAvailability({ ...input, fulfillmentMode: fulfillmentMode.value, maxDeliveryDays: Number(maxDeliveryDays.value) });
    announcement.value = `Checked ${availability.value.offers.length} fictional provider offers for ${availability.value.location.label}.`;
  } catch (error) {
    availabilityRanking.value = null;
    availabilityError.value = typeof error?.toStructuredContent === "function" ? error.toStructuredContent() : { code: error?.code ?? "AVAILABILITY_FAILED", message: error instanceof Error ? error.message : "Availability check failed." };
    announcement.value = availabilityError.value.message;
  }
}

function recoverAvailability() {
  const input = availabilityError.value?.recoveryInput ?? availability.value?.recovery?.input;
  if (!input || !Object.keys(input).length) return;
  if (input.locationId) locationId.value = input.locationId;
  if (input.variantId) selectedVariantId.value = input.variantId;
  if (input.drugId && input.drugId !== selectedDrugId.value) selectedDrugId.value = input.drugId;
  runAvailability();
}

function deliveryLabel(offer) {
  const shipping = offer.fulfillment.shipping;
  if (shipping.available && shipping.deliveryWindow) return `${shipping.deliveryWindow.minDays} to ${shipping.deliveryWindow.maxDays} demo days`;
  const pickup = offer.fulfillment.pickup;
  if (pickup.available) return `Pickup in ${pickup.estimatedFulfillmentMinutes} minutes`;
  return offer.inventory.estimatedRestockOn ? `Restock ${offer.inventory.estimatedRestockOn}` : "Unavailable";
}

function pickupLocationLabel(offer) {
  const label = offer.location.label;
  const distance = offer.fulfillment.pickup.distanceMiles;
  return distance == null || distance === "" || !Number.isFinite(Number(distance)) ? label : `${label} · ${distance} miles`;
}
</script>

<template>
  <div class="udi-page">
    <section class="udi-hero">
      <div class="page-width udi-hero-grid">
        <div>
          <span class="eyebrow"><Database :size="17" /> Local-first data layer</span>
          <h1>One index for every medication journey.</h1>
          <p>The ClearDose Universal Drug Index normalizes identity, package variants, fictional offers, broad related-record groups, and synthetic safety-review fixtures. The browser agent and the interface query the same local service.</p>
          <div class="udi-boundary"><ShieldCheck :size="20" /><span><strong>Designed for demonstration, not care.</strong> Prices and identifiers are fictional. Related records are not therapeutic equivalents. Interaction coverage is intentionally incomplete.</span></div>
        </div>
        <dl class="udi-metrics" aria-label="Universal Drug Index summary">
          <div><dt>Drug records</dt><dd>{{ summary.drugCount }}</dd></div>
          <div><dt>Package variants</dt><dd>{{ summary.variantCount }}</dd></div>
          <div><dt>Price offers</dt><dd>{{ summary.offerCount }}</dd></div>
          <div><dt>Persistence</dt><dd>Local</dd></div>
        </dl>
      </div>
    </section>

    <section class="page-width udi-workspace" data-agent-section="udi-search" aria-labelledby="udi-search-title">
      <div class="section-heading split-heading">
        <div><span class="eyebrow">Explore the index</span><h2 id="udi-search-title">Search recognizable drug records.</h2></div>
        <p>{{ results.length }} visible records from a deterministic bulk demo set. Search accepts generic names, brands, classes, categories, and UDI ids.</p>
      </div>
      <form class="udi-search-form" role="search" toolname="cleardose_filter_visible_drug_index" tooldescription="Populate the visible ClearDose UDI filters so the user can review matching fictional records on this page." toolautosubmit @submit.prevent>
        <label class="udi-query"><span>Search the UDI</span><div><Search :size="19" /><input v-model="query" name="query" autocomplete="off" toolparamdescription="Raw generic name, brand, category, class, or ClearDose UDI id" placeholder="Try lisinopril, Lipitor, or Statin" /></div></label>
        <label><span>Category</span><select v-model="category" name="category" toolparamdescription="Exact visible ClearDose category"><option v-for="item in store.state.categories" :key="item" :value="item">{{ item }}</option></select></label>
        <label><span>Drug class</span><select v-model="drugClass" name="drugClass" toolparamdescription="Optional exact visible drug class"><option value="">All classes</option><option v-for="item in store.state.drugClasses" :key="item" :value="item">{{ item }}</option></select></label>
      </form>

      <div class="udi-browser" data-agent-section="udi-results">
        <div class="udi-result-list" aria-label="Drug index results">
          <button v-for="drug in results" :key="drug.id" type="button" :class="{ selected: selectedDrugId === drug.id }" :aria-pressed="selectedDrugId === drug.id" @click="selectDrug(drug.id)">
            <span>{{ drug.category }}</span><strong>{{ drug.name }}</strong><small>Generic for {{ drug.genericFor }} · {{ drug.drugClass }}</small><em>from {{ formatMoney(drug.fromPrice) }}</em>
          </button>
        </div>

        <article v-if="selectedDrug" class="udi-detail" aria-live="polite">
          <span class="eyebrow">Selected UDI entry</span>
          <h2>{{ selectedDrug.name }}</h2>
          <p>{{ selectedDrug.description }}</p>
          <dl>
            <div><dt>UDI</dt><dd><code>{{ selectedDrug.identifiers.udi }}</code></dd></div>
            <div><dt>Class</dt><dd>{{ selectedDrug.drugClass }}</dd></div>
            <div><dt>Broad group</dt><dd>{{ selectedDrug.comparisonGroup }}</dd></div>
            <div><dt>Best fictional total</dt><dd>{{ formatMoney(priceComparison.lowestTotal) }}</dd></div>
          </dl>
          <h3>Indexed package offers</h3>
          <div class="udi-offers">
            <div v-for="offer in priceComparison.selections[0].variant.offers" :key="offer.id">
              <span>{{ offer.channel }}</span><strong>{{ formatMoney(offer.total) }}</strong><small>{{ offer.etaDays }} demo days · shipping {{ formatMoney(offer.shipping) }}</small>
            </div>
          </div>
          <RouterLink :to="`/medications/${selectedDrug.slug}`">Open medication page <ArrowRight :size="17" /></RouterLink>
        </article>
      </div>

      <section class="availability-workbench" data-agent-section="availability-results" aria-labelledby="availability-title">
        <div class="availability-heading"><div><span class="eyebrow"><MapPin :size="17" /> Seeded provider availability</span><h2 id="availability-title">Change the mock location. Keep the package exact.</h2></div><p>Each result uses the selected strength and quantity. ClearDose does not reserve inventory or promise delivery.</p></div>
        <form class="availability-controls" @submit.prevent="runAvailability">
          <label>Exact package<select v-model="selectedVariantId" name="availabilityVariantId"><option v-for="variant in selectedDrug?.variants" :key="variant.id" :value="variant.id">{{ variant.strength }} · {{ variant.quantity }} {{ variant.form }}</option></select></label>
          <label>Mock location<select v-model="locationId" name="demoLocationId"><option v-for="location in demoLocations" :key="location.id" :value="location.id">{{ location.label }} · {{ location.postalCode }}</option></select></label>
          <label>Fulfillment<select v-model="fulfillmentMode" name="fulfillmentMode"><option value="shipping">Shipping</option><option value="pickup">Pickup</option><option value="either">Best available</option></select></label>
          <label>Arrive within<input v-model.number="maxDeliveryDays" name="maxDeliveryDays" type="number" min="1" max="30" inputmode="numeric" /> demo days</label>
          <button class="button button-dark" type="submit"><Search :size="16" /> Check mock providers</button>
        </form>

        <div v-if="availabilityError" class="availability-error" role="alert"><CircleAlert :size="20" /><div><strong>{{ availabilityError.code }}</strong><p>{{ availabilityError.message }}</p><small v-if="availabilityError.recommendedTool">Next tool: {{ availabilityError.recommendedTool }}</small><button v-if="Object.keys(availabilityError.recoveryInput ?? {}).length" class="button button-outline" type="button" @click="recoverAvailability"><RefreshCw :size="16" /> Run the seeded recovery</button></div></div>

        <template v-if="availability">
          <div class="availability-summary"><span><strong>{{ availability.counts.in_stock }}</strong> in stock</span><span><strong>{{ availability.counts.low_stock }}</strong> low stock</span><span><strong>{{ availability.counts.unavailable }}</strong> unavailable</span><small>Seed time {{ availability.checkedAt }}</small></div>
          <div class="availability-provider-grid">
            <article v-for="offer in availability.offers" :key="offer.id" class="availability-provider-card" :class="`stock-${offer.inventory.status}`" data-availability-offer>
              <div><span>{{ offer.providerType }}</span><h3>{{ offer.providerName }}</h3><small>{{ offer.pricingModel }}</small></div>
              <strong class="availability-total">{{ offer.deliveredCashTotal == null ? 'Unavailable' : formatMoney(offer.deliveredCashTotal) }}</strong>
              <dl><div><dt>Cash package</dt><dd>{{ formatMoney(offer.cashPrice) }}</dd></div><div><dt>Shipping</dt><dd>{{ formatMoney(offer.shipping) }}</dd></div><div><dt>Illustrative insurance</dt><dd>{{ offer.estimatedInsurancePrice == null ? 'Not seeded' : formatMoney(offer.estimatedInsurancePrice) }}</dd></div><div><dt>Potential savings</dt><dd>{{ formatMoney(offer.potentialCashSavings) }}</dd></div></dl>
              <p><Truck :size="15" /> {{ deliveryLabel(offer) }}</p><p><MapPin :size="15" /> {{ pickupLocationLabel(offer) }}</p>
              <span class="availability-status">{{ offer.inventory.status.replaceAll('_', ' ') }}</span>
            </article>
          </div>
          <div v-if="availabilityRanking?.bestOption" class="availability-best"><Check :size="20" /><div><strong>Best eligible seeded option</strong><p>{{ availabilityRanking.bestOption.offer.providerName }} · {{ formatMoney(availabilityRanking.bestOption.estimatedTotal) }} · {{ availabilityRanking.bestOption.fulfillmentMode }} · {{ availabilityRanking.bestOption.arrivalDays }} demo days</p></div><code>{{ availabilityRanking.sourceVariant.id }}</code></div>
          <button v-if="availability.recovery" class="button button-outline" type="button" @click="recoverAvailability"><RefreshCw :size="16" /> Retry the seeded recovery location</button>
        </template>
      </section>
    </section>

    <section class="udi-lab" data-agent-section="udi-lab" aria-labelledby="udi-lab-title">
      <div class="page-width">
        <div class="section-heading split-heading"><div><span class="eyebrow"><Bot :size="17" /> Agent domain lab</span><h2 id="udi-lab-title">Useful beyond simple shopping.</h2></div><p>Each card maps to one non-overlapping WebMCP capability and the same deterministic UDI service used by the page.</p></div>
        <div class="udi-lab-grid">
          <article>
            <span class="udi-card-icon"><Search :size="20" /></span><h3>Related record discovery</h3><p>Find records in the same broad demo group, with explicit language that they are not substitutions.</p>
            <div class="udi-related-list"><span v-for="drug in related.related" :key="drug.id"><strong>{{ drug.name }}</strong><small>{{ drug.drugClass }}</small></span></div>
            <code>cleardose_find_related_drugs</code>
          </article>

          <article>
            <span class="udi-card-icon"><CircleAlert :size="20" /></span><h3>Synthetic interaction review</h3><p>Demonstrate incomplete-data handling and required pharmacist escalation without implying "no flag" means safe.</p>
            <label>First record<select v-model="interactionLeft" name="interaction-left-drug"><option v-for="drug in store.state.medications" :key="drug.id" :value="drug.id">{{ drug.name }}</option></select></label>
            <label>Second record<select v-model="interactionRight" name="interaction-right-drug"><option v-for="drug in store.state.medications" :key="drug.id" :value="drug.id">{{ drug.name }}</option></select></label>
            <button class="button button-dark" type="button" @click="runInteractionReview">Review demo flags</button>
            <div v-if="interactionReview" class="udi-result-box"><strong>{{ interactionReview.flags.length }} synthetic flag(s)</strong><span>{{ interactionReview.flags[0]?.message ?? 'No fixture matched. Coverage remains incomplete and professional review is required.' }}</span></div>
            <code>cleardose_review_demo_interaction_flags</code>
          </article>

          <article>
            <span class="udi-card-icon"><Package :size="20" /></span><h3>Local procurement planning</h3><p>Turn a requested medication list into a fictional price and fulfillment plan. Planning never places an order.</p>
            <label>Second requested record<select v-model="planSecondDrugId" name="plan-second-drug"><option v-for="drug in store.state.medications" :key="drug.id" :value="drug.id">{{ drug.name }}</option></select></label>
            <label>Planning strategy<select v-model="planStrategy" name="plan-strategy"><option value="lowest_total">Lowest delivered total</option><option value="fewest_shipments">Fewest channels</option><option value="balanced">Balanced cost and speed</option></select></label>
            <button class="button button-orange" type="button" @click="buildPlan">Build local plan</button>
            <div v-if="procurementPlan" class="udi-result-box success"><Check :size="18" /><strong>{{ formatMoney(procurementPlan.estimatedTotal) }} estimated</strong><span>{{ procurementPlan.channels.join(', ') }} · no order placed</span></div>
            <code>cleardose_build_procurement_plan</code>
          </article>
        </div>
      </div>
    </section>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
