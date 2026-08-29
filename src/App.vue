<script setup>
import { ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import {
  ChevronDown,
  LogOut,
  Menu,
  Pill,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "@lucide/vue";
import { usePharmacyStore } from "./composables/usePharmacyStore";

const route = useRoute();
const router = useRouter();
const store = usePharmacyStore();
const mobileOpen = ref(false);
const accountOpen = ref(false);
const headerSearch = ref("");

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
    accountOpen.value = false;
  },
);

function submitHeaderSearch() {
  const query = headerSearch.value.trim();
  router.push({ name: "medications", query: query ? { q: query } : {} });
}

function signOut() {
  store.logout();
  accountOpen.value = false;
  router.push("/");
}
</script>

<template>
  <div class="site-shell">
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <div class="demo-banner">
      <span class="demo-pulse" aria-hidden="true"></span>
      ClearDose sandbox <span aria-hidden="true">•</span> Mock data only
      <span class="demo-banner-extra" aria-hidden="true">• No real prescriptions or payments</span>
    </div>

    <header class="site-header">
      <div class="header-inner">
        <RouterLink class="brand" to="/" aria-label="ClearDose home">
          <span class="brand-symbol"><Pill :size="23" stroke-width="2.5" /></span>
          <span class="brand-copy">
            <strong>ClearDose</strong>
            <span>Transparent prescriptions, agent-ready.</span>
          </span>
        </RouterLink>

        <nav class="desktop-nav" aria-label="Primary navigation">
          <RouterLink to="/medications">Medications</RouterLink>
          <RouterLink to="/contact-doctor">Contact your doctor</RouterLink>
          <RouterLink to="/contact-doctor#providers">For providers</RouterLink>
        </nav>

        <div class="header-actions">
          <form class="header-search" role="search" @submit.prevent="submitHeaderSearch">
            <Search :size="17" aria-hidden="true" />
            <input v-model="headerSearch" aria-label="Search medications" placeholder="Search medications" />
          </form>

          <div v-if="store.currentCustomer" class="account-menu-wrap">
            <button class="icon-text-button" type="button" @click="accountOpen = !accountOpen">
              <UserRound :size="19" />
              <span>{{ store.currentCustomer.firstName }}</span>
              <ChevronDown :size="14" />
            </button>
            <div v-if="accountOpen" class="account-menu">
              <RouterLink to="/account">Account overview</RouterLink>
              <RouterLink to="/account/prescriptions">Prescriptions</RouterLink>
              <RouterLink to="/account/orders">Orders</RouterLink>
              <button type="button" @click="signOut"><LogOut :size="16" /> Sign out</button>
            </div>
          </div>
          <RouterLink v-else class="signin-link" to="/login">Sign in</RouterLink>

          <RouterLink class="cart-button" to="/cart" aria-label="View cart">
            <ShoppingCart :size="20" />
            <span v-if="store.cartCount" class="cart-count">{{ store.cartCount }}</span>
          </RouterLink>
          <RouterLink v-if="!store.currentCustomer" class="button button-small button-dark desktop-signup" to="/create-account">
            Sign up
          </RouterLink>
          <button class="mobile-menu-button" type="button" :aria-expanded="mobileOpen" aria-label="Toggle navigation" @click="mobileOpen = !mobileOpen">
            <X v-if="mobileOpen" :size="24" />
            <Menu v-else :size="24" />
          </button>
        </div>
      </div>

      <div v-if="mobileOpen" class="mobile-nav">
        <form class="mobile-search" role="search" @submit.prevent="submitHeaderSearch">
          <Search :size="18" />
          <input v-model="headerSearch" aria-label="Search medications" placeholder="Search medications" />
        </form>
        <RouterLink to="/medications">Browse medications</RouterLink>
        <RouterLink to="/contact-doctor">Contact your doctor</RouterLink>
        <RouterLink to="/contact-doctor#providers">For providers</RouterLink>
        <RouterLink v-if="store.currentCustomer" to="/account">My account</RouterLink>
        <RouterLink v-else to="/create-account">Create account</RouterLink>
      </div>
    </header>

    <main id="main-content">
      <RouterView />
    </main>

    <footer class="site-footer">
      <div class="footer-cta">
        <div>
          <span class="eyebrow">Built for the patient journey</span>
          <h2>Know the price before checkout.</h2>
        </div>
        <RouterLink class="button button-light" to="/medications">Browse mock medications</RouterLink>
      </div>
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="brand brand-footer">
            <span class="brand-symbol"><Pill :size="21" /></span>
            <span class="brand-copy"><strong>ClearDose</strong><span>Transparent prescriptions, agent-ready.</span></span>
          </div>
          <p>A fictional interface prototype for transparent prescription shopping and shared patient-agent workflows. ClearDose is not a pharmacy.</p>
        </div>
        <div>
          <h3>Patients</h3>
          <RouterLink to="/medications">Medications</RouterLink>
          <RouterLink to="/contact-doctor">Send a prescription</RouterLink>
          <RouterLink to="/account/orders">Order status</RouterLink>
        </div>
        <div>
          <h3>Demo</h3>
          <RouterLink to="/login">Demo account</RouterLink>
          <RouterLink to="/cart">Mock cart</RouterLink>
          <button type="button" class="footer-link-button" @click="store.resetDemo(); router.push('/')">Reset demo data</button>
        </div>
        <div>
          <h3>Important</h3>
          <p>All names, prices, records, pharmacy identifiers, and transactions shown here are illustrative.</p>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 ClearDose prototype</span>
        <CdWebMcpStatus />
        <span>Not for medical use</span>
      </div>
    </footer>
  </div>
</template>
