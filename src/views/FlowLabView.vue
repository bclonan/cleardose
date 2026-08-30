<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { AlertTriangle, ArrowUpRight, Bot, Braces, Check, Database, Play, RotateCcw, Send, SplitSquareVertical } from "@lucide/vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";

const store = usePharmacyStore();
const drugId = ref("med_lisinopril");
const selectedRelatedIds = ref(["med_losartan"]);
const concernsText = ref("What should I understand before asking about another option?\nWhich price differences are worth discussing?");
const exchange = ref(null);
const draftJson = ref("");
const localError = ref("");
const announcement = ref("Flow lab ready.");

const primaryDrug = computed(() => store.drugIndexEntry(drugId.value));
const related = computed(() => store.findRelatedDrugs({ drugId: drugId.value, limit: 5 }).related);
const latestCard = computed(() => exchange.value ? store.workflow.cards.find((card) => card.exchangeId === exchange.value.id) : store.workflow.cards[0]);

watch(related, (records) => {
  const available = new Set(records.map((drug) => drug.id));
  selectedRelatedIds.value = selectedRelatedIds.value.filter((id) => available.has(id));
  if (!selectedRelatedIds.value.length && records[0]) selectedRelatedIds.value = [records[0].id];
}, { immediate: true });

onMounted(() => {
  if (!store.selectedFlowId && store.workflow.flows[0]) store.selectWorkflow(store.workflow.flows[0].id);
});

async function prepareHandoff() {
  localError.value = "";
  try {
    const concerns = concernsText.value.split("\n").map((item) => item.trim()).filter(Boolean);
    exchange.value = await store.prepareDoctorQuestionCard({ drugId: drugId.value, relatedDrugIds: selectedRelatedIds.value, concerns });
    draftJson.value = JSON.stringify({
      exchangeId: exchange.value.id,
      title: `Questions about ${primaryDrug.value.name}`,
      questions: [
        `What should I understand about continuing ${primaryDrug.value.name}?`,
        "Which benefits, risks, monitoring, and costs should we discuss before considering any change?",
      ],
    }, null, 2);
    announcement.value = "Structured site-to-agent handoff prepared.";
  } catch (error) { localError.value = error.message; }
}

async function submitDraft() {
  localError.value = "";
  try {
    const payload = JSON.parse(draftJson.value);
    await store.submitDoctorQuestionCard(payload);
    announcement.value = "Structured agent response stored as a patient-reviewable draft.";
  } catch (error) { localError.value = error instanceof SyntaxError ? "Draft JSON is invalid." : error.message; }
}

async function runScenario(id) {
  const flow = await store.runWorkflowScenario(id);
  announcement.value = `${flow.title} executed its seeded failure operation and recorded the evidence in the live viewer.`;
}

async function resetLab() {
  await store.clearWorkflowLab();
  exchange.value = null;
  draftJson.value = "";
  announcement.value = "Seeded state lab reset.";
}
</script>

<template>
  <div class="flow-lab-page">
    <section class="flow-lab-top">
      <div class="page-width flow-lab-heading">
        <div><span class="eyebrow"><SplitSquareVertical :size="17" /> DuckDB-Wasm state lab</span><h1>Choose a branch.<br /><em>See what actually changed.</em></h1><p>Use the patient controls and branching inspector together, or open ClearDose in a second tab. Event ids, valid and blocked actions, current state, and bounded context stay in the local database and stream across tabs.</p></div>
        <div class="flow-lab-heading-actions"><a class="button button-light" href="#/udi" target="_blank" rel="noreferrer">Open patient tab <ArrowUpRight :size="17" /></a><button class="button button-outline-light" type="button" @click="resetLab"><RotateCcw :size="17" /> Reset seeded state lab</button></div>
      </div>
    </section>

    <section class="flow-dual-pane page-width" aria-label="Interactive workflow and live viewer">
      <div class="flow-action-pane">
        <header><span class="eyebrow"><Bot :size="16" /> Site → agent → site</span><h2>Structured question-card exchange</h2><p>The first call gives the agent bounded UDI context, a template-literal instruction, and the exact schema expected by the second call.</p></header>
        <form class="exchange-form" toolname="cleardose_populate_question_card_demo" tooldescription="Populate the visible local question-card demonstration. This form does not store real health information." @submit.prevent="prepareHandoff">
          <label>Primary demo drug<select v-model="drugId" name="drugId" toolparamdescription="Exact visible ClearDose UDI drug id"><option v-for="drug in store.medications" :key="drug.id" :value="drug.id">{{ drug.name }}</option></select></label>
          <fieldset><legend>Discussion-only related records (up to three)</legend><label v-for="drug in related" :key="drug.id"><input v-model="selectedRelatedIds" type="checkbox" name="relatedDrugIds" :value="drug.id" :disabled="selectedRelatedIds.length >= 3 && !selectedRelatedIds.includes(drug.id)" /> <span>{{ drug.name }} <small>{{ drug.drugClass }}</small></span></label></fieldset>
          <label>Fictional patient concerns<textarea v-model="concernsText" name="concerns" rows="4" autocomplete="off" toolparamdescription="Short fictional concerns, one per line; never enter real health information"></textarea></label>
          <button class="button button-orange" type="submit"><Send :size="17" /> 1. Prepare agent handoff</button>
        </form>

        <div v-if="exchange" class="exchange-payload">
          <details open><summary><Braces :size="16" /> Site instruction + expected schema</summary><p>{{ exchange.instruction }}</p><pre tabindex="0"><code>{{ JSON.stringify(exchange.expectedResponseSchema, null, 2) }}</code></pre></details>
          <label>Simulated structured agent response<textarea v-model="draftJson" name="agentDraft" autocomplete="off" rows="12" spellcheck="false"></textarea></label>
          <button class="button button-dark" type="button" @click="submitDraft"><Bot :size="17" /> 2. Submit structured response</button>
          <small>The simulator stands in for the second WebMCP call. Edit the JSON to see strict validation failures.</small>
        </div>
        <p v-if="localError" class="flow-error" role="alert"><AlertTriangle :size="17" /> {{ localError }}</p>
        <CdDoctorQuestionCard v-if="latestCard" :card="latestCard" @review="store.markQuestionCardReviewed" />
      </div>

      <div class="flow-viewer-pane"><CdWorkflowLiveViewer /></div>
    </section>

    <section class="failure-lab" data-agent-section="failure-lab">
      <div class="page-width">
        <div class="section-heading split-heading"><div><span class="eyebrow"><AlertTriangle :size="17" /> Executable failure fixtures</span><h2>Failures are states, too.</h2></div><p>Each case executes a bounded validation or seeded domain call, then records the observed error and recovery branch without sending or storing real patient data.</p></div>
        <div class="failure-grid">
          <article v-for="scenario in store.workflow.scenarios" :key="scenario.id"><span>{{ scenario.id }}</span><h3>{{ scenario.title }}</h3><p>{{ scenario.description }}</p><button class="button button-ghost" type="button" @click="runScenario(scenario.id)"><Play :size="16" /> Execute failure</button></article>
        </div>
      </div>
    </section>

    <section class="page-width flow-local-architecture">
      <div><span class="eyebrow"><Database :size="17" /> Local-first mechanics</span><h2>One event contract, three views.</h2></div>
      <ol><li><span>01</span><strong>Vue and WebMCP dispatch</strong><p>Human actions, tool calls, and test fixtures emit the same transition shape.</p></li><li><span>02</span><strong>DuckDB-Wasm persists</strong><p>OPFS stores the drug seed, flow instances, events, exchanges, and cards locally.</p></li><li><span>03</span><strong>BroadcastChannel mirrors</strong><p>A second tab receives the same ids and context without a remote server.</p></li></ol>
      <p class="flow-local-note"><Check :size="17" /> If OPFS or a concurrent writer is unavailable, the tab reports a visible memory fallback and continues the demonstration.</p>
    </section>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
