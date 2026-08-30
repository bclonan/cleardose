<script setup>
import { computed, ref, watch } from "vue";
import { ArrowRight, CircleDollarSign, FileText, MapPin, Scale, ShieldCheck, Truck } from "@lucide/vue";
import AgentReadyForm from "./AgentReadyForm.vue";
import { formatMoney, usePharmacyStore } from "../composables/usePharmacyStore";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { comparisonPanelAdapter } from "../presentation/adapters/componentAdapters";

const props = defineProps({
  ...agentReadyProps,
  compact: { type: Boolean, default: false },
  initialLeftId: { type: String, default: "" },
  initialRightId: { type: String, default: "" },
});
const store = usePharmacyStore();
const { adapter } = useAgentReadyComponent(props, { name: "comparison_panel", defaultAdapter: comparisonPanelAdapter });
const leftId = ref(props.initialLeftId || adapter.value.defaultLeft(store.medications));
const rightId = ref(props.initialRightId || leftId.value);
const purpose = ref("price");
const locationId = ref("demo-baltimore");
const leftVariantId = ref("");
const rightVariantId = ref("");
const comparison = ref(null);
const comparisonError = ref(null);
const doctorCard = ref(null);
const doctorCardError = ref("");
const buildingDoctorCard = ref(false);
const selectedOfferId = ref("");
const announcement = ref("Semantic comparison ready.");

const leftMedication = computed(() => store.medicationById(leftId.value));
const rightMedication = computed(() => store.medicationById(rightId.value));
const compatible = computed(() => {
  try { return store.listCompatibleOptions({ drugId: leftId.value, purpose: purpose.value }); }
  catch { return null; }
});
const candidateOptions = computed(() => {
  if (!compatible.value) return [];
  return [compatible.value.sameDrugProviderComparison, ...compatible.value.options.filter((item) => item.eligibleForPurpose)];
});
const relationship = computed(() => comparison.value?.relationships?.[0] ?? compatible.value?.sameDrugProviderComparison?.relationship ?? null);
const selectedProviderOffer = computed(() => comparison.value?.selections?.[0]?.offers.find((offer) => offer.id === selectedOfferId.value) ?? null);
const demoLocations = computed(() => store.state.drugIndexSummary?.demoLocations ?? []);
const comparisonStatuses = computed(() => {
  if (!comparison.value || !relationship.value) return [];
  if (relationship.value.kind === "same_drug") {
    return ["Same indexed drug", "Same active ingredient", comparison.value.selections[0]?.drug.genericFor ? "Generic with brand reference" : "Single normalized identity"];
  }
  const classes = new Set(comparison.value.selections.map((selection) => selection.drug.drugClass));
  return [classes.size === 1 ? "Same seeded class discussion" : "Explicit clinician discussion link", "Clinically related, not equivalent", "No substitution ranking"];
});

watch(leftMedication, (medication) => {
  leftVariantId.value = medication?.variants[0]?.id ?? "";
  const candidate = candidateOptions.value.find((item) => item.drugId !== medication?.id) ?? candidateOptions.value[0];
  rightId.value = candidate?.drugId ?? medication?.id ?? "";
}, { immediate: true });
watch(rightMedication, (medication) => { rightVariantId.value = medication?.variants[0]?.id ?? ""; }, { immediate: true });
watch([purpose, candidateOptions], () => {
  if (!candidateOptions.value.some((item) => item.drugId === rightId.value)) rightId.value = candidateOptions.value[0]?.drugId ?? leftId.value;
});
watch([leftId, rightId, leftVariantId, rightVariantId, purpose, locationId], () => updateComparison(), { immediate: true });

const declarativeTool = {
  name: "cleardose_populate_visible_price_comparison",
  description: "Populate the visible semantic comparison with an explicitly compatible fictional medication or provider set.",
  autoSubmit: true,
};

function updateComparison() {
  comparisonError.value = null;
  try {
    const providerMode = leftId.value === rightId.value || purpose.value === "price" || purpose.value === "fulfillment";
    comparison.value = store.compareMedicationOptions(providerMode ? {
      drugIds: [leftId.value],
      variantIds: { [leftId.value]: leftVariantId.value },
      purpose: purpose.value,
      locationId: locationId.value,
    } : {
      leftDrugId: leftId.value,
      rightDrugId: rightId.value,
      leftVariantId: leftVariantId.value,
      rightVariantId: rightVariantId.value,
      purpose: purpose.value,
      locationId: locationId.value,
    });
    if (!comparison.value.selections[0]?.offers.some((offer) => offer.id === selectedOfferId.value)) {
      selectedOfferId.value = comparison.value.selections[0]?.offers.find((offer) => offer.inventory.status !== "unavailable")?.id ?? comparison.value.selections[0]?.offers[0]?.id ?? "";
    }
    announcement.value = `Compared ${comparison.value.selections.map((item) => item.drug.name).join(" and ")} using explicit seeded compatibility.`;
  } catch (error) {
    comparison.value = null;
    comparisonError.value = typeof error?.toStructuredContent === "function" ? error.toStructuredContent() : { code: error?.code ?? "COMPARISON_FAILED", message: error instanceof Error ? error.message : "Comparison failed." };
    announcement.value = comparisonError.value.message;
  }
}

function fulfillmentLabel(offer) {
  const shipping = offer.fulfillment.shipping;
  const pickup = offer.fulfillment.pickup;
  if (shipping.available && shipping.deliveryWindow) return `${shipping.deliveryWindow.minDays} to ${shipping.deliveryWindow.maxDays} demo days`;
  if (pickup.available) return `Pickup in ${pickup.estimatedFulfillmentMinutes} minutes`;
  return offer.inventory.estimatedRestockOn ? `Restock ${offer.inventory.estimatedRestockOn}` : "Unavailable";
}

async function buildDoctorDiscussionCard() {
  if (!comparison.value || buildingDoctorCard.value) return;
  buildingDoctorCard.value = true;
  doctorCardError.value = "";
  try {
    const relatedDrugIds = comparison.value.selections.map((selection) => selection.drug.id).filter((id) => id !== leftId.value).slice(0, 3);
    const exchange = await store.prepareDoctorQuestionCard({
      drugId: leftId.value,
      relatedDrugIds,
      concerns: ["What cost and availability facts should I understand?", "Which common side effects, warnings, and monitoring questions should we discuss?"],
    });
    doctorCard.value = await store.submitDoctorQuestionCard({
      exchangeId: exchange.id,
      title: `Questions about ${leftMedication.value?.name ?? "my fictional medication"}`,
      questions: [
        "Which benefits, risks, warnings, and monitoring needs should we discuss before I consider any change?",
        "How should the fictional cost and availability differences factor into our discussion?",
      ],
    });
    announcement.value = "A structured local discussion card is ready for human review. Nothing was sent.";
  } catch (error) {
    doctorCardError.value = error instanceof Error ? error.message : "The local discussion card could not be prepared.";
    announcement.value = doctorCardError.value;
  } finally {
    buildingDoctorCard.value = false;
  }
}
</script>

<template>
  <section class="comparison-panel semantic-comparison" :class="{ compact }" data-agent-section="comparison-results" aria-labelledby="comparison-title">
    <div class="comparison-heading">
      <div><span class="eyebrow"><Scale :size="17" /> Explicit compatibility</span><h2 id="comparison-title">Compare the same drug across providers, or review a seeded discussion pair.</h2></div>
      <p>ClearDose never puts unrelated medications side by side. Price and fulfillment rankings use the same indexed drug and exact package.</p>
    </div>

    <AgentReadyForm class="comparison-form semantic-comparison-form" form-name="medication_price_comparison" mcp-mode="declarative" :declarative-tool="declarativeTool" @submit="updateComparison">
      <fieldset>
        <legend class="sr-only">Choose an anchor medication and an allowed comparison</legend>
        <label>Anchor medication
          <select v-model="leftId" name="leftMedicationId" toolparamdescription="Anchor ClearDose medication">
            <option v-for="medication in store.medications" :key="medication.id" :value="medication.id">{{ medication.name }}</option>
          </select>
        </label>
        <label>Comparison purpose
          <select v-model="purpose" name="purpose" toolparamdescription="Explicit comparison purpose">
            <option value="price">Provider price</option>
            <option value="fulfillment">Provider fulfillment</option>
            <option value="facts">Structured facts</option>
            <option value="doctor_discussion">Doctor discussion</option>
          </select>
        </label>
        <label>Allowed comparison
          <select v-model="rightId" name="rightMedicationId" toolparamdescription="Only explicitly compatible seeded records">
            <option v-for="option in candidateOptions" :key="`${option.drugId}:${option.relationship.kind}`" :value="option.drugId">
              {{ option.drug?.name ?? leftMedication?.name }} · {{ option.relationship.kind === 'same_drug' ? 'same drug, provider offers' : 'discussion only' }}
            </option>
          </select>
        </label>
        <label>Exact anchor package
          <select v-model="leftVariantId" name="leftVariantId" toolparamdescription="Exact indexed strength and quantity">
            <option v-for="variant in leftMedication?.variants" :key="variant.id" :value="variant.id">{{ variant.strength }} · {{ variant.quantity }} {{ variant.form }}</option>
          </select>
        </label>
        <label v-if="rightId !== leftId">Exact discussion package
          <select v-model="rightVariantId" name="rightVariantId" toolparamdescription="Exact indexed package for the second record">
            <option v-for="variant in rightMedication?.variants" :key="variant.id" :value="variant.id">{{ variant.strength }} · {{ variant.quantity }} {{ variant.form }}</option>
          </select>
        </label>
        <label>Mock location
          <select v-model="locationId" name="locationId" toolparamdescription="Seeded demo location and ZIP code">
            <option v-for="location in demoLocations" :key="location.id" :value="location.id">{{ location.label }} · {{ location.postalCode }}</option>
          </select>
        </label>
        <button class="button button-dark" type="submit">Update semantic comparison</button>
      </fieldset>
    </AgentReadyForm>

    <div v-if="relationship" class="comparison-relationship" :class="{ 'discussion-only': relationship.kind !== 'same_drug' }">
      <ShieldCheck :size="20" />
      <div><strong>{{ relationship.kind === 'same_drug' ? 'Same indexed drug' : 'Clinician discussion only' }}</strong><p>{{ relationship.explanation }}</p></div>
      <code>{{ relationship.reasonCode }}</code>
      <div class="comparison-status-row"><span v-for="status in comparisonStatuses" :key="status">{{ status }}</span></div>
    </div>

    <div v-if="comparisonError" class="comparison-domain-error" role="alert">
      <strong>{{ comparisonError.code }}</strong><p>{{ comparisonError.message }}</p><small v-if="comparisonError.recommendedTool">Recovery: {{ comparisonError.recommendedTool }}</small>
    </div>

    <template v-if="comparison">
      <div v-if="comparison.selections.length === 1" class="provider-comparison-context"><div><span>Exact indexed medication</span><strong>{{ comparison.selections[0].drug.name }}</strong><small>{{ comparison.selections[0].drug.activeIngredient.name }} · {{ comparison.selections[0].drug.manufacturer.name }}</small></div><div><span>Mock location</span><strong>{{ comparison.location.label }}</strong><small>{{ comparison.location.postalCode }} · fictional</small></div></div>
      <div v-if="comparison.selections.length === 1" class="provider-comparison-grid" data-agent-section="availability-results">
        <article v-for="offer in comparison.selections[0].offers" :key="offer.id" class="provider-offer-card" :class="{ selected: selectedOfferId === offer.id }" data-availability-offer>
          <div class="provider-offer-heading"><span>{{ offer.providerType }}</span><strong>{{ offer.providerName }}</strong><small>{{ offer.pricingModel }}</small></div>
          <div class="provider-offer-price"><span>Cash package</span><strong>{{ formatMoney(offer.cashPrice) }}</strong><small>{{ comparison.selections[0].variant.strength }} · {{ comparison.selections[0].variant.quantity }} {{ comparison.selections[0].variant.form }}</small></div>
          <dl>
            <div><dt>Illustrative insurance</dt><dd>{{ offer.estimatedInsurancePrice == null ? 'Not seeded' : formatMoney(offer.estimatedInsurancePrice) }}</dd></div>
            <div><dt>Cost-plus style</dt><dd>{{ offer.costPlusStylePrice == null ? 'Not offered' : formatMoney(offer.costPlusStylePrice) }}</dd></div>
            <div><dt>Typical retail</dt><dd>{{ formatMoney(offer.typicalRetailPrice) }}</dd></div>
             <div><dt>Potential cash savings</dt><dd>{{ formatMoney(offer.potentialCashSavings) }}</dd></div>
             <div><dt>Delivered total</dt><dd>{{ offer.deliveredCashTotal == null ? 'Unavailable' : formatMoney(offer.deliveredCashTotal) }}</dd></div>
             <div><dt>Pickup</dt><dd>{{ offer.fulfillment.pickup.available ? `${offer.fulfillment.pickup.estimatedFulfillmentMinutes} minutes` : 'Unavailable' }}</dd></div>
             <div><dt>Shipping</dt><dd>{{ offer.fulfillment.shipping.available ? fulfillmentLabel(offer) : 'Unavailable' }}</dd></div>
             <div><dt>Approximate distance</dt><dd>{{ offer.fulfillment.pickup.distanceMiles == null ? 'Not available' : `${offer.fulfillment.pickup.distanceMiles} miles` }}</dd></div>
             <div><dt>Estimated restock</dt><dd>{{ offer.inventory.estimatedRestockOn || 'Not needed' }}</dd></div>
          </dl>
          <div class="provider-availability"><span :class="`stock-${offer.inventory.status}`">{{ offer.inventory.status.replaceAll('_', ' ') }}</span><small><Truck :size="14" /> {{ fulfillmentLabel(offer) }}</small><small><MapPin :size="14" /> {{ offer.location.label }} · {{ offer.location.postalCode }}</small></div>
          <label class="provider-offer-select"><input v-model="selectedOfferId" type="radio" name="selectedProviderOffer" :value="offer.id" /> Review this offer</label>
          <details><summary>Price breakdown</summary><dl><div><dt>Ingredient</dt><dd>{{ formatMoney(offer.priceBreakdown.ingredientCost) }}</dd></div><div><dt>Provider fee</dt><dd>{{ formatMoney(offer.priceBreakdown.providerFee) }}</dd></div><div><dt>Shipping</dt><dd>{{ formatMoney(offer.shipping) }}</dd></div></dl></details>
        </article>
      </div>

      <div v-if="selectedProviderOffer && comparison.selections.length === 1" class="selected-provider-summary"><ShieldCheck :size="19" /><span><strong>Selected for review: {{ selectedProviderOffer.providerName }}</strong> Exact package {{ comparison.selections[0].variant.strength }} · {{ comparison.selections[0].variant.quantity }}. This does not reserve inventory or change the cart.</span></div>

      <div v-if="comparison.selections.length" class="semantic-fact-grid">
        <article v-for="selection in comparison.selections" :key="selection.drug.id" class="semantic-drug-card">
          <span class="clinical-sample-label">Sample clinical data · incomplete</span>
          <h3>{{ selection.drug.name }}</h3>
          <p>{{ selection.drug.activeIngredient.name }} · {{ selection.drug.manufacturer.name }}</p>
          <dl><div><dt>Package</dt><dd>{{ selection.variant.strength }} · {{ selection.variant.quantity }} {{ selection.variant.form }}</dd></div><div><dt>Fictional cash offer</dt><dd>{{ selection.bestOffer ? formatMoney(selection.bestOffer.cashPrice) : 'Unavailable' }}</dd></div></dl>
          <div class="clinical-fact-columns">
            <div><strong>Common uses in sample</strong><ul><li v-for="item in selection.commonUses" :key="item">{{ item }}</li></ul></div>
            <div><strong>Common side effects in sample</strong><ul><li v-for="item in selection.commonSideEffects" :key="item">{{ item }}</li></ul></div>
          </div>
          <div class="clinical-warning-list"><strong>Important warnings in sample</strong><ul><li v-for="item in selection.importantWarnings" :key="item">{{ item }}</li></ul></div>
          <div class="doctor-discussion-list"><strong>Questions to discuss with a clinician</strong><ul><li v-for="item in selection.discussionPoints" :key="item">{{ item }}</li></ul></div>
          <a v-if="selection.clinicalSample.source" :href="selection.clinicalSample.source.url" target="_blank" rel="noreferrer">Review the seeded label source <ArrowRight :size="15" /></a>
        </article>
      </div>

      <div class="comparison-safety"><CircleDollarSign :size="19" /><span><strong>{{ comparison.rankable ? `Provider spread: ${formatMoney(comparison.priceDifference)}` : 'No price ranking for discussion-only records.' }}</strong> {{ comparison.disclaimer }}</span></div>
      <div class="comparison-doctor-action">
        <div><strong>Turn these structured facts into questions.</strong><p>The local workflow uses trusted seeded price, availability, and sample clinical fields. It leaves the result in human review and contacts no clinician.</p></div>
        <button class="button button-primary" type="button" :disabled="buildingDoctorCard" @click="buildDoctorDiscussionCard"><FileText :size="17" /> {{ buildingDoctorCard ? 'Preparing card...' : 'Build a doctor discussion card' }}</button>
      </div>
      <p v-if="doctorCardError" class="comparison-domain-error" role="alert">{{ doctorCardError }}</p>
      <CdDoctorQuestionCard v-if="doctorCard" :card="doctorCard" @review="store.markQuestionCardReviewed" />
    </template>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </section>
</template>
