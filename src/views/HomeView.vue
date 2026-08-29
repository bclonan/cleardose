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
import { medications } from "../data/mockDb";
import { formatMoney } from "../composables/usePharmacyStore";

const router = useRouter();
const search = ref("");
const comparisonId = ref("med_atorvastatin");
const featured = medications.filter((medication) => medication.popular).slice(0, 3);
const comparison = computed(() => medications.find((medication) => medication.id === comparisonId.value));
const comparisonVariant = computed(() => comparison.value.variants[0]);
const savingPercent = computed(() => Math.round((1 - comparisonVariant.value.price / comparisonVariant.value.retail) * 100));
const suggestions = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (term.length < 2) return [];
  return medications
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
          <span class="eyebrow"><ShieldCheck :size="17" /> Pharmacy shopping, made legible</span>
          <h1>No middlemen.<br /><em>No price games.</em><br />Just a fair drug price.</h1>
          <p class="hero-lede">Search a realistic mock catalog, see the complete price, and walk through a patient-friendly prescription order from start to finish.</p>

          <form class="hero-search" role="search" @submit.prevent="submitSearch">
            <Search :size="22" aria-hidden="true" />
            <input v-model="search" placeholder="Try “Lisinopril” or “cholesterol”" aria-label="Find a medication" autocomplete="off" />
            <button type="submit">Find my medication <ArrowRight :size="18" /></button>
            <div v-if="suggestions.length" class="search-suggestions">
              <RouterLink v-for="item in suggestions" :key="item.id" :to="`/medications/${item.slug}`">
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
            <select v-model="comparisonId" aria-label="Select example medication">
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
        <div><strong>15%</strong><span>transparent markup concept</span></div>
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
        <span class="eyebrow">The idea behind the model</span>
        <h2>Everyone deserves safe and affordable medication.</h2>
      </div>
      <div>
        <p>This independent prototype mirrors the clarity of a cost-plus pharmacy: patients see what they are buying, what it costs, and exactly what must happen next.</p>
        <RouterLink class="button button-dark" to="/create-account">Try the customer flow <ArrowRight :size="18" /></RouterLink>
      </div>
    </section>
  </div>
</template>
