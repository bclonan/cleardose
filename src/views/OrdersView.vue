<script setup>
import { computed } from "vue";
import { ArrowRight, Package } from "@lucide/vue";
import AccountNav from "../components/AccountNav.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { formatMoney, usePharmacyStore } from "../composables/usePharmacyStore";

const store = usePharmacyStore();
const orders = computed(() => store.customerOrders());
</script>

<template>
  <div v-if="store.currentCustomer.value" class="account-page account-subpage">
    <div class="account-welcome compact-welcome"><div class="page-width"><span class="eyebrow">Patient account</span><h1>Orders</h1><p>Follow every mock order from pharmacy review to delivery.</p></div></div>
    <div class="page-width account-layout">
      <AccountNav />
      <div class="account-content">
        <div v-if="orders.length" class="orders-list">
          <RouterLink v-for="order in orders" :key="order.id" :to="`/account/orders/${order.id}`" class="order-list-card">
            <span class="order-package-icon"><Package :size="24" /></span>
            <div class="order-list-main"><span>Order {{ order.id }}</span><strong>{{ order.items.map((item) => item.name).join(', ') }}</strong><small>Placed {{ order.placedAt }} · {{ order.items.length }} item{{ order.items.length === 1 ? '' : 's' }}</small></div>
            <StatusBadge :status="order.status" />
            <strong class="order-list-total">{{ formatMoney(order.total) }}</strong>
            <ArrowRight :size="19" />
          </RouterLink>
        </div>
        <div v-else class="empty-state"><span class="empty-icon"><Package :size="30" /></span><h2>No orders yet.</h2><p>Complete the checkout flow to create one.</p><RouterLink class="button button-dark" to="/medications">Browse medications</RouterLink></div>
      </div>
    </div>
  </div>
  <div v-else class="protected-state page-width"><h1>Sign in to view orders.</h1><RouterLink class="button button-orange" to="/login">Open demo account <ArrowRight :size="18" /></RouterLink></div>
</template>
