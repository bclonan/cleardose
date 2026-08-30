<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { Activity, FlaskConical, Play, TerminalSquare, X } from "@lucide/vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { normalizeDemoRoute } from "../domain/shared/demoRoute.js";
import DemoScenarioCard from "./DemoScenarioCard.vue";
import ProgrammaticReplayPanel from "./ProgrammaticReplayPanel.vue";
import WorkflowLiveViewer from "./WorkflowLiveViewer.vue";

const props = defineProps({ ...agentReadyProps });
useAgentReadyComponent(props, { name: "demo_lab_dock", defaultAdapter: Object.freeze({}) });
const route = useRoute();
const store = usePharmacyStore();
const panel = ref(null);
const opener = shallowRef(null);
const lastOutsideFocus = shallowRef(null);

function trackOutsideFocus(event) {
  if (!store.demoLab.open && event.target instanceof HTMLElement) lastOutsideFocus.value = event.target;
}

onMounted(() => document.addEventListener("focusin", trackOutsideFocus, true));
onBeforeUnmount(() => document.removeEventListener("focusin", trackOutsideFocus, true));

const scenarios = computed(() => {
  const contextual = store.demoScenariosForRoute(normalizeDemoRoute(route.path));
  return contextual.length ? contextual : [store.demoScenario("webmcp-explorer-tour")].filter(Boolean);
});

watch(scenarios, (items) => {
  if (store.demoLab.open && store.demoLab.tab === "replay" && store.replay.scenarioId === store.demoLab.selectedScenarioId && store.demoScenario(store.replay.scenarioId)) return;
  if (!items.some((item) => item.id === store.demoLab.selectedScenarioId)) store.demoLab.selectedScenarioId = items[0]?.id ?? "";
}, { immediate: true });

async function open(tab, event) {
  if (event?.currentTarget instanceof HTMLElement) opener.value = event.currentTarget;
  store.openDemoLab(tab, { scenarioId: store.demoLab.selectedScenarioId || scenarios.value[0]?.id });
}

watch(() => store.demoLab.open, async (isOpen) => {
  if (!isOpen) return;
  await nextTick();
  panel.value?.focus();
});

async function close() {
  const focusTarget = opener.value ?? lastOutsideFocus.value;
  opener.value = null;
  store.closeDemoLab();
  await nextTick();
  if (focusTarget?.isConnected && !focusTarget.disabled) focusTarget.focus();
}
</script>

<template>
  <div class="demo-lab-dock" data-agent-section="demo-lab">
    <nav class="demo-lab-rail" aria-label="Interactive demo laboratory">
      <button type="button" :aria-pressed="store.demoLab.open && store.demoLab.tab === 'prompts'" @click="open('prompts', $event)"><FlaskConical :size="17" /><span>Page demos</span><em>{{ scenarios.length }}</em></button>
      <button type="button" :aria-pressed="store.demoLab.open && store.demoLab.tab === 'replay'" :disabled="!scenarios.length && !store.replay.scenarioId" @click="open('replay', $event)"><Play :size="17" /><span>Replay</span></button>
      <RouterLink to="/demo#explorer"><TerminalSquare :size="17" /><span>Explorer</span></RouterLink>
      <button type="button" :aria-pressed="store.demoLab.open && store.demoLab.tab === 'state'" @click="open('state', $event)"><Activity :size="17" /><span>Live state</span><em>{{ store.workflow.flows.length }}</em></button>
    </nav>

    <aside v-if="store.demoLab.open" ref="panel" class="demo-lab-panel" tabindex="-1" aria-label="ClearDose demo laboratory" @keydown.esc="close">
      <header class="demo-lab-panel-header">
        <div><span>ClearDose lab</span><strong>{{ store.demoLab.tab === 'prompts' ? 'What can WebMCP do here?' : store.demoLab.tab === 'replay' ? 'Programmatic replay trace' : 'Live application truth' }}</strong></div>
        <button type="button" aria-label="Close demo laboratory" @click="close"><X :size="20" /></button>
      </header>

      <div v-if="store.demoLab.tab === 'prompts'" class="demo-lab-scenarios" data-agent-section="route-demo-scenarios">
        <div class="demo-lab-intro"><p>These prompts use the tools and UI available on this route. Each replay calls the same local handlers registered with WebMCP.</p><RouterLink to="/demo#explorer">Inspect every tool</RouterLink></div>
        <DemoScenarioCard v-for="scenario in scenarios" :key="scenario.id" :scenario="scenario" compact />
        <div v-if="!scenarios.length" class="demo-lab-empty"><FlaskConical :size="28" /><strong>No route-specific replay here.</strong><p>Open the Explorer for the complete tool catalog or inspect the current application state.</p></div>
      </div>
      <ProgrammaticReplayPanel v-else-if="store.demoLab.tab === 'replay'" />
      <WorkflowLiveViewer v-else compact />
    </aside>
  </div>
</template>
