<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { AlertTriangle, Check, ChevronRight, Clock3, Code2, Pause, Play, RefreshCcw, RotateCcw, StepForward } from "@lucide/vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { agentReadyProps } from "../presentation/agentReadyProps";

const props = defineProps({ ...agentReadyProps });
useAgentReadyComponent(props, { name: "programmatic_replay_panel", defaultAdapter: Object.freeze({}) });
const store = usePharmacyStore();
const route = useRoute();
const manualStarted = ref(null);
const manualElapsedMs = ref(0);
const announcement = ref("Replay controls ready.");
const scenario = computed(() => store.demoScenario(store.demoLab.selectedScenarioId || store.replay.scenarioId));
const trace = computed(() => store.replay.steps ?? []);
const toolsReady = computed(() => Boolean(scenario.value) && scenario.value.steps.every((step) => store.webMcp.tools.some((tool) => (tool.name === step.toolName || tool.name.endsWith(`_${step.toolName}`)) && tool.locallyInvokable)));
const canStart = computed(() => Boolean(scenario.value) && toolsReady.value && !["running"].includes(store.replay.status));
const timingDifference = computed(() => manualElapsedMs.value && store.replay.totalElapsedMs ? Math.round((manualElapsedMs.value - store.replay.totalElapsedMs) * 100) / 100 : 0);

function elapsedSince(started) {
  return Math.max(0, Math.round(((globalThis.performance?.now?.() ?? Date.now()) - started) * 100) / 100);
}

function replayRoute(path) {
  const normalized = path.startsWith("/medications/")
    ? "/medications"
    : path.startsWith("/checkout/confirmation/")
      ? "/checkout/confirmation"
      : path;
  return scenario.value?.routes.includes(normalized) ? normalized : scenario.value?.routes[0] ?? normalized;
}

function startManualTimer() {
  manualStarted.value = globalThis.performance?.now?.() ?? Date.now();
  manualElapsedMs.value = 0;
  announcement.value = "Manual workflow timer started.";
}

function stopManualTimer() {
  if (manualStarted.value == null) return;
  manualElapsedMs.value = elapsedSince(manualStarted.value);
  manualStarted.value = null;
  announcement.value = `Manual timer stopped at ${manualElapsedMs.value} milliseconds.`;
}

async function startReplay() {
  if (!scenario.value) return;
  try { await store.runReplayScenario(scenario.value.id, { route: replayRoute(route.path), resetSeed: true }); }
  catch (error) { announcement.value = error instanceof Error ? error.message : "The replay could not start."; }
}

async function stepReplay() {
  if (!scenario.value) return;
  try { await store.stepReplayScenario(scenario.value.id, { route: replayRoute(route.path), resetSeed: store.replay.scenarioId !== scenario.value.id }); }
  catch (error) { announcement.value = error instanceof Error ? error.message : "The replay step failed."; }
}
</script>

<template>
  <section class="replay-panel" data-agent-section="programmatic-replay" aria-labelledby="replay-panel-title">
    <header>
      <div><span class="eyebrow"><Code2 :size="15" /> Programmatic replay</span><h2 id="replay-panel-title">{{ scenario?.title || 'Choose a route demo' }}</h2></div>
      <span class="replay-status" :data-status="store.replay.status">{{ store.replay.status }}</span>
    </header>
    <p v-if="scenario">{{ scenario.summary }}</p>
    <p v-else class="empty-replay">Choose a contextual prompt to load its executable trace.</p>

    <div class="replay-controls" aria-label="Replay controls">
      <button v-if="store.replay.status !== 'running'" class="button button-primary" type="button" :disabled="!canStart" @click="startReplay"><Play :size="16" /> {{ toolsReady ? 'Run' : 'Loading tools' }}</button>
      <button v-else class="button button-primary" type="button" @click="store.pauseReplay"><Pause :size="16" /> Pause</button>
      <button v-if="store.replay.status === 'paused' && store.replay.steps.length" class="button button-ghost" type="button" @click="store.resumeReplay"><Play :size="16" /> Resume</button>
      <button class="button button-ghost" type="button" :disabled="!scenario || !toolsReady || store.replay.status === 'running'" @click="stepReplay"><StepForward :size="16" /> Step</button>
      <button class="button button-ghost" type="button" :disabled="!store.replay.scenarioId" @click="store.restartReplay({ autoRun: true, route: replayRoute(route.path) })"><RefreshCcw :size="16" /> Restart</button>
      <button class="text-action" type="button" @click="store.resetReplay"><RotateCcw :size="15" /> Reset seeded state</button>
    </div>

    <div class="replay-timing-grid">
      <div><span>Programmatic total</span><strong>{{ store.replay.totalElapsedMs || 0 }} ms</strong><small>Measured across the replay steps</small></div>
      <div><span>Manual comparison</span><strong>{{ manualStarted !== null ? 'Timing now' : `${manualElapsedMs || 0} ms` }}</strong><button type="button" @click="manualStarted === null ? startManualTimer() : stopManualTimer()"><Clock3 :size="14" />{{ manualStarted === null ? 'Start manual timer' : 'Stop manual timer' }}</button></div>
      <div><span>Difference</span><strong>{{ timingDifference ? `${Math.abs(timingDifference)} ms` : 'Run both paths' }}</strong><small v-if="timingDifference">{{ timingDifference > 0 ? 'Replay was faster' : 'Manual path was faster' }}</small></div>
    </div>

    <ol v-if="scenario" class="replay-step-list">
      <li v-for="(step, index) in scenario.steps" :key="step.id" :class="{ active: store.replay.nextStepIndex === index && store.replay.status === 'running', complete: trace[index]?.status === 'complete', failed: ['error', 'expected-error'].includes(trace[index]?.status) }">
        <span class="replay-step-marker"><Check v-if="trace[index]?.status === 'complete'" :size="15" /><AlertTriangle v-else-if="trace[index]?.status === 'error' || trace[index]?.status === 'expected-error'" :size="15" /><span v-else>{{ index + 1 }}</span></span>
        <div><strong>{{ step.title }}</strong><code>{{ step.toolName }}</code><small>{{ trace[index]?.elapsedMs != null ? `${trace[index].elapsedMs} ms` : 'Waiting' }} · seeded mock</small></div>
        <details v-if="trace[index]" class="replay-step-detail">
          <summary>Request, response, and changes <ChevronRight :size="14" /></summary>
          <div class="replay-io-grid"><section><h3>Input</h3><pre tabindex="0"><code>{{ JSON.stringify(trace[index].request, null, 2) }}</code></pre></section><section><h3>{{ trace[index].response ? 'Output' : 'Error' }}</h3><pre tabindex="0"><code>{{ JSON.stringify(trace[index].response || trace[index].error, null, 2) }}</code></pre></section><section v-if="trace[index].response && trace[index].error"><h3>Error summary</h3><pre tabindex="0"><code>{{ JSON.stringify(trace[index].error, null, 2) }}</code></pre></section></div>
          <section><h3>Relevant DOM and state changes</h3><ul v-if="trace[index].changes.length"><li v-for="change in trace[index].changes" :key="change.key"><code>{{ change.key }}</code><span>{{ JSON.stringify(change.before) }} → {{ JSON.stringify(change.after) }}</span></li></ul><p v-else>No bounded state value changed during this read-only step.</p></section>
          <p v-if="trace[index].recovery" class="replay-recovery"><AlertTriangle :size="15" /> Recovery: {{ trace[index].recovery.label }}</p>
        </details>
      </li>
    </ol>
    <p class="replay-disclosure">{{ scenario?.mockDisclosure.detail || 'All replay operations stay inside the local fictional sandbox.' }}</p>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </section>
</template>
