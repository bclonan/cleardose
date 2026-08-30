<script setup>
import { nextTick, ref, watch } from "vue";
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

function focusRouteContent() {
  const main = globalThis.document?.querySelector("#main-content");
  const heading = main?.querySelector("h1");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
    return;
  }
  main?.focus({ preventScroll: true });
}

function skipToRouteContent() {
  globalThis.document?.querySelector("#main-content")?.scrollIntoView({ block: "start" });
  focusRouteContent();
}

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
    accountOpen.value = false;
    nextTick(focusRouteContent);
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
    <a class="skip-link" href="#main-content" @click.prevent="skipToRouteContent">Skip to main content</a>
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
          <RouterLink to="/udi">Drug index</RouterLink>
          <RouterLink to="/compare">Compare</RouterLink>
          <RouterLink to="/contact-doctor">Contact your doctor</RouterLink>
          <RouterLink to="/demo">WebMCP Explorer</RouterLink>
          <RouterLink to="/flow-lab">State lab</RouterLink>
          <RouterLink to="/shortcuts">Shortcuts</RouterLink>
          <RouterLink to="/studio">Studio</RouterLink>
        </nav>

        <div class="header-actions">
          <CdAgentControlCenter />
          <form class="header-search" role="search" toolname="cleardose_navigate_to_drug_search" tooldescription="Populate the header search and navigate the visible ClearDose interface to matching fictional drug records." toolautosubmit @submit.prevent="submitHeaderSearch">
            <Search :size="17" aria-hidden="true" />
            <input v-model="headerSearch" name="query" aria-label="Search medications" autocomplete="off" toolparamdescription="Generic medication, brand, or category search text" placeholder="Search medications" />
          </form>

          <div v-if="store.currentCustomer" class="account-menu-wrap">
            <button class="icon-text-button" type="button" aria-haspopup="true" aria-controls="account-menu" :aria-expanded="accountOpen" @click="accountOpen = !accountOpen">
              <UserRound :size="19" />
              <span>{{ store.currentCustomer.firstName }}</span>
              <ChevronDown :size="14" />
            </button>
            <div v-if="accountOpen" id="account-menu" class="account-menu">
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
          <button class="mobile-menu-button" type="button" aria-controls="mobile-navigation" :aria-expanded="mobileOpen" aria-label="Toggle navigation" @click="mobileOpen = !mobileOpen">
            <X v-if="mobileOpen" :size="24" />
            <Menu v-else :size="24" />
          </button>
        </div>
      </div>

      <div v-if="mobileOpen" id="mobile-navigation" class="mobile-nav">
        <form class="mobile-search" role="search" toolname="cleardose_navigate_to_mobile_drug_search" tooldescription="Populate the mobile search and navigate the visible ClearDose interface to matching fictional drug records." toolautosubmit @submit.prevent="submitHeaderSearch">
          <Search :size="18" />
          <input v-model="headerSearch" name="query" aria-label="Search medications" autocomplete="off" toolparamdescription="Generic medication, brand, or category search text" placeholder="Search medications" />
        </form>
        <RouterLink to="/medications">Browse medications</RouterLink>
        <RouterLink to="/udi">Universal Drug Index</RouterLink>
        <RouterLink to="/compare">Compare prices</RouterLink>
        <RouterLink to="/contact-doctor">Contact your doctor</RouterLink>
        <RouterLink to="/contact-doctor#providers">For providers</RouterLink>
        <RouterLink to="/demo">WebMCP Explorer</RouterLink>
        <RouterLink to="/flow-lab">Live state lab</RouterLink>
        <RouterLink to="/shortcuts">Hackathon shortcuts</RouterLink>
        <RouterLink to="/studio">Capability Studio</RouterLink>
        <RouterLink v-if="store.currentCustomer" to="/account">My account</RouterLink>
        <RouterLink v-else to="/create-account">Create account</RouterLink>
      </div>
    </header>

    <main id="main-content" tabindex="-1">
      <RouterView />
      <CdRouteDemoSection />
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
          <RouterLink to="/udi">Universal Drug Index</RouterLink>
          <RouterLink to="/contact-doctor">Prepare a provider note</RouterLink>
          <RouterLink to="/account/orders">Order status</RouterLink>
        </div>
        <div>
          <h3>Demo</h3>
          <RouterLink to="/login">Demo account</RouterLink>
          <RouterLink to="/cart">Mock cart</RouterLink>
          <RouterLink to="/demo">WebMCP Explorer</RouterLink>
          <RouterLink to="/flow-lab">Live flow lab</RouterLink>
          <RouterLink to="/shortcuts">Prompt shortcuts</RouterLink>
          <RouterLink to="/studio">Capability Studio</RouterLink>
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
    <CdDemoLabDock />
  </div>
</template>
