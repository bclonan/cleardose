<script setup>
import { computed, reactive, ref, watch } from "vue";
import {
  ArrowRight,
  Check,
  ClipboardList,
  MapPin,
  Package,
  Pencil,
  ShoppingCart,
  Stethoscope,
} from "@lucide/vue";
import AccountNav from "../components/AccountNav.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { formatMoney, usePharmacyStore } from "../composables/usePharmacyStore";

const store = usePharmacyStore();
const orders = computed(() => store.customerOrders());
const prescriptions = computed(() => store.customerPrescriptions());
const editing = ref(false);
const saved = ref(false);
const profile = reactive({ phone: "", line1: "", line2: "", city: "", state: "", zip: "" });

watch(
  () => store.currentCustomer,
  (customer) => {
    if (!customer) return;
    Object.assign(profile, { phone: customer.phone, ...customer.address });
  },
  { immediate: true },
);

function saveProfile() {
  store.updateCurrentCustomer({
    phone: profile.phone,
    address: { line1: profile.line1, line2: profile.line2, city: profile.city, state: profile.state, zip: profile.zip },
  });
  editing.value = false;
  saved.value = true;
  window.setTimeout(() => { saved.value = false; }, 2200);
}
</script>

<template>
  <div v-if="store.currentCustomer" class="account-page">
    <div class="account-welcome">
      <div class="page-width">
        <span class="eyebrow">Patient account</span>
        <h1>Good afternoon, {{ store.currentCustomer.firstName }}.</h1>
        <p>Here is what is happening with your mock prescriptions and deliveries.</p>
      </div>
    </div>

    <div class="page-width account-layout">
      <AccountNav />
      <div class="account-content">
        <div class="account-stat-grid">
          <RouterLink to="/account/prescriptions" class="account-stat-card">
            <span class="stat-icon stat-orange"><ClipboardList :size="22" /></span>
            <div><small>Prescriptions</small><strong>{{ prescriptions.length }}</strong><span>{{ prescriptions.filter((item) => item.status === 'ready').length }} ready to order</span></div>
            <ArrowRight :size="18" />
          </RouterLink>
          <RouterLink to="/account/orders" class="account-stat-card">
            <span class="stat-icon stat-purple"><Package :size="22" /></span>
            <div><small>Orders</small><strong>{{ orders.length }}</strong><span>{{ orders[0]?.status === 'delivered' ? 'Latest delivered' : 'Latest in progress' }}</span></div>
            <ArrowRight :size="18" />
          </RouterLink>
          <RouterLink to="/cart" class="account-stat-card">
            <span class="stat-icon stat-green"><ShoppingCart :size="22" /></span>
            <div><small>Current cart</small><strong>{{ store.cartCount }}</strong><span>{{ formatMoney(store.cartTotal) }} mock total</span></div>
            <ArrowRight :size="18" />
          </RouterLink>
        </div>

        <section class="account-section">
          <div class="account-section-heading"><div><span class="eyebrow">Prescriptions</span><h2>Ready when you are</h2></div><RouterLink class="text-link" to="/account/prescriptions">View all <ArrowRight :size="17" /></RouterLink></div>
          <div class="account-list-card">
            <div v-for="rx in prescriptions.slice(0, 2)" :key="rx.id" class="rx-summary-row">
              <span class="list-icon"><Stethoscope :size="20" /></span>
              <div><strong>{{ store.medicationById(rx.medicationId)?.name }}</strong><span>{{ rx.strength }} · {{ rx.quantity }} count · {{ rx.refills }} refills</span></div>
              <StatusBadge :status="rx.status" />
              <RouterLink :to="rx.status === 'ready' ? `/medications/${store.medicationById(rx.medicationId)?.slug}` : '/account/prescriptions'">Review <ArrowRight :size="16" /></RouterLink>
            </div>
          </div>
        </section>

        <section v-if="orders.length" class="account-section">
          <div class="account-section-heading"><div><span class="eyebrow">Latest order</span><h2>{{ orders[0].id }}</h2></div><RouterLink class="text-link" :to="`/account/orders/${orders[0].id}`">Order details <ArrowRight :size="17" /></RouterLink></div>
          <div class="latest-order-card">
            <div class="order-progress-mini">
              <span class="complete"><Check :size="14" /></span><i></i><span class="complete"><Check :size="14" /></span><i></i><span class="complete"><Check :size="14" /></span>
            </div>
            <div><strong>{{ orders[0].status === 'delivered' ? 'Delivered' : 'Order in progress' }}</strong><span>{{ orders[0].items.length }} medication{{ orders[0].items.length === 1 ? '' : 's' }} · {{ formatMoney(orders[0].total) }}</span></div>
            <StatusBadge :status="orders[0].status" />
          </div>
        </section>

        <section id="profile" class="account-section profile-section">
          <div class="account-section-heading"><div><span class="eyebrow">Profile</span><h2>Delivery information</h2></div><button v-if="!editing" class="text-link button-reset" type="button" @click="editing = true"><Pencil :size="16" /> Edit</button></div>
          <Transition name="fade"><div v-if="saved" class="inline-success"><Check :size="17" /> Profile saved in this browser.</div></Transition>
          <div v-if="!editing" class="profile-display">
            <span class="list-icon"><MapPin :size="21" /></span>
            <div><strong>{{ store.currentCustomer.firstName }} {{ store.currentCustomer.lastName }}</strong><span>{{ store.currentCustomer.address.line1 }} {{ store.currentCustomer.address.line2 }}</span><span>{{ store.currentCustomer.address.city }}, {{ store.currentCustomer.address.state }} {{ store.currentCustomer.address.zip }}</span><span>{{ store.currentCustomer.phone }}</span></div>
          </div>
          <form v-else class="stacked-form profile-form" @submit.prevent="saveProfile">
            <label>Mobile phone<input v-model="profile.phone" /></label>
            <label>Street address<input v-model="profile.line1" required /></label>
            <label>Apartment or suite<input v-model="profile.line2" /></label>
            <div class="form-row three-columns"><label>City<input v-model="profile.city" required /></label><label>State<input v-model="profile.state" maxlength="2" required /></label><label>ZIP<input v-model="profile.zip" required /></label></div>
            <div class="form-actions"><button class="button button-dark" type="submit">Save changes</button><button class="button button-ghost" type="button" @click="editing = false">Cancel</button></div>
          </form>
        </section>
      </div>
    </div>
  </div>
  <div v-else class="protected-state page-width">
    <span class="empty-icon"><Stethoscope :size="31" /></span>
    <h1>Sign in to view this account.</h1>
    <p>The seeded demo patient includes prescriptions, delivery details, and order history.</p>
    <RouterLink class="button button-orange" to="/login">Open demo account <ArrowRight :size="18" /></RouterLink>
  </div>
</template>
