<script setup>
import { computed } from "vue";
import { ArrowRight, Pill } from "@lucide/vue";
import { formatMoney } from "../composables/usePharmacyStore";

const props = defineProps({
  medication: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});

const variant = computed(() => props.medication.variants[0]);
const savings = computed(() => variant.value.retail - variant.value.price);
</script>

<template>
  <RouterLink class="medication-card" :class="{ compact }" :to="`/medications/${medication.slug}`">
    <div class="medication-card-top">
      <span class="medication-icon"><Pill :size="23" /></span>
      <span class="generic-badge">Generic</span>
    </div>
    <div class="medication-card-copy">
      <span class="medication-category">{{ medication.category }}</span>
      <h3>{{ medication.name }}</h3>
      <p>Generic for {{ medication.genericFor }}</p>
      <span class="medication-spec">{{ variant.form }} · {{ variant.strength }} · {{ variant.quantity }} count</span>
    </div>
    <div class="medication-card-price">
      <div>
        <span>Your price</span>
        <strong>{{ formatMoney(variant.price) }}</strong>
      </div>
      <div class="savings-copy">
        <span>Retail {{ formatMoney(variant.retail) }}</span>
        <em>Save {{ formatMoney(savings) }}</em>
      </div>
      <span class="card-arrow"><ArrowRight :size="19" /></span>
    </div>
  </RouterLink>
</template>
