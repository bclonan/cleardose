<script setup>
import { computed, nextTick, ref } from "vue";
import { Bot, Check, Clipboard, Download, FileText, Pause, Play, RotateCcw, Search, ShieldCheck, Sparkles } from "@lucide/vue";
import { hackathonShortcuts } from "../services/api/shortcuts/hackathonShortcuts";
import { capabilityCatalog, getCapability } from "../infrastructure/webmcp/catalog/capabilityCatalog";
import { AgentMemoryFileService } from "../services/files/AgentMemoryFileService";
import { usePharmacyStore } from "../composables/usePharmacyStore";

const store = usePharmacyStore();
const files = new AgentMemoryFileService();
const query = ref("");
const selectedId = ref(hackathonShortcuts[0].id);
const activeStep = ref(0);
const running = ref(false);
const runFlowId = ref("");
const announcement = ref("Shortcut runner ready.");
const memoryLabel = ref("ClearDose judge tour memory");
const memoryGoal = ref("Preserve the reviewed decisions and next steps from this fictional demo.");
const memoryFacts = ref("All medications and prices are fictional.\nNo real order or prescription was sent.");
const memoryDecisions = ref("Use human review before any clinician-facing handoff.");
const memoryNextSteps = ref("Inspect the referenced flow events.\nDelete the packet when it is no longer useful.");
const currentPacket = ref(null);

const selected = computed(() => hackathonShortcuts.find((item) => item.id === selectedId.value) ?? hackathonShortcuts[0]);
const filtered = computed(() => {
  const term = query.value.trim().toLowerCase();
  return !term ? hackathonShortcuts : hackathonShortcuts.filter((item) => `${item.title} ${item.category} ${item.summary} ${item.prompt}`.toLowerCase().includes(term));
});
const selectedCapability = computed(() => getCapability(selected.value.steps[Math.max(0, activeStep.value - 1)]?.capabilityId?.split(".").at(-1)) ?? getCapability("inspect_workflow_runtime"));

function lines(value) { return value.split("\n").map((item) => item.trim()).filter(Boolean); }
function delay(milliseconds) { return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds)); }

function selectShortcut(id) {
  selectedId.value = id; activeStep.value = 0; runFlowId.value = ""; announcement.value = "Shortcut selected.";
}

async function copy(text, label = "Prompt") {
  await globalThis.navigator?.clipboard?.writeText(text);
  announcement.value = `${label} copied. Paste it into a WebMCP-capable agent while ClearDose is open.`;
}

async function runVisual() {
  if (running.value) return;
  running.value = true; activeStep.value = 0;
  const flow = await store.startHackathonShortcut(selected.value);
  runFlowId.value = flow.id;
  for (let index = 0; index < selected.value.steps.length; index += 1) {
    activeStep.value = index + 1;
    await store.advanceHackathonShortcut(flow.id, selected.value, index);
    await nextTick(); await delay(360);
  }
  activeStep.value = selected.value.steps.length + 1;
  announcement.value = "Visual analog reached human review. This simulation did not invoke an external agent.";
  running.value = false;
}

async function completeVisual() {
  if (!runFlowId.value) return;
  await store.completeHackathonShortcut(runFlowId.value);
  activeStep.value = selected.value.steps.length + 2;
  announcement.value = "Human review recorded; the shortcut analog is complete.";
}

async function prepareMemory() {
  currentPacket.value = await store.prepareAgentMemoryPacket({
    label: memoryLabel.value, goal: memoryGoal.value, facts: lines(memoryFacts.value), decisions: lines(memoryDecisions.value), nextSteps: lines(memoryNextSteps.value), flowIds: [runFlowId.value, store.selectedFlowId].filter(Boolean), scope: selected.value.scope,
  });
  announcement.value = "Memory packet prepared for review. Nothing was copied or saved automatically.";
}

async function copyMemory() {
  if (!currentPacket.value) return;
  const result = await files.copy(currentPacket.value.markdown);
  await store.markMemoryExported(currentPacket.value.id, result.method);
  announcement.value = "Memory packet copied after explicit review.";
}

async function saveMemory() {
  if (!currentPacket.value) return;
  const result = await files.save(currentPacket.value);
  await store.markMemoryExported(currentPacket.value.id, result.method);
  announcement.value = `Memory packet saved using ${result.method}.`;
}
</script>

<template>
  <div class="shortcut-page">
    <section class="shortcut-hero" data-agent-section="hackathon-shortcuts">
      <div class="shortcut-hero-copy"><span class="eyebrow"><Sparkles :size="16" /> Judge-ready prompt chains</span><h1>Copy the prompt. Watch the machine.</h1><p>Run single-step or multi-step ClearDose WebMCP demos in your own agent while a deterministic analog exposes states, event ids, scope, and bounded context side by side.</p><div class="hero-safety"><ShieldCheck :size="18" /><span>Fictional data only. Visual runs simulate orchestration; copied prompts invoke tools only in a compatible browser and remain subject to human review.</span></div></div>
      <div class="shortcut-hero-stat"><strong>{{ capabilityCatalog.length }}</strong><span>cataloged capabilities</span><strong>{{ hackathonShortcuts.length }}</strong><span>prompt shortcuts</span></div>
    </section>

    <section class="shortcut-workbench" aria-label="Hackathon shortcut workbench">
      <aside class="shortcut-library">
        <label class="shortcut-search"><Search :size="17" /><span class="sr-only">Search shortcuts</span><input v-model="query" type="search" placeholder="Search prompt chains" /></label>
        <div class="shortcut-list">
          <button v-for="shortcut in filtered" :key="shortcut.id" type="button" :class="{ selected: shortcut.id === selected.id }" :aria-pressed="shortcut.id === selected.id" @click="selectShortcut(shortcut.id)"><span><em>{{ shortcut.mode }}</em><small>{{ shortcut.duration }}</small></span><strong>{{ shortcut.title }}</strong><p>{{ shortcut.summary }}</p></button>
        </div>
      </aside>

      <div class="shortcut-stage">
        <article class="prompt-chain-card" data-agent-section="prompt-chain">
          <header><div><span class="eyebrow"><Bot :size="15" /> {{ selected.category }}</span><h2>{{ selected.title }}</h2><p>{{ selected.summary }}</p></div><button class="button button-dark" type="button" @click="copy(selected.prompt, 'Full chain prompt')"><Clipboard :size="16" /> Copy full prompt</button></header>
          <blockquote>{{ selected.prompt }}</blockquote>
          <div class="shortcut-scope"><span v-for="(value, key) in selected.scope" :key="key"><small>{{ key }}</small>{{ value }}</span></div>
          <ol class="shortcut-steps">
            <li v-for="(item, index) in selected.steps" :key="item.id" :class="{ active: activeStep === index + 1, complete: activeStep > index + 1 }"><span>{{ activeStep > index + 1 ? '✓' : index + 1 }}</span><div><strong>{{ item.title }}</strong><code>{{ item.capabilityId }}</code><p>{{ item.prompt }}</p></div><button type="button" :aria-label="`Copy step ${index + 1} prompt`" @click="copy(item.prompt, `Step ${index + 1}`)"><Clipboard :size="15" /></button></li>
          </ol>
          <div class="shortcut-actions"><button class="button button-primary" type="button" :disabled="running" @click="runVisual"><Pause v-if="running" :size="17" /><Play v-else :size="17" />{{ running ? 'Running visual analog…' : 'Run visual analog' }}</button><button class="button button-outline" type="button" :disabled="!runFlowId || running" @click="completeVisual"><Check :size="17" /> Record human review</button><button type="button" class="text-action" @click="activeStep = 0; runFlowId = ''"><RotateCcw :size="15" /> Reset view</button></div>
        </article>

        <CdPrescriptionRecoveryPanel v-if="selected.id === 'prescription-recovery' || selected.id === 'negative-recovery-lab'" />

        <div class="shortcut-observatory" data-agent-section="shortcut-observatory">
          <CdCapabilityMachinePane :shortcut="selected" :capability="selectedCapability" :active-step="activeStep" />
          <CdWorkflowLiveViewer compact :max-events="18" />
        </div>
      </div>
    </section>

    <section class="memory-workbench" data-agent-section="agent-memory" aria-labelledby="memory-title">
      <div class="memory-copy"><span class="eyebrow"><FileText :size="16" /> User-controlled feedback loop</span><h2 id="memory-title">Prepare context for an agent memory—without silently writing one.</h2><p>Edit exactly what may be retained. ClearDose creates a structured packet and Markdown file; copying or saving requires your explicit action. No browser standard can safely auto-prompt every external LLM.</p></div>
      <div class="memory-grid">
        <form class="memory-form" @submit.prevent="prepareMemory"><label>Packet label<input v-model="memoryLabel" maxlength="100" /></label><label>Goal<textarea v-model="memoryGoal" rows="2" maxlength="500"></textarea></label><label>Facts <small>One per line</small><textarea v-model="memoryFacts" rows="3"></textarea></label><label>Decisions <small>One per line</small><textarea v-model="memoryDecisions" rows="3"></textarea></label><label>Next steps <small>One per line</small><textarea v-model="memoryNextSteps" rows="3"></textarea></label><button class="button button-dark" type="submit"><Sparkles :size="16" /> Prepare review packet</button></form>
        <article class="memory-preview"><template v-if="currentPacket"><div><span>Human review</span><code>{{ currentPacket.id }}</code></div><pre tabindex="0"><code>{{ currentPacket.markdown }}</code></pre><div class="memory-actions"><button class="button button-primary" type="button" @click="copyMemory"><Clipboard :size="16" /> Copy for my agent</button><button class="button button-outline" type="button" @click="saveMemory"><Download :size="16" /> Save Markdown</button></div></template><div v-else class="empty-memory"><FileText :size="34" /><h3>No packet yet</h3><p>Prepare one to inspect every field before export.</p></div></article>
      </div>
    </section>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
