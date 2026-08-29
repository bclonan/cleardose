<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { Bot, Check, ChevronLeft, ChevronRight, CircleAlert, Pause, Play, Volume2, X } from "@lucide/vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { agentControlCenterAdapter } from "../presentation/adapters/componentAdapters";
import { VoiceGuidanceService } from "../services/accessibility/VoiceGuidanceService";
import { getVoiceJourney } from "../services/accessibility/voiceJourneys";

const props = defineProps(agentReadyProps);
const route = useRoute();
const store = usePharmacyStore();
const { adapter } = useAgentReadyComponent(props, { name: "agent_control_center", defaultAdapter: agentControlCenterAdapter });
const voice = new VoiceGuidanceService();
const dialog = ref(null);
const opener = ref(null);
const voiceEnabled = ref(readPreference());
const speaking = ref(false);
const stepIndex = ref(0);
const announcement = ref("Agent controls ready.");
const journey = computed(() => getVoiceJourney(route.name));
const currentStep = computed(() => journey.value.steps[stepIndex.value] ?? journey.value.intro);
const ctaLabel = computed(() => adapter.value.ctaLabel(store.webMcp.available));

function readPreference() {
  try { return globalThis.localStorage?.getItem("cleardose-voice-guidance") === "on"; }
  catch { return false; }
}

function savePreference() {
  try { globalThis.localStorage?.setItem("cleardose-voice-guidance", voiceEnabled.value ? "on" : "off"); }
  catch { /* Preference persistence is optional. */ }
}

function openPanel() {
  opener.value = globalThis.document?.activeElement;
  dialog.value?.showModal();
  announcement.value = `${store.webMcp.available} ClearDose agent tools are available.`;
}

function closePanel() {
  dialog.value?.close();
  opener.value?.focus?.();
}

function speak(text) {
  const started = voice.speak(text, {
    onEnd: () => { speaking.value = false; announcement.value = "Voice guidance finished."; },
    onError: () => { speaking.value = false; announcement.value = "Voice guidance could not be played."; },
  });
  speaking.value = started;
  announcement.value = started ? `Speaking: ${text}` : "Voice guidance is not supported in this browser.";
}

function toggleVoice() {
  voiceEnabled.value = !voiceEnabled.value;
  savePreference();
  if (voiceEnabled.value) speak(`${journey.value.title}. ${journey.value.intro}`);
  else {
    voice.cancel();
    speaking.value = false;
    announcement.value = "Voice guidance off. The transcript remains available.";
  }
}

function readStep() { speak(`${journey.value.title}. Step ${stepIndex.value + 1}. ${currentStep.value}`); }
function stopSpeaking() { voice.cancel(); speaking.value = false; announcement.value = "Voice guidance paused."; }
function previousStep() { stepIndex.value = Math.max(0, stepIndex.value - 1); if (voiceEnabled.value) readStep(); }
function nextStep() { stepIndex.value = Math.min(journey.value.steps.length - 1, stepIndex.value + 1); if (voiceEnabled.value) readStep(); }

watch(() => route.name, () => {
  stepIndex.value = 0;
  if (voiceEnabled.value) speak(`${journey.value.title}. ${journey.value.intro}`);
});

onBeforeUnmount(() => voice.cancel());
</script>

<template>
  <div class="agent-control-entry">
    <button ref="opener" class="agent-tools-cta" type="button" data-agent-section="agent-tools-control" aria-haspopup="dialog" @click="openPanel">
      <Bot :size="18" aria-hidden="true" />
      <span>{{ ctaLabel }}</span>
    </button>

    <dialog ref="dialog" class="agent-control-dialog" aria-labelledby="agent-control-title" @close="voice.cancel()">
      <div class="agent-dialog-shell">
        <header class="agent-dialog-header">
          <div>
            <span class="eyebrow"><Bot :size="16" aria-hidden="true" /> Human + agent controls</span>
            <h2 id="agent-control-title">ClearDose agent center</h2>
            <p>Inspect structured tools and follow the same journey with optional browser voice guidance.</p>
          </div>
          <button class="dialog-close" type="button" aria-label="Close agent center" @click="closePanel"><X :size="22" /></button>
        </header>

        <div class="agent-dialog-grid">
          <section class="voice-guide-card" aria-labelledby="voice-guide-title">
            <div class="agent-card-heading">
              <span class="agent-card-icon"><Volume2 :size="21" /></span>
              <div><h3 id="voice-guide-title">Voice-guided journey</h3><p>Audio is optional. Every spoken instruction is also shown below.</p></div>
            </div>
            <button
              class="voice-toggle"
              type="button"
              role="switch"
              :aria-checked="voiceEnabled"
              :disabled="!voice.isSupported()"
              @click="toggleVoice"
            >
              <span aria-hidden="true"><i></i></span>
              {{ voiceEnabled ? 'Voice guidance on' : 'Voice guidance off' }}
            </button>
            <div v-if="!voice.isSupported()" class="agent-notice"><CircleAlert :size="18" /> Voice playback is unavailable, but the full transcript is provided.</div>
            <div class="voice-transcript" tabindex="0">
              <span>Current page</span>
              <h4>{{ journey.title }}</h4>
              <p>{{ journey.intro }}</p>
              <ol>
                <li v-for="(step, index) in journey.steps" :key="step" :class="{ current: index === stepIndex }">
                  <span>{{ index + 1 }}</span>{{ step }}
                </li>
              </ol>
            </div>
            <div class="voice-controls" aria-label="Voice journey controls">
              <button type="button" :disabled="stepIndex === 0" aria-label="Previous guidance step" @click="previousStep"><ChevronLeft :size="18" /></button>
              <button v-if="speaking" class="voice-primary" type="button" @click="stopSpeaking"><Pause :size="18" /> Pause</button>
              <button v-else class="voice-primary" type="button" @click="readStep"><Play :size="18" /> Read step</button>
              <button type="button" :disabled="stepIndex === journey.steps.length - 1" aria-label="Next guidance step" @click="nextStep"><ChevronRight :size="18" /></button>
            </div>
          </section>

          <section class="tool-inspector-card" aria-labelledby="tool-inspector-title">
            <div class="agent-card-heading">
              <span class="agent-card-icon"><Bot :size="21" /></span>
              <div><h3 id="tool-inspector-title">WebMCP tool inspector</h3><p>{{ store.webMcp.registered }} registered · {{ store.webMcp.available }} available</p></div>
            </div>
            <div class="tool-support-state" :class="store.webMcp.status">
              <Check v-if="store.webMcp.status === 'ready'" :size="17" />
              <CircleAlert v-else :size="17" />
              {{ store.webMcp.supported ? 'This browser exposes document.modelContext.' : 'Progressive fallback active; the human flow remains fully functional.' }}
            </div>
            <div class="agent-tool-list">
              <details v-for="tool in store.webMcp.tools" :key="tool.name">
                <summary><span><strong>{{ tool.title }}</strong><code>{{ tool.name }}</code></span><em>{{ adapter.toolKind(tool) }}</em></summary>
                <p>{{ tool.description }}</p>
                <div v-if="Object.keys(tool.inputSchema?.properties ?? {}).length" class="tool-parameters">
                  <span v-for="(schema, name) in tool.inputSchema.properties" :key="name"><code>{{ name }}</code> {{ schema.description }}</span>
                </div>
              </details>
            </div>
            <RouterLink class="button button-dark button-wide" to="/demo" @click="closePanel">Open the hackathon demo</RouterLink>
          </section>
        </div>
        <p class="sr-only" aria-live="polite">{{ announcement }}</p>
      </div>
    </dialog>
  </div>
</template>
