<script setup>
import { computed, ref, watch } from "vue";
import { ArrowRight, Check, CircleDollarSign, Equal, Scale } from "@lucide/vue";
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
const rightId = ref(props.initialRightId || adapter.value.defaultRight(store.medications));
const leftVariantId = ref("");
const rightVariantId = ref("");
const announcement = ref("Comparison ready.");
const leftMedication = computed(() => store.medicationById(leftId.value));
const rightMedication = computed(() => store.medicationById(rightId.value));

watch(leftMedication, (medication) => { leftVariantId.value = medication?.variants[0]?.id ?? ""; }, { immediate: true });
watch(rightMedication, (medication) => { rightVariantId.value = medication?.variants[0]?.id ?? ""; }, { immediate: true });

const comparison = computed(() => store.compareMedications({
  leftMedicationId: leftId.value,
  rightMedicationId: rightId.value,
  leftVariantId: leftVariantId.value,
  rightVariantId: rightVariantId.value,
}));

const declarativeTool = {
  name: "populate_visible_price_comparison",
  description: "Populate the visible side-by-side comparison controls so the user can review two fictional medication packages on this page.",
  autoSubmit: true,
};

function confirmComparison() {
  if (!comparison.value) return;
  announcement.value = `Compared ${comparison.value.left.medication.name} and ${comparison.value.right.medication.name}.`;
}
</script>

<template>
  <section class="comparison-panel" :class="{ compact }" data-agent-section="comparison-results" aria-labelledby="comparison-title">
    <div class="comparison-heading">
      <div><span class="eyebrow"><Scale :size="17" /> Side-by-side facts</span><h2 id="comparison-title">Compare transparent mock prices.</h2></div>
      <p>Illustrative price facts only. ClearDose never presents these medications as therapeutic substitutes.</p>
    </div>

    <AgentReadyForm
      class="comparison-form"
      form-name="medication_price_comparison"
      mcp-mode="declarative"
      :declarative-tool="declarativeTool"
      @submit="confirmComparison"
    >
      <fieldset>
        <legend class="sr-only">Choose two medications and variants to compare</legend>
        <div class="comparison-picker">
          <label for="compare-left-medication">First medication
            <select id="compare-left-medication" v-model="leftId" name="leftMedicationId" toolparamdescription="First ClearDose medication to compare">
              <option v-for="medication in store.medications" :key="medication.id" :value="medication.id">{{ medication.name }}</option>
            </select>
          </label>
          <label for="compare-left-variant">First variant
            <select id="compare-left-variant" v-model="leftVariantId" name="leftVariantId" toolparamdescription="Strength and quantity for the first medication">
              <option v-for="variant in leftMedication?.variants" :key="variant.id" :value="variant.id">{{ variant.strength }} · {{ variant.quantity }} {{ variant.form }}</option>
            </select>
          </label>
        </div>
        <span class="comparison-versus" aria-hidden="true">VS</span>
        <div class="comparison-picker">
          <label for="compare-right-medication">Second medication
            <select id="compare-right-medication" v-model="rightId" name="rightMedicationId" toolparamdescription="Second ClearDose medication to compare">
              <option v-for="medication in store.medications" :key="medication.id" :value="medication.id">{{ medication.name }}</option>
            </select>
          </label>
          <label for="compare-right-variant">Second variant
            <select id="compare-right-variant" v-model="rightVariantId" name="rightVariantId" toolparamdescription="Strength and quantity for the second medication">
              <option v-for="variant in rightMedication?.variants" :key="variant.id" :value="variant.id">{{ variant.strength }} · {{ variant.quantity }} {{ variant.form }}</option>
            </select>
          </label>
        </div>
        <button class="sr-only" type="submit">Update comparison</button>
      </fieldset>
    </AgentReadyForm>

    <div v-if="comparison" class="comparison-results">
      <article class="comparison-drug-card">
        <span class="comparison-side-label">First selection</span>
        <h3>{{ comparison.left.medication.name }}</h3>
        <p>Generic for {{ comparison.left.medication.genericFor }}</p>
        <div class="comparison-main-price"><span>ClearDose price</span><strong>{{ formatMoney(comparison.left.variant.price) }}</strong></div>
        <dl><div><dt>Variant</dt><dd>{{ comparison.left.variant.strength }} · {{ comparison.left.variant.quantity }} count</dd></div><div><dt>Typical retail</dt><dd>{{ formatMoney(comparison.left.variant.retail) }}</dd></div><div><dt>Illustrative savings</dt><dd>{{ formatMoney(comparison.left.savings) }} · {{ comparison.left.savingsPercent }}%</dd></div></dl>
        <RouterLink :to="`/medications/${comparison.left.medication.slug}`">Review medication <ArrowRight :size="17" /></RouterLink>
      </article>

      <div class="comparison-delta" aria-label="Absolute price difference">
        <span><Equal :size="19" /></span><small>Price difference</small><strong>{{ formatMoney(comparison.priceDifference) }}</strong>
      </div>

      <article class="comparison-drug-card comparison-drug-card-alt">
        <span class="comparison-side-label">Second selection</span>
        <h3>{{ comparison.right.medication.name }}</h3>
        <p>Generic for {{ comparison.right.medication.genericFor }}</p>
        <div class="comparison-main-price"><span>ClearDose price</span><strong>{{ formatMoney(comparison.right.variant.price) }}</strong></div>
        <dl><div><dt>Variant</dt><dd>{{ comparison.right.variant.strength }} · {{ comparison.right.variant.quantity }} count</dd></div><div><dt>Typical retail</dt><dd>{{ formatMoney(comparison.right.variant.retail) }}</dd></div><div><dt>Illustrative savings</dt><dd>{{ formatMoney(comparison.right.savings) }} · {{ comparison.right.savingsPercent }}%</dd></div></dl>
        <RouterLink :to="`/medications/${comparison.right.medication.slug}`">Review medication <ArrowRight :size="17" /></RouterLink>
      </article>
    </div>
    <div class="comparison-safety"><CircleDollarSign :size="19" /><span><strong>Price comparison, not medical guidance.</strong> Ask a licensed prescriber about clinical alternatives.</span><Check :size="18" /></div>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </section>
</template>
