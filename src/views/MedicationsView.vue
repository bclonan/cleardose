<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Search, SlidersHorizontal, X } from "@lucide/vue";
import MedicationCard from "../components/MedicationCard.vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";

const route = useRoute();
const router = useRouter();
const store = usePharmacyStore();
const categories = computed(() => store.categories);
const search = ref(String(route.query.q ?? ""));
const category = ref("All medications");
const sort = ref("name");

watch(
  () => route.query.q,
  (query) => { search.value = String(query ?? ""); },
);

const filtered = computed(() => {
  return store.searchMedications({ query: search.value, category: category.value, sort: sort.value });
});

function syncSearch() {
  router.replace({ query: search.value.trim() ? { q: search.value.trim() } : {} });
}

function clearFilters() {
  search.value = "";
  category.value = "All medications";
  router.replace({ query: {} });
}
</script>

<template>
  <div class="catalog-page">
    <section class="catalog-hero">
      <div class="page-width">
        <span class="eyebrow">Mock catalog</span>
        <h1>Find your medication.</h1>
        <p>Search by generic name, brand name, or health category. Every price shown is illustrative.</p>
        <form class="catalog-search" role="search" data-agent-section="medication-search" toolname="filter_visible_medication_catalog" tooldescription="Populate the visible catalog search field so the user can review matching fictional medications on this page." toolautosubmit @submit.prevent="syncSearch">
          <Search :size="23" />
          <input v-model="search" name="query" aria-label="Search the medication catalog" autocomplete="off" toolparamdescription="Medication, brand, or health category search text" placeholder="Search medications or conditions" @input="syncSearch" />
          <button v-if="search" type="button" aria-label="Clear search" @click="search = ''; syncSearch()"><X :size="19" /></button>
          <button class="button button-orange" type="submit">Search</button>
        </form>
      </div>
    </section>

    <section class="page-width catalog-body">
      <div class="category-scroller" aria-label="Medication categories">
        <button v-for="item in categories" :key="item" type="button" :aria-pressed="category === item" :class="{ active: category === item }" @click="category = item">{{ item }}</button>
      </div>
      <div class="catalog-toolbar">
        <div>
          <strong>{{ filtered.length }}</strong> results
          <span v-if="search">for “{{ search }}”</span>
        </div>
        <label class="sort-control">
          <SlidersHorizontal :size="17" />
          <span>Sort by</span>
          <select v-model="sort" name="sort" aria-label="Sort medication results">
            <option value="name">Name</option>
            <option value="price">Lowest price</option>
            <option value="savings">Biggest savings</option>
          </select>
        </label>
      </div>

      <div v-if="filtered.length" class="medication-grid">
        <MedicationCard v-for="medication in filtered" :key="medication.id" :medication="medication" />
      </div>
      <div v-else class="empty-state">
        <span class="empty-icon"><Search :size="30" /></span>
        <h2>No medications matched.</h2>
        <p>Try a generic name, brand name, or clear the selected category.</p>
        <button class="button button-dark" type="button" @click="clearFilters">Clear filters</button>
      </div>
    </section>
  </div>
</template>
