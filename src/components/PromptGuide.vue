<script setup>
import { computed, nextTick, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { BookOpen, Clipboard, Eye, Mic, Play, Search, Volume2, X } from "@lucide/vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { promptGuideAdapter } from "../presentation/adapters/componentAdapters";
import { ClipboardService } from "../services/ui/ClipboardService";
import { VoiceGuidanceService } from "../services/accessibility/VoiceGuidanceService";

const props = defineProps({ ...agentReadyProps });
const store = usePharmacyStore();
const route = useRoute();
const router = useRouter();
const { adapter } = useAgentReadyComponent(props, { name: "prompt_guide", defaultAdapter: promptGuideAdapter });
const dialog = ref(null);
const searchInput = ref(null);
const query = ref("");
const listening = ref(false);
const announcement = ref("Prompt guide ready.");
const clipboard = new ClipboardService();
const voice = new VoiceGuidanceService();

const tools = computed(() => {
  const registered = new Map(store.webMcp.tools.map((tool) => [tool.name.replace(/^cleardose_/, ""), tool]));
  const staticTools = store.capabilityManifest.map((capability) => {
    const runtime = registered.get(capability.toolName) ?? {};
    return { ...runtime, ...capability, name: capability.qualifiedName, title: runtime.title ?? capability.toolName.replaceAll("_", " "), description: runtime.description ?? `Visible declarative ClearDose form contract for ${capability.route}.`, prompt: capability.examplePrompt, annotations: runtime.annotations ?? { readOnlyHint: true } };
  });
  const staticNames = new Set(staticTools.map((tool) => tool.name));
  const userTools = store.webMcp.tools.filter((tool) => !staticNames.has(tool.name)).map((tool) => ({ ...tool, id: tool.capabilityId || tool.name, toolName: tool.name, qualifiedName: tool.name, prompt: tool.examplePrompt || `I'd like help with ${tool.title.toLowerCase()}. Run it locally and show me the result before I share anything.`, category: tool.category || "user-generated", interactionModel: tool.interactionModel || "imperative", machine: tool.machine || { id: "machine.dynamic.user-generated.v1" } }));
  return [...staticTools, ...userTools];
});
const filteredTools = computed(() => {
  const term = query.value.trim().toLowerCase();
  if (!term) return tools.value;
  return tools.value.filter((tool) => `${tool.name} ${tool.title} ${tool.description} ${tool.prompt}`.toLowerCase().includes(term));
});
const groupedTools = computed(() => store.capabilityCategoryManifest.map((category) => ({ ...category, tools: filteredTools.value.filter((tool) => tool.category === category.id) })).filter((group) => group.tools.length));
const voiceSupported = computed(() => Boolean(adapter.value.recognitionConstructor()));

function openGuide() {
  dialog.value?.showModal();
  nextTick(() => searchInput.value?.focus());
}

function startVoiceSearch() {
  const Recognition = adapter.value.recognitionConstructor();
  if (!Recognition || listening.value) return;
  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  listening.value = true;
  recognition.addEventListener("result", (event) => {
    query.value = event.results?.[0]?.[0]?.transcript ?? "";
    announcement.value = `Voice search captured: ${query.value}`;
  });
  recognition.addEventListener("end", () => { listening.value = false; });
  recognition.addEventListener("error", () => { listening.value = false; announcement.value = "Voice search was unavailable. Type a tool or task instead."; });
  recognition.start();
}

async function copyPrompt(prompt) {
  try { await clipboard.copy(prompt); announcement.value = "The visible example prompt was copied."; }
  catch (error) { announcement.value = error.message; }
}
function readPrompt(prompt) { const started = voice.speak(prompt); announcement.value = started ? "Reading the visible example prompt." : "Voice playback is unavailable. The full prompt remains visible."; }

function scenarioForTool(tool) {
  return store.demoScenarioCatalog.find((scenario) => tool.scenarioIds?.includes(scenario.id) || scenario.capabilityIds.includes(tool.id));
}

async function runToolDemo(tool) {
  const scenario = scenarioForTool(tool);
  if (scenario) {
    const replayRoute = scenario.routes.includes(route.path) ? route.path : scenario.routes.includes("/demo") ? "/demo" : scenario.routes[0];
    dialog.value?.close();
    if (replayRoute && route.path !== replayRoute) {
      await router.push(replayRoute);
      await nextTick();
      await nextTick();
    }
    await store.runReplayScenario(scenario.id, { route: replayRoute, resetSeed: true });
    announcement.value = "Programmatic replay completed. Open Inspect calls for the trace.";
    return;
  }
  const targetRoute = tool.routes?.find((item) => item.startsWith("/"));
  if (targetRoute && route.path !== targetRoute) {
    dialog.value?.close();
    await router.push(targetRoute);
    await nextTick();
    await nextTick();
  }
  dialog.value?.close();
  const result = await store.runCapabilityReplay(tool, { route: route.path, resetSeed: true });
  announcement.value = result.status === "complete"
    ? "Programmatic replay completed. Open Inspect calls for the trace."
    : "The programmatic replay stopped with a structured result. Inspect the call for recovery details.";
}

async function inspectToolCalls(tool) {
  const scenario = scenarioForTool(tool);
  if (scenario) {
    store.openDemoLab("replay", { scenarioId: scenario.id });
    dialog.value?.close();
    return;
  }
  const replayScenarioId = store.replayScenarioIdForCapability(tool);
  if (store.replay.scenarioId === replayScenarioId && store.demoScenario(replayScenarioId)) {
    store.openDemoLab("replay", { scenarioId: replayScenarioId });
    dialog.value?.close();
    return;
  }
  store.demoLab.selectedToolName = tool.name;
  dialog.value?.close();
  await router.push("/demo#explorer");
}
</script>

<template>
  <div class="prompt-guide">
    <button class="prompt-guide-cta" type="button" aria-haspopup="dialog" @click="openGuide"><BookOpen :size="19" /><span>Prompt guide</span></button>
    <dialog ref="dialog" class="prompt-guide-dialog" aria-labelledby="prompt-guide-title">
      <div class="prompt-guide-shell">
        <header><div><span class="eyebrow"><BookOpen :size="16" /> Agent tool docs</span><h2 id="prompt-guide-title">Ask ClearDose with confidence.</h2><p>Search every registered tool, copy an example, or speak a task to filter the guide.</p></div><button type="button" aria-label="Close prompt guide" @click="dialog.close()"><X :size="22" /></button></header>
        <div class="prompt-guide-search"><Search :size="18" /><label class="sr-only" for="prompt-guide-query">Search tools and example prompts</label><input id="prompt-guide-query" ref="searchInput" v-model="query" name="prompt-guide-query" type="search" autocomplete="off" placeholder="Try question card, price, or workflow" /><button type="button" :disabled="!voiceSupported || listening" :aria-pressed="listening" @click="startVoiceSearch"><Mic :size="18" />{{ listening ? 'Listening...' : 'Voice search' }}</button></div>
        <p v-if="!voiceSupported" class="prompt-voice-note">Voice search is not supported in this browser. All examples remain keyboard searchable.</p>
        <div class="prompt-tool-list" aria-live="polite">
          <section v-for="group in groupedTools" :key="group.id" class="prompt-group"><header><h3>{{ group.label }}</h3><p>{{ group.description }}</p></header><article v-for="tool in group.tools" :key="tool.name"><div><code>{{ tool.name }}</code><span>{{ tool.interactionModel }} · {{ tool.annotations?.readOnlyHint ? 'read only' : 'local change' }}</span></div><h3>{{ tool.title }}</h3><p>{{ tool.description }}</p><small class="prompt-machine-id">{{ tool.machine.id }}</small><div class="prompt-human-example"><strong>Try saying or pasting</strong><blockquote>{{ tool.prompt }}</blockquote></div><div class="prompt-card-actions"><button type="button" @click="runToolDemo(tool)"><Play :size="15" /> Programmatic replay</button><button type="button" @click="copyPrompt(tool.prompt)"><Clipboard :size="15" /> Copy this exact prompt</button><button type="button" @click="inspectToolCalls(tool)"><Eye :size="15" /> Inspect calls</button><button type="button" @click="readPrompt(tool.prompt)"><Volume2 :size="15" /> Read aloud</button></div></article></section>
          <p v-if="!filteredTools.length">No tools match that search.</p>
        </div>
        <footer><strong>Demo safety boundary</strong><span>Use fictional data only. ClearDose does not provide clinical advice, process payment, place real orders, or silently write an external agent memory.</span><RouterLink to="/shortcuts" @click="dialog.close()">Open prompt chains →</RouterLink><RouterLink to="/studio" @click="dialog.close()">Create a capability →</RouterLink></footer>
      </div>
    </dialog>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
