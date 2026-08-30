<script setup>
import { computed, ref } from "vue";
import { Check, Clipboard, Printer, ShieldCheck } from "@lucide/vue";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { doctorQuestionCardAdapter } from "../presentation/adapters/componentAdapters";

const props = defineProps({
  ...agentReadyProps,
  card: { type: Object, required: true },
  allowReview: { type: Boolean, default: true },
});
const emit = defineEmits(["review"]);
const { adapter } = useAgentReadyComponent(props, { name: "doctor_question_card", defaultAdapter: doctorQuestionCardAdapter });
const copied = ref(false);
const copyError = ref("");
const titleId = computed(() => `doctor-card-${String(props.card.id).replace(/[^a-z0-9_-]/gi, "-")}`);
const plainText = computed(() => [
  props.card.title,
  props.card.summary,
  "Questions:",
  ...props.card.questions.map((question, index) => `${index + 1}. ${question}`),
  "Fictional price facts:",
  ...(props.card.priceFacts ?? []).map((fact) => `- ${fact}`),
  "Fictional availability facts:",
  ...(props.card.availabilityFacts ?? []).map((fact) => `- ${fact}`),
  props.card.clinicalFacts?.label ?? "",
  ...(props.card.clinicalFacts?.commonSideEffects ?? []).map((fact) => `- Common side effect in sample: ${fact}`),
  ...(props.card.clinicalFacts?.importantWarnings ?? []).map((fact) => `- Warning in sample: ${fact}`),
  props.card.disclaimer,
].join("\n"));

async function copyCard() {
  copyError.value = "";
  try {
    await adapter.value.copy(plainText.value);
    copied.value = true;
    globalThis.setTimeout?.(() => { copied.value = false; }, 1800);
  } catch (error) {
    copyError.value = error instanceof Error ? error.message : "Copy failed. Select the card text and copy it manually.";
  }
}
</script>

<template>
  <article class="doctor-question-card" :data-status="card.status" data-agent-section="question-card" :aria-labelledby="titleId">
    <header><div><span>Patient → clinician discussion card</span><h2 :id="titleId">{{ card.title }}</h2></div><span class="card-status"><Check v-if="card.status === 'reviewed'" :size="15" />{{ card.status === 'reviewed' ? 'Patient reviewed' : 'Draft for review' }}</span></header>
    <p>{{ card.summary }}</p>
    <section><h3>Questions I may want to ask</h3><ol><li v-for="question in card.questions" :key="question">{{ question }}</li></ol></section>
    <section><h3>ClearDose fictional price facts</h3><ul><li v-for="fact in (card.priceFacts ?? [])" :key="fact">{{ fact }}</li></ul></section>
    <section v-if="card.availabilityFacts?.length"><h3>Seeded provider availability</h3><ul><li v-for="fact in card.availabilityFacts" :key="fact">{{ fact }}</li></ul></section>
    <section v-if="card.clinicalFacts" class="doctor-clinical-sample"><span>{{ card.clinicalFacts.label }}</span><h3>{{ card.clinicalFacts.activeIngredient }} · {{ card.clinicalFacts.manufacturer }}</h3><div><div><strong>Common side effects in sample</strong><ul><li v-for="fact in card.clinicalFacts.commonSideEffects" :key="fact">{{ fact }}</li></ul></div><div><strong>Important warnings in sample</strong><ul><li v-for="fact in card.clinicalFacts.importantWarnings" :key="fact">{{ fact }}</li></ul></div></div><p>Coverage: {{ card.clinicalFacts.coverage }}. A licensed clinician or pharmacist must verify these facts.</p></section>
    <div class="doctor-card-boundary"><ShieldCheck :size="18" /><span>{{ card.disclaimer }}</span></div>
    <footer class="doctor-card-actions">
      <button class="button button-dark" type="button" @click="adapter.print()"><Printer :size="17" /> Print card</button>
      <button class="button button-ghost" type="button" @click="copyCard"><Clipboard :size="17" /> {{ copied ? 'Copied' : 'Copy text' }}</button>
      <button v-if="allowReview && card.status !== 'reviewed'" class="button button-orange" type="button" @click="emit('review', card.id)"><Check :size="17" /> Mark reviewed</button>
    </footer>
    <p v-if="copyError" class="inline-error" role="alert">{{ copyError }}</p>
  </article>
</template>
