<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import { Mic, Pause, Play, Volume2 } from "@lucide/vue";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { VoiceGuidanceService } from "../services/accessibility/VoiceGuidanceService";

const props = defineProps({ ...agentReadyProps, steps: { type: Array, required: true }, stepIndex: { type: Number, default: 0 } });
const emit = defineEmits(["transcript"]);
useAgentReadyComponent(props, { name: "capability_studio_voice_guide", defaultAdapter: Object.freeze({}) });
const voice = new VoiceGuidanceService();
const speaking = ref(false);
const listening = ref(false);
const transcript = ref("");
const error = ref("");
const current = computed(() => props.steps[props.stepIndex] ?? props.steps[0]);
const Recognition = globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition ?? null;

function speak() {
  speaking.value = voice.speak(`${current.value.title}. ${current.value.guide}`, { onEnd: () => { speaking.value = false; }, onError: () => { speaking.value = false; error.value = "Voice playback was unavailable."; } });
}
function stop() { voice.cancel(); speaking.value = false; }
function dictate() {
  if (!Recognition || listening.value) return;
  const recognition = new Recognition(); recognition.lang = "en-US"; recognition.interimResults = false;
  listening.value = true; error.value = "";
  recognition.addEventListener("result", (event) => { transcript.value = event.results?.[0]?.[0]?.transcript ?? ""; emit("transcript", transcript.value); });
  recognition.addEventListener("end", () => { listening.value = false; });
  recognition.addEventListener("error", () => { listening.value = false; error.value = "Dictation was unavailable. Type into the fields instead."; });
  recognition.start();
}
onBeforeUnmount(() => voice.cancel());
</script>

<template>
  <section class="studio-voice-guide" aria-labelledby="studio-voice-title">
    <header><span><Volume2 :size="18" /></span><div><small>Optional voice guide</small><h2 id="studio-voice-title">{{ current.title }}</h2><p>{{ current.guide }}</p></div></header>
    <div class="studio-voice-controls"><button v-if="speaking" type="button" @click="stop"><Pause :size="16" /> Stop</button><button v-else type="button" :disabled="!voice.isSupported()" @click="speak"><Play :size="16" /> Read this step</button><button type="button" :disabled="!Recognition || listening" @click="dictate"><Mic :size="16" /> {{ listening ? 'Listening...' : 'Dictate an idea' }}</button></div>
    <blockquote v-if="transcript"><strong>You said</strong><span>{{ transcript }}</span></blockquote>
    <p v-if="error" class="studio-inline-error" role="status">{{ error }}</p>
    <ol class="studio-voice-transcript"><li v-for="(item, index) in steps" :key="item.title" :class="{ current: index === stepIndex }"><span>{{ index + 1 }}</span><div><strong>{{ item.title }}</strong><small>{{ item.guide }}</small></div></li></ol>
  </section>
</template>
