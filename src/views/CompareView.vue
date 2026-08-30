<script setup>
import { ArrowRight, Bot, Scale, ShieldCheck } from "@lucide/vue";
import ComparisonPanel from "../components/ComparisonPanel.vue";
</script>

<template>
  <div class="compare-page">
    <section class="compare-hero">
      <div class="page-width compare-hero-grid">
        <div><span class="eyebrow"><Scale :size="17" /> Like-for-like price facts</span><h1>Two medications.<br />One clear view.</h1><p>Choose two fictional catalog entries and exact variants. ClearDose lines up the same price fields without implying that one medicine can replace another.</p></div>
        <div class="compare-agent-card"><Bot :size="26" /><span>Try with an agent</span><strong>“Compare atorvastatin and lisinopril, then highlight the results.”</strong><p>The agent uses typed catalog and highlight tools while the patient sees the same state.</p><RouterLink to="/demo">See how it works <ArrowRight :size="17" /></RouterLink></div>
      </div>
    </section>
    <div class="page-width compare-workspace"><ComparisonPanel /></div>
    <section class="page-width comparison-boundary"><ShieldCheck :size="25" /><div><h2>Designed around a safe boundary.</h2><p>This demo compares catalog and price data only. It does not identify therapeutic equivalents, recommend switching, or replace a clinician.</p></div></section>
  </div>
</template>
