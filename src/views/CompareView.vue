<script setup>
import { Scale, ShieldCheck } from "@lucide/vue";
import ComparisonPanel from "../components/ComparisonPanel.vue";
import DemoScenarioCard from "../components/DemoScenarioCard.vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";

const store = usePharmacyStore();
const scenario = store.demoScenario("semantic-comparison");
</script>

<template>
  <div class="compare-page">
    <section class="compare-hero">
      <div class="page-width compare-hero-grid">
        <div><span class="eyebrow"><Scale :size="17" /> Explicit comparison rules</span><h1>Same drug pricing.<br />Seeded discussion pairs.</h1><p>Compare one exact package across fictional providers, or review a relationship that ClearDose explicitly marks for clinician discussion. Unrelated records are rejected.</p></div>
        <DemoScenarioCard :scenario="scenario" compact />
      </div>
    </section>
    <div class="page-width compare-workspace"><ComparisonPanel /></div>
    <section class="page-width comparison-boundary"><ShieldCheck :size="25" /><div><h2>The boundary is part of the data model.</h2><p>Only same-drug provider offers can be price-ranked. Discussion-only records show structured sample facts without claiming equivalence or recommending a switch.</p></div></section>
  </div>
</template>
