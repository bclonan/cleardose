<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ArrowRight, Check, ClipboardList, Mail, PackageCheck, Stethoscope } from "@lucide/vue";
import { formatMoney, usePharmacyStore } from "../composables/usePharmacyStore";

const route = useRoute();
const store = usePharmacyStore();
const order = computed(() => store.state.orders.find((item) => item.id === route.params.id));
</script>

<template>
  <div v-if="order" class="confirmation-page">
    <section class="confirmation-hero">
      <div class="confirmation-check"><Check :size="40" /></div>
      <span class="eyebrow">Mock order created</span>
      <h1>We have the order.<br />Next comes the prescription.</h1>
      <p>Order <strong>{{ order.id }}</strong> was saved in this browser for {{ formatMoney(order.total) }}. Nothing was transmitted or charged.</p>
      <div class="confirmation-actions"><RouterLink class="button button-light" :to="`/account/orders/${order.id}`">View order details <ArrowRight :size="18" /></RouterLink><RouterLink class="button button-outline-light" to="/account">Go to account</RouterLink></div>
    </section>

    <section class="page-width confirmation-next">
      <div class="section-heading centered-heading"><span class="eyebrow">What happens next</span><h2>A clear handoff, at every step.</h2></div>
      <div class="process-grid confirmation-process">
        <article><span class="process-number">01</span><Stethoscope :size="28" /><h3>Prescription match</h3><p>{{ order.prescriptionMethod === 'on-file' ? 'The demo checks the seeded account for a ready prescription.' : 'The order waits for a mock provider or transfer event.' }}</p></article>
        <article><span class="process-number">02</span><ClipboardList :size="28" /><h3>Pharmacy review</h3><p>Once matched, the order advances to a visible verification state.</p></article>
        <article><span class="process-number">03</span><PackageCheck :size="28" /><h3>Pack and deliver</h3><p>A tracking number and delivery milestones appear in the patient account.</p></article>
      </div>
      <div class="confirmation-email-note"><Mail :size="21" /><div><strong>Demo email queued for {{ store.currentCustomer?.email }}</strong><p>No message is actually sent. This is the success state a real integration could trigger.</p></div></div>
    </section>
  </div>
  <div v-else class="protected-state page-width"><h1>Order confirmation not found.</h1><RouterLink class="button button-dark" to="/account/orders">View orders</RouterLink></div>
</template>
