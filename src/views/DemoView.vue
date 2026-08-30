<script setup>
import { Activity, ArrowRight, Bot, Check, Code2, Play, ShieldCheck, TerminalSquare } from "@lucide/vue";
import WebMcpExplorer from "../components/WebMcpExplorer.vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";

const store = usePharmacyStore();
</script>

<template>
  <div class="demo-page explorer-page">
    <section class="explorer-hero">
      <div class="page-width explorer-hero-grid">
        <div>
          <span class="eyebrow"><TerminalSquare :size="17" /> Browser-native WebMCP laboratory</span>
          <h1>Read the contract.<br /><em>Run the real handler.</em></h1>
          <p>Search the live tool manifest, edit a request, run it against seeded local data, and inspect the response, timing, UI focus, workflow events, and bounded state changes.</p>
          <div class="explorer-hero-actions"><a class="button button-orange" href="#explorer"><Play :size="17" /> Open Try It console</a><RouterLink class="button button-outline-light" to="/flow-lab"><Activity :size="17" /> Open state lab</RouterLink></div>
          <div class="explorer-boundary"><ShieldCheck :size="19" /><span>Everything on this page is fictional and local. No pharmacy, clinician, insurer, payment network, or patient record is contacted.</span></div>
        </div>
        <dl class="explorer-live-summary">
          <div><dt>Imperative tools</dt><dd>{{ store.webMcp.available }}</dd><small>{{ store.webMcp.registered }} browser registered</small></div>
          <div><dt>Browser API</dt><dd>{{ store.webMcp.supported ? 'Live' : 'Fallback' }}</dd><small>Local replay remains available</small></div>
          <div><dt>Workflow events</dt><dd>{{ store.workflow.events.length }}</dd><small>Persisted locally</small></div>
          <div><dt>Current flows</dt><dd>{{ store.workflow.flows.length }}</dd><small>Branch-aware inspection</small></div>
        </dl>
      </div>
    </section>

    <section class="page-width lab-system-strip" aria-label="Recurring demo system">
      <article><span><Code2 :size="20" /></span><h2>Programmatic replay</h2><p>Runs the same registered handlers step by step with Pause, Resume, Step, Restart, and seeded Reset.</p><button type="button" @click="store.openDemoLab('prompts')">Choose a replay <ArrowRight :size="16" /></button></article>
      <article><span><TerminalSquare :size="20" /></span><h2>WebMCP Explorer</h2><p>Shows live status, schemas, examples, deterministic failures, linked prompts, requests, and responses.</p><a href="#explorer">Inspect tools <ArrowRight :size="16" /></a></article>
      <article><span><Activity :size="20" /></span><h2>Live state inspector</h2><p>Shows current truth, event history, valid branches, blocked actions, error states, and recovery transitions.</p><button type="button" @click="store.openDemoLab('state')">Inspect state <ArrowRight :size="16" /></button></article>
    </section>

    <div class="page-width" data-agent-section="tool-catalog"><WebMcpExplorer /></div>

    <section class="page-width explorer-finale">
      <div><span class="eyebrow"><Bot :size="16" /> One handler, three paths</span><h2>Human actions, agent calls, and replay share application state.</h2><p>The console does not jump to a completed screen. It executes each step, records its call id, and leaves failures in the same event history as successful actions.</p></div>
      <ul><li><Check :size="16" /> Browser API support is reported separately from local replay.</li><li><Check :size="16" /> Clinical sample fields stay informational and require professional review.</li><li><Check :size="16" /> Checkout, payment, provider contact, clipboard, and file export remain human-controlled.</li></ul>
    </section>
  </div>
</template>
