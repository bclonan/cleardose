<script setup>
import { computed, ref, watch } from "vue";
import { Bot, Clipboard, Download, FileText, Pause, Play, RotateCcw, Search, ShieldCheck, Sparkles, StepForward, Volume2 } from "@lucide/vue";
import { AgentMemoryFileService } from "../services/files/AgentMemoryFileService";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { ClipboardService } from "../services/ui/ClipboardService";
import { VoiceGuidanceService } from "../services/accessibility/VoiceGuidanceService";

const store = usePharmacyStore();
const files = new AgentMemoryFileService();
const clipboard = new ClipboardService();
const voice = new VoiceGuidanceService();
const hackathonShortcuts = store.hackathonShortcutCatalog;
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
const selectedCapability = computed(() => store.capabilityByName(selected.value.steps[Math.max(0, activeStep.value - 1)]?.capabilityId?.split(".").at(-1)) ?? store.capabilityByName("inspect_workflow_runtime"));
const replayScenarioId = computed(() => `shortcut-${selected.value.id}`);
const replayScenario = computed(() => store.demoScenario(replayScenarioId.value));
const replayStatus = computed(() => store.replay.scenarioId === replayScenarioId.value ? store.replay.status : "idle");

function lines(value) { return value.split("\n").map((item) => item.trim()).filter(Boolean); }
function selectShortcut(id) {
  selectedId.value = id; activeStep.value = 0; runFlowId.value = ""; store.demoLab.selectedScenarioId = replayScenarioId.value; announcement.value = "Shortcut selected.";
}

async function copy(text, label = "Prompt") {
  try { await clipboard.copy(text); announcement.value = `${label} copied. Paste it into a WebMCP-capable agent while ClearDose is open.`; }
  catch (error) { announcement.value = error.message; }
}
function readPrompt(text) { const started = voice.speak(text); announcement.value = started ? "Reading the visible prompt." : "Voice playback is unavailable. The full prompt remains visible."; }
function replayTrace(index) { return store.replay.scenarioId === replayScenarioId.value ? store.replay.steps[index] ?? null : null; }
function replayStepComplete(index) { return ["complete", "expected-error"].includes(replayTrace(index)?.status); }
function replayStepBlocked(index) { return replayTrace(index)?.status === "error"; }
function replayStepMarker(index) { return replayStepComplete(index) ? "✓" : replayStepBlocked(index) ? "!" : index + 1; }

function replayResultMessage(result, { partialTarget = null } = {}) {
  if (result.status === "complete") return `Programmatic replay completed all ${result.steps.length} exact capability calls.`;
  if (result.status === "error") {
    const trace = result.steps.at(-1);
    const route = trace?.request?.requiredRoute;
    const reason = trace?.error?.code ?? "REPLAY_STEP_FAILED";
    return `Replay stopped at step ${(trace?.index ?? 0) + 1}, ${trace?.toolName ?? "unknown tool"}. ${reason}.${route ? ` Open ${route} with its visible form to run this declarative capability.` : " No later step was claimed as complete."}`;
  }
  if (result.status === "paused") return partialTarget == null ? "Ran one exact capability call. The replay is paused." : `Ran exact capability calls through step ${partialTarget + 1}. The replay is paused.`;
  return "Replay is running through the listed capability calls.";
}

async function runVisual() {
  if (running.value) return;
  running.value = true; activeStep.value = 0;
  try {
    const result = await store.runReplayScenario(replayScenarioId.value, { route: "/shortcuts", resetSeed: true });
    runFlowId.value = result.workflowFlowId;
    activeStep.value = result.status === "complete" ? selected.value.steps.length + 1 : Math.max(1, result.currentStepIndex + 1);
    announcement.value = replayResultMessage(result);
  } catch (error) {
    announcement.value = error instanceof Error ? error.message : "The replay could not run.";
  } finally { running.value = false; }
}

async function pauseReplay() { await store.pauseReplay(); announcement.value = "Replay paused after the current call."; }
async function resumeReplay() { const result = await store.resumeReplay(); announcement.value = replayResultMessage(result); }
async function stepReplay() {
  const result = await store.stepReplayScenario(replayScenarioId.value, { route: "/shortcuts", resetSeed: replayStatus.value === "idle" });
  runFlowId.value = result.workflowFlowId;
  activeStep.value = result.status === "complete" ? selected.value.steps.length + 1 : Math.max(1, result.currentStepIndex + 1);
  announcement.value = replayResultMessage(result);
}
async function runToStep(index) {
  if (running.value || !replayScenario.value) return;
  running.value = true;
  try {
    await store.resetReplay();
    let result = null;
    const lastStep = Math.min(index, replayScenario.value.steps.length - 1);
    for (let stepIndex = 0; stepIndex <= lastStep; stepIndex += 1) {
      result = await store.stepReplayScenario(replayScenarioId.value, { route: "/shortcuts", resetSeed: false });
      if (["complete", "error"].includes(result.status)) break;
    }
    runFlowId.value = result?.workflowFlowId ?? "";
    activeStep.value = result?.status === "complete" ? selected.value.steps.length + 1 : Math.max(1, (result?.currentStepIndex ?? 0) + 1);
    store.openDemoLab("replay", { scenarioId: replayScenarioId.value });
    announcement.value = replayResultMessage(result, { partialTarget: lastStep });
  } catch (error) {
    announcement.value = error instanceof Error ? error.message : "The replay step could not run.";
  } finally { running.value = false; }
}
function inspectReplay() { store.openDemoLab("replay", { scenarioId: replayScenarioId.value }); announcement.value = "Replay trace opened in the demo lab."; }
function inspectStep(index) {
  const toolName = selected.value.steps[index]?.capabilityId?.split(".").at(-1) ?? "";
  store.openDemoLab("replay", { scenarioId: replayScenarioId.value, toolName });
  announcement.value = `Inspecting the ${toolName || "selected"} call at shortcut step ${index + 1}. Run through this step first if its trace is empty.`;
}
async function resetReplay() { await store.resetReplay(); activeStep.value = 0; runFlowId.value = ""; announcement.value = "Replay and seeded demo state reset."; }

watch(() => store.replay.currentStepIndex, (index) => {
  if (store.replay.scenarioId === replayScenarioId.value && index >= 0) activeStep.value = Math.min(selected.value.steps.length + 1, index + 1);
});

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
      <div class="shortcut-hero-copy"><span class="eyebrow"><Sparkles :size="16" /> Judge-ready prompt chains</span><h1>Copy the prompt. Watch the machine.</h1><p>Run each chain through the same local handlers used by ClearDose WebMCP tools. The trace shows state, event ids, bounded inputs, outputs, timing, and visible changes.</p><div class="hero-safety"><ShieldCheck :size="18" /><span>All records and responses are seeded fiction. Copied prompts work only with a compatible browser agent and remain subject to human review.</span></div></div>
      <div class="shortcut-hero-stat"><strong>{{ store.capabilityManifest.length }}</strong><span>cataloged capabilities</span><strong>{{ hackathonShortcuts.length }}</strong><span>prompt shortcuts</span></div>
    </section>

    <section class="shortcut-workbench" aria-label="Hackathon shortcut workbench">
      <aside class="shortcut-library">
        <label class="shortcut-search"><Search :size="17" /><span class="sr-only">Search shortcuts</span><input v-model="query" name="shortcut-query" type="search" autocomplete="off" placeholder="Search prompt chains" /></label>
        <div class="shortcut-list">
          <button v-for="shortcut in filtered" :key="shortcut.id" type="button" :class="{ selected: shortcut.id === selected.id }" :aria-pressed="shortcut.id === selected.id" @click="selectShortcut(shortcut.id)"><span><em>{{ shortcut.mode }}</em><small>{{ shortcut.duration }}</small></span><strong>{{ shortcut.title }}</strong><p>{{ shortcut.summary }}</p><q>{{ shortcut.prompt }}</q></button>
        </div>
      </aside>

      <div class="shortcut-stage">
        <article class="prompt-chain-card" data-agent-section="prompt-chain">
          <header><div><span class="eyebrow"><Bot :size="15" /> {{ selected.category }}</span><h2>{{ selected.title }}</h2><p>{{ selected.summary }}</p></div></header>
          <div class="shortcut-human-prompt"><strong>Say or paste this into your agent</strong><blockquote>{{ selected.prompt }}</blockquote><div><button class="button button-dark" type="button" @click="copy(selected.prompt, 'Full chain prompt')"><Clipboard :size="16" /> Copy this exact prompt</button><button class="button button-ghost" type="button" @click="readPrompt(selected.prompt)"><Volume2 :size="16" /> Read aloud</button></div></div>
          <div v-if="replayScenario" class="shortcut-prompt-variants">
            <details><summary>Voice prompt</summary><p>{{ replayScenario.prompts.voice }}</p></details>
            <details><summary>Advanced prompt</summary><p>{{ replayScenario.prompts.advanced }}</p></details>
            <div><strong>Expected result</strong><p>{{ replayScenario.expectedResult.summary }}</p><small>Tools: {{ replayScenario.capabilityIds.join(', ') }}</small></div>
          </div>
          <div class="shortcut-scope"><span v-for="(value, key) in selected.scope" :key="key"><small>{{ key }}</small>{{ value }}</span></div>
          <p class="shortcut-replay-note">Replay calls each capability named below, in order. It stops on a blocked or failed call and leaves every order, payment, contact, transfer, copy, and save action to you.</p>
          <ol class="shortcut-steps">
            <li v-for="(item, index) in selected.steps" :key="item.id" :class="{ active: activeStep === index + 1, complete: replayStepComplete(index), blocked: replayStepBlocked(index) }"><span>{{ replayStepMarker(index) }}</span><div><strong>{{ item.title }}</strong><code>{{ item.capabilityId }}</code><p><b>Say:</b> {{ item.prompt }}</p><small v-if="replayStepBlocked(index)" role="status">Blocked: {{ replayTrace(index)?.error?.code || 'REPLAY_STEP_FAILED' }}. No later step ran.</small></div><div class="shortcut-step-actions"><button type="button" :aria-label="`Run exact calls through step ${index + 1}`" @click="runToStep(index)"><Play :size="15" /><span>Run through here</span></button><button type="button" :aria-label="`Copy step ${index + 1} prompt`" @click="copy(item.prompt, `Step ${index + 1}`)"><Clipboard :size="15" /><span>Copy</span></button><button type="button" :aria-label="`Inspect calls for step ${index + 1}`" @click="inspectStep(index)"><Search :size="15" /><span>Inspect Calls</span></button></div></li>
          </ol>
          <div class="shortcut-actions">
            <button v-if="replayStatus !== 'running' && replayStatus !== 'paused'" class="button button-primary" type="button" :disabled="running" @click="runVisual"><Play :size="17" />{{ running ? 'Running replay...' : 'Run programmatic replay' }}</button>
            <button v-if="replayStatus === 'running'" class="button button-primary" type="button" @click="pauseReplay"><Pause :size="17" /> Pause replay</button>
            <button v-if="replayStatus === 'paused'" class="button button-primary" type="button" @click="resumeReplay"><Play :size="17" /> Resume replay</button>
            <button class="button button-outline" type="button" :disabled="running || replayStatus === 'running'" @click="stepReplay"><StepForward :size="17" /> Step</button>
            <button class="button button-outline" type="button" @click="inspectReplay"><Search :size="17" /> Inspect calls</button>
            <button type="button" class="text-action" @click="resetReplay"><RotateCcw :size="15" /> Reset</button>
          </div>
        </article>

        <CdPrescriptionRecoveryPanel v-if="selected.id === 'prescription-recovery' || selected.id === 'negative-recovery-lab'" />

        <div class="shortcut-observatory" data-agent-section="shortcut-observatory">
          <CdCapabilityMachinePane :shortcut="selected" :capability="selectedCapability" :active-step="activeStep" />
          <CdWorkflowLiveViewer compact :max-events="18" />
        </div>
      </div>
    </section>

    <section class="memory-workbench" data-agent-section="agent-memory" aria-labelledby="memory-title">
      <div class="memory-copy"><span class="eyebrow"><FileText :size="16" /> User-controlled feedback loop</span><h2 id="memory-title">Prepare context for an agent memory without silently writing one.</h2><p>Edit exactly what may be retained. ClearDose creates a structured packet and Markdown file. Copying or saving requires your explicit action. No browser standard can safely auto-prompt every external LLM.</p></div>
      <div class="memory-grid">
        <form class="memory-form" autocomplete="off" aria-label="Agent memory packet fields" aria-describedby="memory-data-warning" @submit.prevent="prepareMemory">
          <div id="memory-data-warning" class="memory-data-warning"><ShieldCheck :size="19" aria-hidden="true" /><p>Use fictional demo details only. Do not enter real health, identity, contact, or prescription information. ClearDose returns the authored packet for immediate review, but stores only counts and workflow metadata.</p></div>
          <label>Packet label<input v-model="memoryLabel" name="memory-packet-label" autocomplete="off" maxlength="100" aria-describedby="memory-data-warning" /></label>
          <label>Goal<textarea v-model="memoryGoal" name="memory-goal" autocomplete="off" rows="2" maxlength="500" aria-describedby="memory-data-warning"></textarea></label>
          <label>Facts <small>One per line</small><textarea v-model="memoryFacts" name="memory-facts" autocomplete="off" rows="3" aria-describedby="memory-data-warning"></textarea></label>
          <label>Decisions <small>One per line</small><textarea v-model="memoryDecisions" name="memory-decisions" autocomplete="off" rows="3" aria-describedby="memory-data-warning"></textarea></label>
          <label>Next steps <small>One per line</small><textarea v-model="memoryNextSteps" name="memory-next-steps" autocomplete="off" rows="3" aria-describedby="memory-data-warning"></textarea></label>
          <button class="button button-dark" type="submit"><Sparkles :size="16" /> Prepare review packet</button>
        </form>
        <article class="memory-preview"><template v-if="currentPacket"><div><span>Human review</span><code>{{ currentPacket.id }}</code></div><pre tabindex="0"><code>{{ currentPacket.markdown }}</code></pre><div class="memory-actions"><button class="button button-primary" type="button" @click="copyMemory"><Clipboard :size="16" /> Copy for my agent</button><button class="button button-outline" type="button" @click="saveMemory"><Download :size="16" /> Save Markdown</button></div></template><div v-else class="empty-memory"><FileText :size="34" /><h3>No packet yet</h3><p>Prepare one to inspect every field before export.</p></div></article>
      </div>
    </section>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
