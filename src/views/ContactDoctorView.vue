<script setup>
import { reactive, ref } from "vue";
import { Building2, Check, ClipboardCopy, FileText, Mail, Stethoscope } from "@lucide/vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { ClipboardService } from "../services/ui/ClipboardService";

const store = usePharmacyStore();
const clipboard = new ClipboardService();
const created = ref(false);
const copied = ref(false);
const copyError = ref("");
const localHandoff = ref(null);
const localSimulationCount = ref(0);
const announcement = ref("");
const form = reactive({
  patientName: store.currentCustomer ? `${store.currentCustomer.firstName} ${store.currentCustomer.lastName}` : "",
  patientEmail: store.currentCustomer?.email ?? "",
  providerName: "",
  providerPhone: "",
  medication: "",
});

function createNote() {
  if (!form.patientName || !form.patientEmail || !form.providerName || !form.medication) return;
  created.value = true;
  localHandoff.value = null;
  announcement.value = "Provider note preview created locally.";
}

async function copyDetails() {
  copyError.value = "";
  try {
    await clipboard.copy("CLEARDOSE PHARMACY SANDBOX. NCPDP 0000000. Fax 000-000-0000. Do not send a real prescription.");
    copied.value = true;
    announcement.value = "Sample pharmacy details copied.";
    window.setTimeout(() => { copied.value = false; }, 1800);
  } catch (error) {
    copied.value = false;
    copyError.value = error instanceof Error ? error.message : "Copy failed. Select the visible details and copy them manually.";
    announcement.value = copyError.value;
  }
}

function runLocalHandoffSimulation() {
  localSimulationCount.value += 1;
  localHandoff.value = {
    id: `mock_email_${String(localSimulationCount.value).padStart(3, "0")}`,
    recipient: `${form.providerName} in the local demo outbox`,
    subject: `Fictional prescription routing request for ${form.medication}`,
    status: "Completed inside this browser",
    externalDelivery: "Not attempted",
  };
  announcement.value = "Local handoff simulation completed. No email, fax, or external request was sent.";
}

function editNote() {
  created.value = false;
  localHandoff.value = null;
  announcement.value = "Provider note returned to editing.";
}
</script>

<template>
  <div class="doctor-page">
    <section class="doctor-hero">
      <div class="page-width doctor-hero-grid">
        <div><span class="eyebrow"><Stethoscope :size="17" /> Patient + provider handoff</span><h1>Explore a prescription handoff without sending one.</h1><p>Use this fictional flow to review patient details, provider instructions, and the next local action.</p></div>
        <div class="pharmacy-details-card" id="providers">
          <span class="generic-badge">Sample details only</span><h2>ClearDose Pharmacy Sandbox</h2>
          <dl><div><dt>Pharmacy name</dt><dd>ClearDose Pharmacy Sandbox</dd></div><div><dt>NCPDP ID</dt><dd>0000000</dd></div><div><dt>Fax</dt><dd>000-000-0000</dd></div><div><dt>Patient match</dt><dd>Email + date of birth</dd></div></dl>
          <button class="button button-dark button-wide" type="button" @click="copyDetails"><Check v-if="copied" :size="18" /><ClipboardCopy v-else :size="18" />{{ copied ? 'Copied demo details' : 'Copy sample pharmacy details' }}</button>
          <p v-if="copyError" class="inline-error" role="alert">{{ copyError }}</p>
          <small>Never send a real prescription to these fictional identifiers.</small>
        </div>
      </div>
    </section>

    <section class="page-width doctor-flow-grid" data-agent-section="provider-handoff">
      <div class="doctor-instructions">
        <span class="eyebrow">For patients</span><h2>Three ways to move forward.</h2>
        <article><span>1</span><div><h3>Ask your provider to e-prescribe</h3><p>Share the pharmacy name and sample NCPDP identifier shown above.</p></div></article>
        <article><span>2</span><div><h3>Match the fictional account</h3><p>The mock workflow uses the seeded account email and date of birth to demonstrate a match.</p></div></article>
        <article><span>3</span><div><h3>Review the mock status</h3><p>A seeded verification state unlocks the fictional package in the patient account.</p></div></article>
        <div class="provider-note"><Building2 :size="22" /><div><strong>For providers</strong><p>This prototype shows the receiving instructions and feedback states a production pharmacy handoff would need.</p></div></div>
      </div>

      <div class="doctor-form-card">
        <div v-if="!created"><span class="eyebrow">Create a sample request</span><h2>Prepare a provider note.</h2><p>This generates an on-screen preview only. It does not email, fax, or contact anyone.</p>
          <form class="stacked-form" autocomplete="on" toolname="cleardose_prepare_provider_note" tooldescription="Fill a fictional provider routing note for patient review. Do not submit or send it automatically." @submit.prevent="createNote">
            <div class="form-row"><label for="note-patient-name">Patient name<input id="note-patient-name" v-model="form.patientName" name="patient-name" autocomplete="section-patient name" toolparamdescription="Fictional patient full name" required placeholder="Jamie Rivera" /></label><label for="note-patient-email">Patient email<input id="note-patient-email" v-model="form.patientEmail" name="patient-email" type="email" inputmode="email" autocomplete="section-patient email" toolparamdescription="Fictional patient account email" required placeholder="demo@patient.test" /></label></div>
            <div class="form-row"><label for="note-provider-name">Provider name<input id="note-provider-name" v-model="form.providerName" name="provider-name" autocomplete="section-provider name" toolparamdescription="Fictional prescriber name" required placeholder="Dr. Sample" /></label><label for="note-provider-phone">Provider phone <small>Optional</small><input id="note-provider-phone" v-model="form.providerPhone" name="provider-phone" type="tel" inputmode="tel" autocomplete="section-provider tel" toolparamdescription="Fictional prescriber phone number" placeholder="410-555-0100" /></label></div>
            <label for="note-medication">Medication<input id="note-medication" v-model="form.medication" name="medication" autocomplete="off" toolparamdescription="Medication name and strength for the fictional routing note" required placeholder="Atorvastatin 20mg" /></label>
            <button class="button button-orange button-wide" type="submit"><FileText :size="18" /> Create note preview</button>
          </form>
        </div>
        <div v-else class="generated-note">
          <span class="generated-note-icon"><Check :size="28" /></span><span class="eyebrow">Preview ready</span><h2>Provider note created.</h2>
          <div class="note-paper"><span>Prescription routing request</span><h3>{{ form.medication }}</h3><p><strong>Patient:</strong> {{ form.patientName }}<br /><strong>Account email:</strong> {{ form.patientEmail }}<br /><strong>Provider:</strong> {{ form.providerName }} {{ form.providerPhone }}</p><hr /><p>Please send an electronic prescription to <strong>ClearDose Pharmacy Sandbox</strong>, sample NCPDP <strong>0000000</strong>.</p><small>CLEARDOSE SANDBOX. DO NOT SEND.</small></div>
          <div class="generated-note-actions"><button class="button button-dark" type="button" @click="runLocalHandoffSimulation"><Mail :size="18" /> Run local handoff simulation</button><button class="button button-ghost" type="button" @click="editNote">Edit details</button></div>
          <section v-if="localHandoff" class="local-handoff-status" role="status" aria-live="polite">
            <div><Check :size="20" /><strong>Local simulation complete</strong><code>{{ localHandoff.id }}</code></div>
            <dl><div><dt>Recipient</dt><dd>{{ localHandoff.recipient }}</dd></div><div><dt>Subject</dt><dd>{{ localHandoff.subject }}</dd></div><div><dt>Mock status</dt><dd>{{ localHandoff.status }}</dd></div><div><dt>External delivery</dt><dd>{{ localHandoff.externalDelivery }}</dd></div></dl>
            <p>No email, fax, prescription, or patient record left this browser.</p>
          </section>
        </div>
      </div>
    </section>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
