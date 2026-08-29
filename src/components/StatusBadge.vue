<script setup>
import { computed } from "vue";

const props = defineProps({ status: { type: String, required: true } });
const label = computed(() => ({
  ready: "Ready to order",
  processing: "Pharmacy review",
  "needs-renewal": "Renewal needed",
  delivered: "Delivered",
  shipped: "Shipped",
  "waiting-for-prescription": "Waiting for prescription",
}[props.status] ?? props.status));
</script>

<template>
  <span class="status-badge" :class="`status-${status}`"><span></span>{{ label }}</span>
</template>
