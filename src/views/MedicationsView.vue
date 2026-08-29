<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Search, SlidersHorizontal, X } from "@lucide/vue";
import MedicationCard from "../components/MedicationCard.vue";
import { categories, medications } from "../data/mockDb";

const route = useRoute();
const router = useRouter();
const search = ref(String(route.query.q ?? ""));
const category = ref("All medications");
const sort = ref("name");

watch(
  () => route.query.q,
  (query) => { search.value = String(query ?? ""); },
);

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  const results = medications.filter((medication) => {
    const matchesSearch = !term || `${medication.name} ${medication.genericFor} ${medication.category}`.toLowerCase().includes(term);
    const matchesCategory = category.value === "All medications" || medication.category === category.value;
    return matchesSearch && matchesCategory;
  });
  return [...results].sort((a, b) => {
    if (sort.value === "price") return a.variants[0].price - b.variants[0].price;
    if (sort.value === "savings") return (b.variants[0].retail - b.variants[0].price) - (a.variants[0].retail - a.variants[0].price);
    return a.name.localeCompare(b.name);
  });
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
        <form class="catalog-search" role="search" @submit.prevent="syncSearch">
          <Search :size="23" />
          <input v-model="search" aria-label="Search the medication catalog" placeholder="Search medications or conditions" @input="syncSearch" />
          <button v-if="search" type="button" aria-label="Clear search" @click="search = ''; syncSearch()"><X :size="19" /></button>
          <button class="button button-orange" type="submit">Search</button>
        </form>
      </div>
    </section>

    <section class="page-width catalog-body">
      <div class="category-scroller" aria-label="Medication categories">
        <button v-for="item in categories" :key="item" type="button" :class="{ active: category === item }" @click="category = item">{{ item }}</button>
      </div>
      <div class="catalog-toolbar">
        <div>
          <strong>{{ filtered.length }}</strong> results
          <span v-if="search">for “{{ search }}”</span>
        </div>
        <label class="sort-control">
          <SlidersHorizontal :size="17" />
          <span>Sort by</span>
          <select v-model="sort">
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
