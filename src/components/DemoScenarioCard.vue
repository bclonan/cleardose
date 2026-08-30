<script setup>
import { computed, nextTick, ref, useId } from "vue";
import { useRoute } from "vue-router";
import { Bot, Braces, Check, Clipboard, Clock3, Eye, Mic2, Play, ShieldCheck } from "@lucide/vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { ClipboardService } from "../services/ui/ClipboardService";
import { normalizeDemoRoute } from "../domain/shared/demoRoute.js";

const props = defineProps({
  ...agentReadyProps,
  scenario: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});
useAgentReadyComponent(props, { name: "demo_scenario_card", defaultAdapter: Object.freeze({}) });
const route = useRoute();
const store = usePharmacyStore();
const clipboard = new ClipboardService();
const componentId = useId();
const promptMode = ref("human");
const announcement = ref("");
const promptModes = ["human", "voice", "advanced"];
const prompt = computed(() => props.scenario.prompts[promptMode.value] ?? props.scenario.prompts.human);
const promptPanelId = computed(() => `${componentId}-scenario-prompt-panel`);
const isRunning = computed(() => store.replay.scenarioId === props.scenario.id && store.replay.status === "running");
const toolsReady = computed(() => props.scenario.steps.every((step) => store.webMcp.tools.some((tool) => (tool.name === step.toolName || tool.name.endsWith(`_${step.toolName}`)) && tool.locallyInvokable)));

function replayRoute(path) {
  const normalized = normalizeDemoRoute(path);
  return props.scenario.routes.includes(normalized) ? normalized : props.scenario.routes[0];
}

async function copyPrompt() {
  try {
    await clipboard.copy(prompt.value);
    announcement.value = "Prompt copied.";
  } catch (error) {
    announcement.value = error instanceof Error ? error.message : "Copy failed. Select the visible prompt and copy it manually.";
  }
}

async function runDemo() {
  try {
    if (!toolsReady.value) throw new Error("The local tool registry is still loading. Try the replay again in a moment.");
    announcement.value = "Programmatic replay started.";
    await store.runReplayScenario(props.scenario.id, { route: replayRoute(route.path), resetSeed: true });
    announcement.value = "Programmatic replay finished. Open Inspect calls for the trace.";
  } catch (error) {
    announcement.value = error instanceof Error ? error.message : "The replay could not start.";
  }
}

function inspectCalls() {
  store.openDemoLab("replay", { scenarioId: props.scenario.id });
  announcement.value = "Replay calls opened.";
}

function promptTabId(mode) {
  return `${componentId}-scenario-prompt-tab-${mode}`;
}

function selectPromptMode(mode) {
  promptMode.value = mode;
}

async function handlePromptTabKeydown(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const currentIndex = promptModes.indexOf(promptMode.value);
  let nextIndex = currentIndex;
  if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = promptModes.length - 1;
  else nextIndex = (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + promptModes.length) % promptModes.length;
  const nextMode = promptModes[nextIndex];
  const tablist = event.currentTarget;
  selectPromptMode(nextMode);
  await nextTick();
  tablist.querySelector(`#${promptTabId(nextMode)}`)?.focus();
}
</script>

<template>
  <article class="scenario-card" :class="{ compact }">
    <header>
      <div><span class="scenario-type"><Bot :size="15" /> Runnable WebMCP scenario</span><h3>{{ scenario.title }}</h3></div>
      <span class="mock-chip"><ShieldCheck :size="14" /> Mocked</span>
    </header>
    <p>{{ scenario.summary }}</p>

    <div class="scenario-prompt-tabs" role="tablist" aria-label="Prompt detail" aria-orientation="horizontal" @keydown="handlePromptTabKeydown">
      <button :id="promptTabId('human')" type="button" role="tab" :aria-controls="promptPanelId" :aria-selected="promptMode === 'human'" :tabindex="promptMode === 'human' ? 0 : -1" @click="selectPromptMode('human')">Short prompt</button>
      <button :id="promptTabId('voice')" type="button" role="tab" :aria-controls="promptPanelId" :aria-selected="promptMode === 'voice'" :tabindex="promptMode === 'voice' ? 0 : -1" @click="selectPromptMode('voice')"><Mic2 :size="14" /> Voice-friendly</button>
      <button :id="promptTabId('advanced')" type="button" role="tab" :aria-controls="promptPanelId" :aria-selected="promptMode === 'advanced'" :tabindex="promptMode === 'advanced' ? 0 : -1" @click="selectPromptMode('advanced')"><Braces :size="14" /> Advanced</button>
    </div>
    <blockquote :id="promptPanelId" role="tabpanel" :aria-labelledby="promptTabId(promptMode)" tabindex="0">{{ prompt }}</blockquote>

    <div v-if="compact" class="scenario-compact-contract">
      <div><strong>Tools</strong><code v-for="tool in scenario.capabilityIds" :key="tool">{{ tool }}</code></div>
      <div><strong>Expected result</strong><p>{{ scenario.expectedResult.summary }}</p></div>
    </div>
    <details v-else class="scenario-contract">
      <summary>Tools and expected result</summary>
      <div><strong>WebMCP tools</strong><code v-for="tool in scenario.capabilityIds" :key="tool">{{ tool }}</code></div>
      <div><strong>Expected result</strong><p>{{ scenario.expectedResult.summary }}</p><ul><li v-for="check in scenario.expectedResult.checks" :key="check"><Check :size="14" />{{ check }}</li></ul></div>
      <small>{{ scenario.mockDisclosure.detail }}</small>
    </details>

    <footer>
      <button class="button button-primary" type="button" :disabled="isRunning || !toolsReady || store.replay.status === 'running'" @click="runDemo"><Play :size="16" /> {{ isRunning ? 'Running replay' : toolsReady ? 'Run programmatic replay' : 'Loading replay tools' }}</button>
      <button class="button button-ghost" type="button" @click="copyPrompt"><Clipboard :size="16" /> Copy prompt</button>
      <button class="text-action" type="button" @click="inspectCalls"><Eye :size="16" /> Inspect calls</button>
    </footer>
    <div v-if="store.replay.scenarioId === scenario.id && store.replay.totalElapsedMs" class="scenario-timing"><Clock3 :size="14" /> Last replay: {{ store.replay.totalElapsedMs }} ms</div>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </article>
</template>
