<script setup>
import { computed, inject, ref } from "vue";
import { ArrowRight, Bot, Check, Code2, Eye, Focus, MousePointer2, Play, RotateCcw, ShieldCheck, Sparkles, WandSparkles } from "@lucide/vue";
import ComparisonPanel from "../components/ComparisonPanel.vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { clearDoseHighlightServiceKey } from "../app/injectionKeys";

const store = usePharmacyStore();
const highlightService = inject(clearDoseHighlightServiceKey, null);
const ran = ref(false);
const announcement = ref("Demo ready.");
const readOnlyTools = computed(() => store.webMcp.tools.filter((tool) => tool.annotations?.readOnlyHint));

function runDemo() {
  ran.value = true;
  announcement.value = "Agent example complete. The DOM path inspected many controls; the WebMCP path called two typed tools.";
}

function resetDemo() {
  ran.value = false;
  announcement.value = "Agent example reset.";
}

function highlightComparison() {
  const result = highlightService?.highlight("comparison-results");
  announcement.value = result?.message ?? "Highlight service unavailable.";
}
</script>

<template>
  <div class="demo-page">
    <section class="demo-hero">
      <div class="page-width demo-hero-grid">
        <div>
          <span class="eyebrow"><Sparkles :size="17" /> WebMCP hackathon demo</span>
          <h1>Give the agent tools.<br /><em>Keep the patient in control.</em></h1>
          <p>ClearDose turns a fictional prescription journey into typed, inspectable capabilities backed by one local Universal Drug Index. The human and browser agent share the same records, price facts, review boundaries, and visible next action.</p>
          <div class="demo-hero-actions"><a class="button button-orange" href="#side-by-side">Run the comparison <ArrowRight :size="18" /></a><button class="button button-outline-light" type="button" @click="highlightComparison"><Focus :size="18" /> Highlight comparison</button></div>
        </div>
        <div class="demo-prompt-card"><span>Try this prompt</span><strong>“Find lisinopril, show related index records, compare fictional offers, and build a local plan with atorvastatin. Do not place an order.”</strong><div><Bot :size="20" /><p>The agent discovers exact UDI ids, calls single-purpose tools, and keeps every result visible and reviewable.</p></div></div>
      </div>
    </section>

    <section class="page-width demo-principles" aria-label="Project summary">
      <article><span><Eye :size="22" /></span><h2>The problem</h2><p>Agents otherwise infer meaning from page structure, accessibility names, and visual position. That is expensive and brittle.</p></article>
      <article><span><Code2 :size="22" /></span><h2>The contract</h2><p>ClearDose registers single-purpose tools with precise descriptions, typed schemas, strict runtime validation, safety annotations, and compact results.</p></article>
      <article><span><ShieldCheck :size="22" /></span><h2>The boundary</h2><p>Search and comparison are read-only. Cart mutations are explicit. Checkout and patient details remain human-controlled.</p></article>
    </section>

    <section id="side-by-side" class="demo-side-by-side" data-agent-section="demo-side-by-side" aria-labelledby="side-by-side-title">
      <div class="page-width">
        <div class="section-heading centered-heading"><span class="eyebrow">Same task, two paths</span><h2 id="side-by-side-title">Watch the difference.</h2><p>Prompt: “Find lisinopril and return the exact indexed package details.”</p></div>
        <div class="demo-run-controls"><button v-if="!ran" class="button button-orange" type="button" @click="runDemo"><Play :size="18" /> Run agent example</button><button v-else class="button button-ghost" type="button" @click="resetDemo"><RotateCcw :size="18" /> Reset</button></div>
        <div class="demo-two-paths">
          <article class="demo-path demo-path-dom">
            <div class="demo-path-heading"><span><MousePointer2 :size="21" /></span><div><small>Without WebMCP</small><h3>Agent must infer the UI</h3></div></div>
            <ol class="observation-log">
              <li :class="{ active: ran }"><span>01</span>Inspect navigation and approximately 40 DOM nodes</li>
              <li :class="{ active: ran }"><span>02</span>Guess which search input represents medication lookup</li>
              <li :class="{ active: ran }"><span>03</span>Parse labels, infer record identity, and reconstruct package prices</li>
              <li :class="{ active: ran }"><span>04</span>Re-read the page to verify whether state changed</li>
            </ol>
            <div class="path-result" :class="{ visible: ran }"><Eye :size="18" /><span><strong>Many observations</strong> Meaning reconstructed from presentation</span></div>
          </article>

          <div class="demo-vs" aria-hidden="true">VS</div>

          <article class="demo-path demo-path-tools">
            <div class="demo-path-heading"><span><WandSparkles :size="21" /></span><div><small>With ClearDose WebMCP</small><h3>Agent calls typed tools</h3></div></div>
            <ol class="tool-call-log">
              <li :class="{ active: ran }"><Check :size="18" /><span><code>cleardose_search_drug_index</code><small>{ query: “lisinopril” }</small></span></li>
              <li :class="{ active: ran }"><Check :size="18" /><span><code>cleardose_get_drug_index_entry</code><small>{ drugId: “med_lisinopril” }</small></span></li>
            </ol>
            <div class="path-result success" :class="{ visible: ran }"><Check :size="18" /><span><strong>Two deterministic calls</strong> Shared UI state updates immediately</span></div>
          </article>
        </div>
      </div>
    </section>

    <section class="page-width demo-how" data-agent-section="how-webmcp-works" aria-labelledby="how-title">
      <div class="section-heading split-heading"><div><span class="eyebrow">The architecture</span><h2 id="how-title">How ClearDose WebMCP works.</h2></div><p>One local data service powers direct interaction, declarative forms, imperative tools, and repeatable eval fixtures.</p></div>
      <div class="demo-how-grid">
        <article><span>01</span><h3>The site declares capabilities</h3><p>Tool names, plain-language descriptions, schemas, and annotations live outside route pages.</p><code>createDefaultTools({ store })</code></article>
        <article><span>02</span><h3>The browser exposes contracts</h3><p>The adapter registers against <code>document.modelContext</code> and gracefully reports unsupported browsers.</p><code>registerTool(tool, { signal })</code></article>
        <article><span>03</span><h3>Agents call shared actions</h3><p>Tools and Vue components both use Pinia, the facade, and the centralized local Universal Drug Index.</p><code>store → facade → UDI service</code></article>
      </div>
    </section>

    <section class="page-width demo-domain" aria-labelledby="domain-title">
      <div class="section-heading split-heading"><div><span class="eyebrow">Beyond shopping</span><h2 id="domain-title">A domain layer agents can reason over.</h2></div><p>UDI ids connect search results to price offers, related-record discovery, synthetic interaction review, procurement planning, cart actions, and future authoritative adapters.</p></div>
      <div class="demo-domain-grid">
        <article><span>01</span><h3>Normalized identity</h3><p>Every record has one stable demo UDI plus explicit empty RxCUI and NDC fields ready for an import pipeline.</p><code>search_drug_index → drugId</code></article>
        <article><span>02</span><h3>Safe related records</h3><p>Broad groups help prepare clinician questions while refusing to label records as therapeutic equivalents.</p><code>find_related_drugs</code></article>
        <article><span>03</span><h3>Incomplete-data honesty</h3><p>Synthetic interaction flags always expose coverage limits and require professional verification.</p><code>review_demo_interaction_flags</code></article>
        <article><span>04</span><h3>Local procurement</h3><p>Agents can optimize fictional offers without reserving inventory, validating a prescription, or ordering.</p><code>build_procurement_plan</code></article>
      </div>
      <div class="demo-domain-actions"><RouterLink class="button button-dark" to="/udi">Explore the Universal Drug Index <ArrowRight :size="18" /></RouterLink><RouterLink class="button button-ghost" to="/flow-lab">Open the live flow lab <ArrowRight :size="18" /></RouterLink></div>
    </section>

    <section class="demo-tool-catalog" data-agent-section="tool-catalog" aria-labelledby="catalog-title">
      <div class="page-width">
        <div class="section-heading split-heading"><div><span class="eyebrow">Live manifest</span><h2 id="catalog-title">{{ store.webMcp.available }} agent-ready tools.</h2></div><p>Open “Agent tools” in the header to inspect every parameter and the optional voice transcript.</p></div>
        <div class="demo-tool-grid">
          <article v-for="tool in store.webMcp.tools" :key="tool.name"><div><Bot :size="19" /><span>{{ tool.annotations?.readOnlyHint ? 'Read only' : 'Local mutation' }}</span></div><h3>{{ tool.title }}</h3><code>{{ tool.name }}</code><p>{{ tool.description }}</p></article>
        </div>
        <p v-if="!readOnlyTools.length" class="agent-notice"><Bot :size="18" /> Tool registration is initializing.</p>
      </div>
    </section>

    <section class="page-width demo-comparison-section">
      <ComparisonPanel compact />
    </section>

    <section class="page-width demo-finale">
      <div><span class="eyebrow">Built to evaluate</span><h2>Every tool contract ships with a testable journey.</h2><p>Deterministic unit tests cover service behavior, while Chrome-compatible eval fixtures measure tool selection, parameters, multi-step order, and appropriate refusal.</p></div>
      <RouterLink class="button button-dark" to="/flow-lab">Open the live workflow lab <ArrowRight :size="18" /></RouterLink>
    </section>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
