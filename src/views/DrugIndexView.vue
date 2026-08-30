<script setup>
import { computed, ref } from "vue";
import { ArrowRight, Bot, Check, CircleAlert, Database, Package, Search, ShieldCheck } from "@lucide/vue";
import { formatMoney, usePharmacyStore } from "../composables/usePharmacyStore";

const store = usePharmacyStore();
const query = ref("");
const category = ref("All medications");
const drugClass = ref("");
const selectedDrugId = ref("med_lisinopril");
const interactionLeft = ref("med_sildenafil");
const interactionRight = ref("med_isosorbide_mononitrate");
const planSecondDrugId = ref("med_atorvastatin");
const planStrategy = ref("lowest_total");
const interactionReview = ref(null);
const procurementPlan = ref(null);
const announcement = ref("Universal Drug Index ready.");

const summary = computed(() => store.state.drugIndexSummary ?? {});
const results = computed(() => store.searchDrugIndex({
  query: query.value,
  category: category.value,
  drugClass: drugClass.value,
  limit: 18,
}));
const selectedDrug = computed(() => store.drugIndexEntry(selectedDrugId.value));
const related = computed(() => store.findRelatedDrugs({ drugId: selectedDrugId.value, limit: 5 }));
const priceComparison = computed(() => store.compareDrugPrices({ drugIds: [selectedDrugId.value] }));

function selectDrug(drugId) {
  selectedDrugId.value = drugId;
  announcement.value = `Selected ${selectedDrug.value?.name ?? drugId}.`;
}

function runInteractionReview() {
  interactionReview.value = store.reviewInteractionFlags({ drugIds: [interactionLeft.value, interactionRight.value] });
  announcement.value = `Interaction demonstration returned ${interactionReview.value.flags.length} synthetic review flags.`;
}

function buildPlan() {
  procurementPlan.value = store.buildProcurementPlan({
    items: [{ drugId: selectedDrugId.value }, { drugId: planSecondDrugId.value }],
    strategy: planStrategy.value,
  });
  announcement.value = `Built a local fictional procurement plan for ${procurementPlan.value.items.length} items. No order was placed.`;
}
</script>

<template>
  <div class="udi-page">
    <section class="udi-hero">
      <div class="page-width udi-hero-grid">
        <div>
          <span class="eyebrow"><Database :size="17" /> Local-first data layer</span>
          <h1>One index for every medication journey.</h1>
          <p>The ClearDose Universal Drug Index normalizes identity, package variants, fictional offers, broad related-record groups, and synthetic safety-review fixtures. The browser agent and the interface query the same local service.</p>
          <div class="udi-boundary"><ShieldCheck :size="20" /><span><strong>Designed for demonstration, not care.</strong> Prices and identifiers are fictional. Related records are not therapeutic equivalents. Interaction coverage is intentionally incomplete.</span></div>
        </div>
        <dl class="udi-metrics" aria-label="Universal Drug Index summary">
          <div><dt>Drug records</dt><dd>{{ summary.drugCount }}</dd></div>
          <div><dt>Package variants</dt><dd>{{ summary.variantCount }}</dd></div>
          <div><dt>Price offers</dt><dd>{{ summary.offerCount }}</dd></div>
          <div><dt>Persistence</dt><dd>Local</dd></div>
        </dl>
      </div>
    </section>

    <section class="page-width udi-workspace" data-agent-section="udi-search" aria-labelledby="udi-search-title">
      <div class="section-heading split-heading">
        <div><span class="eyebrow">Explore the index</span><h2 id="udi-search-title">Search recognizable drug records.</h2></div>
        <p>{{ results.length }} visible records from a deterministic bulk demo set. Search accepts generic names, brands, classes, categories, and UDI ids.</p>
      </div>
      <form class="udi-search-form" role="search" toolname="filter_visible_drug_index" tooldescription="Populate the visible ClearDose UDI filters so the user can review matching fictional records on this page." toolautosubmit @submit.prevent>
        <label class="udi-query"><span>Search the UDI</span><div><Search :size="19" /><input v-model="query" name="query" autocomplete="off" toolparamdescription="Raw generic name, brand, category, class, or ClearDose UDI id" placeholder="Try lisinopril, Lipitor, or Statin" /></div></label>
        <label><span>Category</span><select v-model="category" name="category" toolparamdescription="Exact visible ClearDose category"><option v-for="item in store.state.categories" :key="item" :value="item">{{ item }}</option></select></label>
        <label><span>Drug class</span><select v-model="drugClass" name="drugClass" toolparamdescription="Optional exact visible drug class"><option value="">All classes</option><option v-for="item in store.state.drugClasses" :key="item" :value="item">{{ item }}</option></select></label>
      </form>

      <div class="udi-browser" data-agent-section="udi-results">
        <div class="udi-result-list" aria-label="Drug index results">
          <button v-for="drug in results" :key="drug.id" type="button" :class="{ selected: selectedDrugId === drug.id }" :aria-pressed="selectedDrugId === drug.id" @click="selectDrug(drug.id)">
            <span>{{ drug.category }}</span><strong>{{ drug.name }}</strong><small>Generic for {{ drug.genericFor }} · {{ drug.drugClass }}</small><em>from {{ formatMoney(drug.fromPrice) }}</em>
          </button>
        </div>

        <article v-if="selectedDrug" class="udi-detail" aria-live="polite">
          <span class="eyebrow">Selected UDI entry</span>
          <h2>{{ selectedDrug.name }}</h2>
          <p>{{ selectedDrug.description }}</p>
          <dl>
            <div><dt>UDI</dt><dd><code>{{ selectedDrug.identifiers.udi }}</code></dd></div>
            <div><dt>Class</dt><dd>{{ selectedDrug.drugClass }}</dd></div>
            <div><dt>Broad group</dt><dd>{{ selectedDrug.comparisonGroup }}</dd></div>
            <div><dt>Best fictional total</dt><dd>{{ formatMoney(priceComparison.lowestTotal) }}</dd></div>
          </dl>
          <h3>Indexed package offers</h3>
          <div class="udi-offers">
            <div v-for="offer in priceComparison.selections[0].variant.offers" :key="offer.id">
              <span>{{ offer.channel }}</span><strong>{{ formatMoney(offer.total) }}</strong><small>{{ offer.etaDays }} demo days · shipping {{ formatMoney(offer.shipping) }}</small>
            </div>
          </div>
          <RouterLink :to="`/medications/${selectedDrug.slug}`">Open medication page <ArrowRight :size="17" /></RouterLink>
        </article>
      </div>
    </section>

    <section class="udi-lab" data-agent-section="udi-lab" aria-labelledby="udi-lab-title">
      <div class="page-width">
        <div class="section-heading split-heading"><div><span class="eyebrow"><Bot :size="17" /> Agent domain lab</span><h2 id="udi-lab-title">Useful beyond simple shopping.</h2></div><p>Each card maps to one non-overlapping WebMCP capability and the same deterministic UDI service used by the page.</p></div>
        <div class="udi-lab-grid">
          <article>
            <span class="udi-card-icon"><Search :size="20" /></span><h3>Related record discovery</h3><p>Find records in the same broad demo group, with explicit language that they are not substitutions.</p>
            <div class="udi-related-list"><span v-for="drug in related.related" :key="drug.id"><strong>{{ drug.name }}</strong><small>{{ drug.drugClass }}</small></span></div>
            <code>cleardose_find_related_drugs</code>
          </article>

          <article>
            <span class="udi-card-icon"><CircleAlert :size="20" /></span><h3>Synthetic interaction review</h3><p>Demonstrate incomplete-data handling and required pharmacist escalation without implying “no flag” means safe.</p>
            <label>First record<select v-model="interactionLeft"><option v-for="drug in store.state.medications" :key="drug.id" :value="drug.id">{{ drug.name }}</option></select></label>
            <label>Second record<select v-model="interactionRight"><option v-for="drug in store.state.medications" :key="drug.id" :value="drug.id">{{ drug.name }}</option></select></label>
            <button class="button button-dark" type="button" @click="runInteractionReview">Review demo flags</button>
            <div v-if="interactionReview" class="udi-result-box"><strong>{{ interactionReview.flags.length }} synthetic flag(s)</strong><span>{{ interactionReview.flags[0]?.message ?? 'No fixture matched. Coverage remains incomplete and professional review is required.' }}</span></div>
            <code>cleardose_review_demo_interaction_flags</code>
          </article>

          <article>
            <span class="udi-card-icon"><Package :size="20" /></span><h3>Local procurement planning</h3><p>Turn a requested medication list into a fictional price and fulfillment plan. Planning never places an order.</p>
            <label>Second requested record<select v-model="planSecondDrugId"><option v-for="drug in store.state.medications" :key="drug.id" :value="drug.id">{{ drug.name }}</option></select></label>
            <label>Planning strategy<select v-model="planStrategy"><option value="lowest_total">Lowest delivered total</option><option value="fewest_shipments">Fewest channels</option><option value="balanced">Balanced cost and speed</option></select></label>
            <button class="button button-orange" type="button" @click="buildPlan">Build local plan</button>
            <div v-if="procurementPlan" class="udi-result-box success"><Check :size="18" /><strong>{{ formatMoney(procurementPlan.estimatedTotal) }} estimated</strong><span>{{ procurementPlan.channels.join(', ') }} · no order placed</span></div>
            <code>cleardose_build_procurement_plan</code>
          </article>
        </div>
      </div>
    </section>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

