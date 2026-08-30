<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowRight,
  Check,
  FileSearch,
  PackageCheck,
  Search,
  ShieldCheck,
  Stethoscope,
} from "@lucide/vue";
import MedicationCard from "../components/MedicationCard.vue";
import { formatMoney, usePharmacyStore } from "../composables/usePharmacyStore";

const router = useRouter();
const store = usePharmacyStore();
const medications = computed(() => store.medications);
const search = ref("");
const comparisonId = ref("med_atorvastatin");
const featured = computed(() => medications.value.filter((medication) => medication.popular).slice(0, 3));
const comparison = computed(() => medications.value.find((medication) => medication.id === comparisonId.value));
const comparisonVariant = computed(() => comparison.value.variants[0]);
const savingPercent = computed(() => Math.round((1 - comparisonVariant.value.price / comparisonVariant.value.retail) * 100));
const suggestions = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (term.length < 2) return [];
  return medications.value
    .filter((item) => `${item.name} ${item.genericFor}`.toLowerCase().includes(term))
    .slice(0, 5);
});

function submitSearch() {
  const query = search.value.trim();
  router.push({ name: "medications", query: query ? { q: query } : {} });
}
</script>

<template>
  <div>
    <section class="home-hero">
      <div class="hero-orb hero-orb-one" aria-hidden="true"></div>
      <div class="hero-orb hero-orb-two" aria-hidden="true"></div>
      <div class="page-width hero-grid">
        <div class="hero-copy">
          <span class="eyebrow"><ShieldCheck :size="17" /> ClearDose · Transparent prescriptions, agent-ready.</span>
          <h1>Know the medication.<br /><em>Know the price.</em><br />Know what happens next.</h1>
          <p class="hero-lede">ClearDose turns prescription shopping into one understandable path, with visible prices, explicit clinical handoffs, and actions ready for either the patient or their agent.</p>

          <form class="hero-search" role="search" data-agent-section="medication-search" toolname="navigate_to_home_drug_search" tooldescription="Populate the home search and navigate the visible ClearDose interface to matching fictional drug records." toolautosubmit @submit.prevent="submitSearch">
            <Search :size="22" aria-hidden="true" />
            <input v-model="search" name="query" role="combobox" aria-autocomplete="list" aria-controls="home-search-suggestions" :aria-expanded="suggestions.length > 0" placeholder="Try “Lisinopril” or “cholesterol”" aria-label="Find a medication" autocomplete="off" toolparamdescription="Generic medication, brand, condition, or category search text" />
            <button type="submit">Find my medication <ArrowRight :size="18" /></button>
            <div v-if="suggestions.length" id="home-search-suggestions" class="search-suggestions" role="listbox" aria-label="Medication suggestions">
              <RouterLink v-for="item in suggestions" :key="item.id" role="option" :to="`/medications/${item.slug}`">
                <span><strong>{{ item.name }}</strong><small>Generic for {{ item.genericFor }}</small></span>
                <ArrowRight :size="17" />
              </RouterLink>
            </div>
          </form>
          <div class="hero-trust-row">
            <span><Check :size="16" /> Price shown before checkout</span>
            <span><Check :size="16" /> Delivered to your door</span>
            <span><Check :size="16" /> Mock checkout—no charge</span>
          </div>
        </div>

        <div class="price-story" aria-label="Example medication savings">
          <div class="price-story-header">
            <span>See the difference</span>
            <select v-model="comparisonId" name="example-medication" aria-label="Select example medication">
              <option v-for="medication in medications.slice(0, 6)" :key="medication.id" :value="medication.id">{{ medication.name }}</option>
            </select>
          </div>
          <div class="price-story-body">
            <span class="receipt-label">30-day mock price</span>
            <h2>{{ comparison.name }}</h2>
            <p>{{ comparisonVariant.form }} · {{ comparisonVariant.strength }} · {{ comparisonVariant.quantity }} count</p>
            <div class="price-bars">
              <div class="price-bar retail-bar">
                <span>Typical retail</span>
                <strong>{{ formatMoney(comparisonVariant.retail) }}</strong>
              </div>
              <div class="price-bar demo-price-bar" :style="{ '--saving': `${Math.max(18, 100 - savingPercent)}%` }">
                <span>Our demo price</span>
                <strong>{{ formatMoney(comparisonVariant.price) }}</strong>
              </div>
            </div>
            <div class="savings-total">
              <span>You could save</span>
              <strong>{{ formatMoney(comparisonVariant.retail - comparisonVariant.price) }}</strong>
              <em>{{ savingPercent }}% less</em>
            </div>
          </div>
          <div class="receipt-tear" aria-hidden="true"></div>
        </div>
      </div>
    </section>

    <section class="value-strip">
      <div class="page-width value-strip-inner">
        <div><strong>1,000+</strong><span>medications represented by the real model</span></div>
        <div><strong>100%</strong><span>visible price components</span></div>
        <div><strong>$5</strong><span>mock pharmacy labor fee</span></div>
        <div><strong>50 states</strong><span>mail-delivery experience</span></div>
      </div>
    </section>

    <section class="section page-width">
      <div class="section-heading split-heading">
        <div>
          <span class="eyebrow">Popular examples</span>
          <h2>Start with a familiar medication.</h2>
        </div>
        <RouterLink class="text-link" to="/medications">See all medications <ArrowRight :size="18" /></RouterLink>
      </div>
      <div class="medication-grid home-medication-grid">
        <MedicationCard v-for="medication in featured" :key="medication.id" :medication="medication" />
      </div>
    </section>

    <section class="how-it-works-section">
      <div class="page-width">
        <div class="section-heading centered-heading">
          <span class="eyebrow">One simple path</span>
          <h2>From price check to front door.</h2>
          <p>The demo keeps the clinical handoff visible without making the shopping flow feel clinical.</p>
        </div>
        <div class="process-grid">
          <article>
            <span class="process-number">01</span>
            <FileSearch :size="30" />
            <h3>Find your medication</h3>
            <p>Compare strengths, quantities, transparent prices, and estimated savings.</p>
          </article>
          <article>
            <span class="process-number">02</span>
            <Stethoscope :size="30" />
            <h3>Connect your prescriber</h3>
            <p>Choose an on-file prescription, provider e-prescribe, or pharmacy transfer path.</p>
          </article>
          <article>
            <span class="process-number">03</span>
            <PackageCheck :size="30" />
            <h3>Review and order</h3>
            <p>Confirm delivery and mock payment details, then track the order from your account.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="mission-panel page-width" id="mission">
      <div>
        <span class="eyebrow">The ClearDose promise</span>
        <h2>The prescription journey should explain itself.</h2>
      </div>
      <div>
        <p>ClearDose keeps the patient, their agent, and the pharmacy aligned around the same visible state: what is being ordered, what it costs, what is approved, and exactly what happens next.</p>
        <RouterLink class="button button-dark" to="/create-account">Try the customer flow <ArrowRight :size="18" /></RouterLink>
      </div>
    </section>
  </div>
</template>
