<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ArrowLeft, Check, Clock3, MapPin, Package, Truck } from "@lucide/vue";
import StatusBadge from "../components/StatusBadge.vue";
import { formatMoney, usePharmacyStore } from "../composables/usePharmacyStore";

const route = useRoute();
const store = usePharmacyStore();
const order = computed(() => store.state.orders.find((item) => item.id === route.params.id && item.customerId === store.currentCustomer.value?.id));
const stage = computed(() => ({ "waiting-for-prescription": 1, processing: 2, shipped: 3, delivered: 4 }[order.value?.status] ?? 1));
</script>

<template>
  <div v-if="order" class="page-width order-detail-page">
    <RouterLink class="text-link" to="/account/orders"><ArrowLeft :size="17" /> All orders</RouterLink>
    <div class="order-detail-heading"><div><span class="eyebrow">Order {{ order.id }}</span><h1>{{ order.status === 'delivered' ? 'Delivered to your door.' : 'Your order is moving.' }}</h1><p>Placed {{ order.placedAt }}</p></div><StatusBadge :status="order.status" /></div>

    <section class="tracking-card">
      <div class="tracking-stage" :class="{ complete: stage >= 1 }"><span><Check v-if="stage > 1" :size="16" /><Clock3 v-else :size="18" /></span><div><strong>Prescription</strong><small>{{ stage > 1 ? 'Verified' : 'Waiting for provider' }}</small></div></div>
      <i :class="{ complete: stage > 1 }"></i>
      <div class="tracking-stage" :class="{ complete: stage >= 2 }"><span><Check v-if="stage > 2" :size="16" /><Package v-else :size="18" /></span><div><strong>Pharmacy</strong><small>{{ stage > 2 ? 'Packed' : stage === 2 ? 'In review' : 'Not started' }}</small></div></div>
      <i :class="{ complete: stage > 2 }"></i>
      <div class="tracking-stage" :class="{ complete: stage >= 3 }"><span><Check v-if="stage > 3" :size="16" /><Truck v-else :size="18" /></span><div><strong>Shipping</strong><small>{{ stage > 3 ? 'Complete' : stage === 3 ? 'In transit' : 'Not started' }}</small></div></div>
      <i :class="{ complete: stage > 3 }"></i>
      <div class="tracking-stage" :class="{ complete: stage >= 4 }"><span><Check v-if="stage >= 4" :size="16" /><MapPin v-else :size="18" /></span><div><strong>Delivery</strong><small>{{ stage >= 4 ? order.deliveredAt : 'Estimated after shipment' }}</small></div></div>
    </section>

    <div class="order-detail-grid">
      <section class="order-detail-card">
        <h2>Medications</h2>
        <div v-for="item in order.items" :key="item.variantId" class="order-line-item"><span class="list-icon"><Package :size="20" /></span><div><strong>{{ item.name }}</strong><span>{{ item.form }} · {{ item.strength }} · {{ item.quantity }} count</span></div><strong>{{ formatMoney(item.price * item.units) }}</strong></div>
      </section>
      <aside class="order-detail-card order-receipt">
        <h2>Order total</h2><div><span>Medication</span><strong>{{ formatMoney(order.subtotal) }}</strong></div><div><span>Shipping</span><strong>{{ formatMoney(order.shipping) }}</strong></div><div><span>Tax</span><strong>{{ formatMoney(order.tax) }}</strong></div><div class="summary-total"><span>Total</span><strong>{{ formatMoney(order.total) }}</strong></div>
      </aside>
      <section class="order-detail-card"><h2>Delivery address</h2><div class="address-block"><MapPin :size="20" /><p>{{ order.address.line1 }} {{ order.address.line2 }}<br />{{ order.address.city }}, {{ order.address.state }} {{ order.address.zip }}</p></div></section>
      <section v-if="order.tracking" class="order-detail-card"><h2>Tracking</h2><p class="tracking-number"><Truck :size="20" /><span><small>Demo tracking number</small><strong>{{ order.tracking }}</strong></span></p></section>
    </div>
  </div>
  <div v-else class="protected-state page-width"><h1>Order not found.</h1><RouterLink class="button button-dark" to="/account/orders">Back to orders</RouterLink></div>
</template>
