<script setup>
import { ref } from "vue";
import { Clipboard, FileWarning, Sparkles } from "@lucide/vue";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { ClipboardService } from "../services/ui/ClipboardService";

const props = defineProps({ ...agentReadyProps, drugId: { type: String, default: "med_lisinopril" } });
useAgentReadyComponent(props, { name: "prescription_recovery_panel", defaultAdapter: Object.freeze({}) });
const store = usePharmacyStore();
const preferredPath = ref("undecided");
const questions = ref("What information does my prescriber need?\nHow will I know when the prescription is ready for review?");
const result = ref(null);
const editablePrompt = ref("");
const announcement = ref("Prescription recovery form ready.");
const clipboard = new ClipboardService();

async function prepare() {
  result.value = await store.preparePrescriptionFollowUp({ drugId: props.drugId, preferredPath: preferredPath.value, questions: questions.value.split("\n").map((item) => item.trim()).filter(Boolean) });
  editablePrompt.value = result.value.editablePrompt;
  announcement.value = "Editable follow-up prepared. No prescriber was contacted.";
}
async function copy() { try { await clipboard.copy(editablePrompt.value); announcement.value = "Reviewed follow-up copied."; } catch (error) { announcement.value = error.message; } }
</script>
<template>
  <section class="recovery-panel" data-agent-section="prescription-recovery" aria-labelledby="recovery-panel-title">
    <header><span class="recovery-icon"><FileWarning :size="21" /></span><div><span class="eyebrow">Human-in-the-loop recovery</span><h2 id="recovery-panel-title">Prescription required</h2><p>Your prescriber must send a valid prescription before fulfillment.</p></div></header>
    <div class="recovery-grid">
      <form class="recovery-form" autocomplete="off" @submit.prevent="prepare"><label>Administrative path<select v-model="preferredPath" name="recovery-path"><option value="undecided">Help me choose</option><option value="prescriber_send">Prescriber sends new prescription</option><option value="transfer">Transfer an existing prescription</option><option value="on_file">Verify prescription on file</option></select></label><label>Questions to preserve<textarea v-model="questions" name="recovery-questions" autocomplete="off" rows="4"></textarea></label><button class="button button-dark" type="submit"><Sparkles :size="16" /> Prepare editable handoff</button></form>
      <div class="recovery-log"><template v-if="result"><ol><li v-for="step in result.steps" :key="step">{{ step }}</li></ol><label>Editable instruction to my agent<textarea v-model="editablePrompt" name="recovery-agent-instruction" autocomplete="off" rows="10"></textarea></label><div><code>{{ result.recommendedTool }}</code><button class="button button-primary" type="button" @click="copy"><Clipboard :size="16" /> Copy reviewed prompt</button></div></template><p v-else>Choose a path and prepare the handoff. The generated instruction stays editable and local until you copy it.</p></div>
    </div><p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </section>
</template>
