<script setup>
import { computed, reactive, ref, watch } from "vue";
import { Braces, Check, ChevronLeft, ChevronRight, Clipboard, Download, Eye, FileInput, Mic, Play, Plus, Save, Sparkles, Trash2, Unplug, Upload } from "@lucide/vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { ClipboardService } from "../services/ui/ClipboardService";

const store = usePharmacyStore();
const clipboard = new ClipboardService();
const fileInput = ref(null);
const stepIndex = ref(0);
const savedId = ref("");
const selectedId = ref("");
const savedFingerprint = ref("");
const sampleInput = ref('{\n  "drug_name": "Lisinopril",\n  "visit_goal": "Understand cost and monitoring questions"\n}');
const previewOutput = ref("");
const currentFlowId = ref("");
const workflowStateIndex = ref(0);
const announcement = ref("Capability Studio ready.");
const localError = ref("");
const voiceNotes = ref("");

const draft = reactive({ id: "", kind: "tool", name: "visit_question_sheet", title: "Generate a visit question sheet", description: "Create a local, reviewable question sheet from patient-provided goals.", examplePrompt: "I'm getting ready for an appointment about lisinopril. Make me a short question sheet focused on cost and monitoring, and leave it for me to review.", voiceGuide: "Say the kind of document or workflow you want, the person using it, and where human review must happen.", role: "patient", situation: "visit-preparation", scopeStep: "question-sheet", states: "ready, collecting_context, human_review, complete", body: "# Questions about <%= input.drug_name %>\n\nI want to discuss: <%= input.visit_goal %>\n\n- What should I understand before making any medication change?\n- Which cost, monitoring, and safety questions should we discuss?\n\nGenerated for human review. Not medical advice.", inputFields: [{ name: "drug_name", label: "Medication name", description: "Fictional medication name.", type: "string", required: true, example: "Lisinopril" }, { name: "visit_goal", label: "Visit goal", description: "What the patient wants to discuss.", type: "string", required: true, example: "Understand cost and monitoring questions" }] });

const steps = Object.freeze([
  { title: "Name the capability", guide: "Choose whether you are creating a document tool or a workflow. Give it a clear verb-first name and explain the human outcome." },
  { title: "Define inputs and scope", guide: "Add only the fields the capability needs, then name the role, situation, and current step that bound the machine." },
  { title: "Write the safe template", guide: "Use EJS-style escaped paths such as input dot drug name. Workflows also declare their deterministic states." },
  { title: "Preview, review, and load", guide: "Run sample data first. Save locally, then explicitly load the workflow or register the tool when the output looks right." },
]);
const templates = computed(() => store.capabilityTemplates.templates);
const selectedTemplate = computed(() => templates.value.find((item) => item.id === (savedId.value || selectedId.value)) ?? null);
const machineStates = computed(() => draft.kind === "tool" ? ["queued", "running", "complete", "error"] : draft.states.split(",").map((item) => item.trim()).filter(Boolean));

function templatePayload() { return { id: draft.id || undefined, kind: draft.kind, name: draft.name, title: draft.title, description: draft.description, examplePrompt: draft.examplePrompt, voiceGuide: draft.voiceGuide, scope: { role: draft.role, situation: draft.situation, step: draft.scopeStep }, states: machineStates.value, body: draft.body, inputFields: draft.inputFields.map((item) => ({ ...item })) }; }
function fingerprint() { return JSON.stringify(templatePayload()); }
const hasUnsavedChanges = computed(() => !selectedTemplate.value || fingerprint() !== savedFingerprint.value);
const canUseSavedDraft = computed(() => Boolean(selectedTemplate.value) && !hasUnsavedChanges.value);
const status = computed(() => {
  if (!selectedTemplate.value) return "unsaved";
  if (hasUnsavedChanges.value) return "edited";
  return store.capabilityTemplates.statuses[selectedTemplate.value.id] ?? (selectedTemplate.value.autoRegister ? "loaded" : "draft");
});
function parseSample() { try { return JSON.parse(sampleInput.value || "{}"); } catch { throw new TypeError("Preview data must be valid JSON."); } }
function setError(error) { localError.value = error instanceof Error ? error.message : String(error); announcement.value = localError.value; }

function addField() { draft.inputFields.push({ name: `field_${draft.inputFields.length + 1}`, label: "New field", description: "", type: "string", required: false, example: "" }); }
function removeField(index) { draft.inputFields.splice(index, 1); }
function applyVoice(target) { if (!voiceNotes.value) return; if (target === "description") draft.description = voiceNotes.value; else if (target === "guide") draft.voiceGuide = voiceNotes.value; else draft.body += `${draft.body ? "\n\n" : ""}${voiceNotes.value}`; announcement.value = `Dictated text applied to ${target}.`; }

function loadTemplate(template) {
  selectedId.value = template.id; savedId.value = template.id;
  Object.assign(draft, { id: template.id, kind: template.kind, name: template.name, title: template.title, description: template.description, examplePrompt: template.examplePrompt, voiceGuide: template.voiceGuide, role: template.scope.role, situation: template.scope.situation, scopeStep: template.scope.step, states: template.states.join(", "), body: template.body, inputFields: template.inputFields.map((item) => ({ ...item })) });
  savedFingerprint.value = fingerprint();
  sampleInput.value = JSON.stringify(Object.fromEntries(template.inputFields.map((field) => [field.name, field.type === "boolean" ? true : field.type === "number" || field.type === "integer" ? 1 : field.example || `Example ${field.label}`])), null, 2);
  previewOutput.value = ""; localError.value = ""; announcement.value = `${template.title} loaded into the editor.`;
}

watch(templates, (records) => {
  if (!savedId.value && !selectedId.value && records[0]) loadTemplate(records[0]);
}, { immediate: true });

function newTemplate() {
  savedId.value = ""; selectedId.value = ""; savedFingerprint.value = ""; currentFlowId.value = ""; workflowStateIndex.value = 0;
  Object.assign(draft, {
    id: "", kind: "tool", name: "new_review_tool", title: "New review tool",
    description: "Create a local artifact for human review.",
    examplePrompt: "Please create a short local review document from the details I provide, then leave it on screen for me to check.",
    voiceGuide: "Describe the document you want, add only the inputs it needs, and review a sample before loading the tool.",
    role: "patient", situation: "user-created", scopeStep: "review", states: "ready, human_review, complete",
    body: "# Review document\n\n<%= input.topic %>\n\nGenerated locally for human review.",
    inputFields: [{ name: "topic", label: "Topic", description: "The subject of the review document.", type: "string", required: true, example: "Questions for my next visit" }],
  });
  sampleInput.value = '{\n  "topic": "Questions for my next visit"\n}'; previewOutput.value = ""; localError.value = ""; stepIndex.value = 0; announcement.value = "New unregistered template started.";
}
function save() {
  localError.value = "";
  if (selectedTemplate.value?.autoRegister && hasUnsavedChanges.value) { setError(new Error("Unload the registered capability before saving edits to it.")); return null; }
  try { const template = store.saveCapabilityTemplate(templatePayload()); savedId.value = template.id; selectedId.value = template.id; draft.id = template.id; savedFingerprint.value = fingerprint(); announcement.value = `${template.title} saved locally as a draft.`; return template; } catch (error) { setError(error); return null; }
}
function preview() { localError.value = ""; try { previewOutput.value = store.previewCapabilityTemplate(templatePayload(), parseSample()); announcement.value = "Safe template preview rendered. Nothing was saved or registered."; return true; } catch (error) { setError(error); return false; } }
async function register() {
  const template = selectedTemplate.value;
  if (!template || hasUnsavedChanges.value) { setError(new Error("Save the current draft before loading or registering it.")); return; }
  try { await store.registerCapabilityTemplate(template.id); announcement.value = template.kind === "tool" ? `Registered cleardose_user_${template.name}.` : `${template.title} loaded into the workflow runtime.`; } catch (error) { setError(error); }
}
async function unregister() { if (!selectedTemplate.value) return; await store.unregisterCapabilityTemplate(selectedTemplate.value.id); announcement.value = "Capability unloaded. The saved draft remains local."; }
async function run() {
  const template = selectedTemplate.value;
  if (!template || hasUnsavedChanges.value) { setError(new Error("Save the current draft before running it through the local runtime.")); return; }
  try { const result = await store.runCapabilityTemplate(template.id, parseSample()); if (template.kind === "workflow") { currentFlowId.value = result.id; workflowStateIndex.value = 0; previewOutput.value = result.context.guide; } else previewOutput.value = result.structuredContent.content; announcement.value = `${template.title} ran locally. Review the output and live flow before sharing it.`; } catch (error) { setError(error); }
}
async function advance() { const template = selectedTemplate.value; if (!template || !currentFlowId.value || workflowStateIndex.value >= template.states.length - 1) return; workflowStateIndex.value += 1; await store.advanceCapabilityWorkflow(currentFlowId.value, template, workflowStateIndex.value); announcement.value = `Workflow advanced to ${template.states[workflowStateIndex.value]}.`; }
async function copyPrompt() { try { await clipboard.copy(draft.examplePrompt); announcement.value = "The visible example prompt was copied."; } catch (error) { setError(error); } }
function runPromptDemo() { stepIndex.value = 3; if (preview()) announcement.value = "The local preview ran without saving or registering the draft."; }
function inspectPromptCalls() { stepIndex.value = 3; store.openDemoLab("state"); announcement.value = "The local output and live workflow history are open for inspection."; }
async function copyTemplate() { try { await clipboard.copy(JSON.stringify(canUseSavedDraft.value ? selectedTemplate.value : templatePayload(), null, 2)); announcement.value = "Template JSON copied."; } catch (error) { setError(error); } }
function exportTemplate() { const record = canUseSavedDraft.value ? selectedTemplate.value : templatePayload(); const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `${record.name}.cleardose-template.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); announcement.value = "Template JSON downloaded without changing the saved draft."; }
async function importTemplate(event) { const file = event.target.files?.[0]; if (!file) return; try { const record = store.importCapabilityTemplate(JSON.parse(await file.text())); loadTemplate(record); announcement.value = `${record.title} imported as an unregistered draft.`; } catch (error) { setError(error); } finally { event.target.value = ""; } }
async function remove() { if (!selectedTemplate.value || !globalThis.confirm?.(`Delete ${selectedTemplate.value.title}?`)) return; await store.removeCapabilityTemplate(selectedTemplate.value.id); newTemplate(); announcement.value = "Local template deleted."; }
</script>

<template>
  <div class="studio-page">
    <header class="studio-topbar" data-agent-section="capability-studio"><div><span class="eyebrow"><Sparkles :size="16" /> Local Capability Studio</span><h1>Create a workflow or WebMCP tool.</h1><p>Describe it, template it, test it, then explicitly load it. No arbitrary JavaScript and no silent registration.</p></div><div class="studio-top-actions"><button class="button button-light" type="button" @click="fileInput.click()"><Upload :size="16" /> Import template</button><button class="button button-outline-light" type="button" @click="newTemplate"><Plus :size="16" /> New capability</button><input ref="fileInput" class="sr-only" type="file" accept="application/json,.json" aria-label="Import capability template JSON" @change="importTemplate" /></div></header>

    <main class="studio-shell">
      <aside class="studio-library" aria-label="Saved capability templates"><header><div><small>Local library</small><strong>{{ templates.length }} templates</strong></div><span>{{ store.webMcp.registered }}/{{ store.webMcp.available }} registered</span></header><button v-for="template in templates" :key="template.id" type="button" :class="{ selected: template.id === selectedTemplate?.id }" @click="loadTemplate(template)"><span><em>{{ template.kind }}</em><small>{{ store.capabilityTemplates.statuses[template.id] || (template.autoRegister ? 'loaded' : 'draft') }}</small></span><strong>{{ template.title }}</strong><code>{{ template.kind === 'tool' ? `cleardose_user_${template.name}` : `machine.dynamic.user-workflow-${template.name.replaceAll('_', '-')}.v1` }}</code></button></aside>

      <section class="studio-workspace">
        <CdCapabilityStudioVoiceGuide :steps="steps" :step-index="stepIndex" @transcript="voiceNotes = $event" />
        <div v-if="voiceNotes" class="voice-apply-bar"><Mic :size="16" /><span>{{ voiceNotes }}</span><button type="button" @click="applyVoice('description')">Use as description</button><button type="button" @click="applyVoice('guide')">Use as voice guide</button><button type="button" @click="applyVoice('body')">Append to template</button></div>

        <nav class="studio-steps" aria-label="Capability creation steps"><button v-for="(item, index) in steps" :key="item.title" type="button" :class="{ current: index === stepIndex, complete: index < stepIndex }" :aria-current="index === stepIndex ? 'step' : undefined" @click="stepIndex = index"><span>{{ index < stepIndex ? '✓' : index + 1 }}</span>{{ item.title }}</button></nav>

        <form class="studio-form" toolname="cleardose_compose_dynamic_capability_template" tooldescription="Populate a local workflow or safe EJS-style document-tool template for human review. Do not register it automatically." @submit.prevent="save">
          <section v-show="stepIndex === 0" class="studio-form-section"><header><span>01</span><div><h2>Name the capability</h2><p>Use one clear outcome. Tools generate a reviewable document; workflows define a deterministic path.</p></div></header><fieldset class="studio-kind-picker"><legend>Capability type</legend><label><input v-model="draft.kind" type="radio" name="kind" value="tool" /> <span><strong>WebMCP document tool</strong><small>Registers a local structured tool that renders a reviewable artifact.</small></span></label><label><input v-model="draft.kind" type="radio" name="kind" value="workflow" /> <span><strong>Workflow machine</strong><small>Loads a scoped deterministic machine into the live runtime.</small></span></label></fieldset><div class="studio-field-grid"><label>Snake-case name<input v-model="draft.name" name="name" autocomplete="off" pattern="[a-z][a-z0-9_]{2,59}" toolparamdescription="Stable snake_case capability name" /></label><label>Human title<input v-model="draft.title" name="title" autocomplete="off" toolparamdescription="Clear human-facing title" /></label></div><label>Description<textarea v-model="draft.description" name="description" rows="3" maxlength="500" toolparamdescription="Single-purpose outcome and safety boundary"></textarea></label><label>Human example prompt<textarea v-model="draft.examplePrompt" name="examplePrompt" rows="3" maxlength="500"></textarea><small>This exact prompt stays visible so someone can say it aloud, type it, or copy it.</small></label><aside class="studio-say-card"><span>Try saying this to your agent</span><blockquote>{{ draft.examplePrompt || 'Describe what you want this capability to help a person do.' }}</blockquote><div class="prompt-card-actions"><button type="button" @click="runPromptDemo"><Play :size="15" /> Run local demo</button><button type="button" @click="copyPrompt"><Clipboard :size="15" /> Copy this exact prompt</button><button type="button" @click="inspectPromptCalls"><Eye :size="15" /> Inspect calls</button></div></aside></section>

          <section v-show="stepIndex === 1" class="studio-form-section"><header><span>02</span><div><h2>Define inputs and scope</h2><p>Inputs become a closed JSON Schema. Runtime events retain the scope and field names, never unrestricted page content.</p></div></header><div class="studio-scope-grid"><label>Role<input v-model="draft.role" name="role" /></label><label>Situation<input v-model="draft.situation" name="situation" /></label><label>Step<input v-model="draft.scopeStep" name="scopeStep" /></label></div><div class="studio-fields-heading"><div><h3>Input fields</h3><p>Zero to twelve typed fields.</p></div><button class="button button-ghost" type="button" @click="addField"><Plus :size="15" /> Add field</button></div><div class="studio-field-list"><article v-for="(field, index) in draft.inputFields" :key="index"><div><label>Name<input v-model="field.name" :name="`field_${index}_name`" /></label><label>Label<input v-model="field.label" :name="`field_${index}_label`" /></label><label>Type<select v-model="field.type" :name="`field_${index}_type`"><option>string</option><option>number</option><option>integer</option><option>boolean</option></select></label><label class="studio-check"><input v-model="field.required" type="checkbox" :name="`field_${index}_required`" /> Required</label><button type="button" :aria-label="`Remove ${field.label || field.name}`" @click="removeField(index)"><Trash2 :size="16" /></button></div><label>Description<input v-model="field.description" :name="`field_${index}_description`" /></label><label>Example value<input v-model="field.example" :name="`field_${index}_example`" /></label></article><p v-if="!draft.inputFields.length" class="studio-empty">This capability has no inputs. Add one if the rendered output needs user context.</p></div></section>

          <section v-show="stepIndex === 2" class="studio-form-section"><header><span>03</span><div><h2>Write the safe template</h2><p>Interpolation is EJS-shaped but deliberately non-executable.</p></div></header><div class="template-reference"><strong>Allowed</strong><code>&lt;%= input.drug_name %&gt;</code><code>&lt;%= context.role %&gt;</code><code>&lt;% if input.notes %&gt;...&lt;% endif %&gt;</code><span>Raw tags, functions, imports, loops, and JavaScript are rejected.</span></div><label>Template body<textarea v-model="draft.body" name="body" rows="14" spellcheck="false" maxlength="12000" toolparamdescription="Safe EJS-style document or workflow guide template"></textarea></label><label v-if="draft.kind === 'workflow'">Machine states<input v-model="draft.states" name="states" autocomplete="off" /><small>Two to twelve unique snake_case states, comma separated.</small></label><div v-else class="fixed-machine"><Braces :size="18" /><div><strong>Tool execution machine</strong><code>queued → running → complete | error</code><small>The generated document separately remains in human review.</small></div></div><label>Voice guide transcript<textarea v-model="draft.voiceGuide" name="voiceGuide" rows="4" maxlength="1200"></textarea><small>Persistent text equivalent for optional spoken guidance.</small></label></section>

          <section v-show="stepIndex === 3" class="studio-form-section"><header><span>04</span><div><h2>Preview, review, and load</h2><p>Previewing does not save. Running uses the last saved draft. Loading or registering requires a separate action.</p></div></header><div class="studio-review-grid"><div><label>Sample JSON<textarea v-model="sampleInput" name="capability-sample-json" autocomplete="off" rows="12" spellcheck="false"></textarea></label><div class="studio-review-actions"><button class="button button-ghost" type="button" @click="preview"><Play :size="16" /> Preview only</button><button class="button button-dark" type="button" :disabled="!canUseSavedDraft" @click="run"><Sparkles :size="16" /> Run saved draft</button><button v-if="draft.kind === 'workflow' && currentFlowId" class="button button-primary" type="button" :disabled="workflowStateIndex >= machineStates.length - 1" @click="advance"><ChevronRight :size="16" /> Advance state</button></div></div><article class="studio-output"><header><span>Rendered output</span><small>{{ status }}</small></header><pre tabindex="0"><code>{{ previewOutput || 'Run the safe preview to see the rendered document or workflow guide here.' }}</code></pre></article></div><div class="studio-machine-preview"><span v-for="(state, index) in machineStates" :key="state" :class="{ current: index === workflowStateIndex && currentFlowId }"><small>{{ index + 1 }}</small>{{ state }}</span></div><div class="studio-load-panel"><div><strong>{{ draft.kind === 'tool' ? `cleardose_user_${draft.name}` : `machine.dynamic.user-workflow-${draft.name.replaceAll('_', '-')}.v1` }}</strong><p>Save current edits first. Registration persists locally and reloads on this device. Imported templates return to draft review.</p></div><button class="button button-primary" type="button" :disabled="!canUseSavedDraft" @click="register"><Check :size="16" /> {{ draft.kind === 'tool' ? 'Register saved tool' : 'Load saved workflow' }}</button><button v-if="selectedTemplate?.autoRegister" class="button button-ghost" type="button" @click="unregister"><Unplug :size="16" /> Unload</button></div></section>

          <p v-if="localError" class="studio-error" role="alert">{{ localError }}</p><footer class="studio-form-footer"><button class="button button-ghost" type="button" :disabled="stepIndex === 0" @click="stepIndex -= 1"><ChevronLeft :size="16" /> Previous</button><span>Step {{ stepIndex + 1 }} of {{ steps.length }}</span><button v-if="stepIndex < steps.length - 1" class="button button-dark" type="button" @click="stepIndex += 1">Next <ChevronRight :size="16" /></button><button v-else class="button button-dark" type="submit"><Save :size="16" /> Save local draft</button></footer>
        </form>

        <section class="studio-runtime" data-agent-section="studio-runtime"><CdWorkflowLiveViewer compact :max-events="16" /></section>
      </section>

      <aside class="studio-inspector"><header><small>Template contract</small><strong>{{ selectedTemplate?.title || draft.title }}</strong><span :class="status">{{ status }}</span></header><dl><dt>Kind</dt><dd>{{ draft.kind }}</dd><dt>Capability</dt><dd><code>{{ draft.kind === 'tool' ? `cleardose.user-generated.${draft.name}` : `machine.dynamic.user-workflow-${draft.name.replaceAll('_', '-')}.v1` }}</code></dd><dt>Scope</dt><dd>{{ draft.role }} / {{ draft.situation }} / {{ draft.scopeStep }}</dd><dt>Inputs</dt><dd>{{ draft.inputFields.length }} closed-schema fields</dd></dl><div class="studio-inspector-actions"><button type="button" @click="copyTemplate"><Clipboard :size="15" /> Copy JSON</button><button type="button" @click="exportTemplate"><Download :size="15" /> Download</button><button type="button" @click="fileInput.click()"><FileInput :size="15" /> Import</button><button v-if="selectedTemplate" class="danger" type="button" @click="remove"><Trash2 :size="15" /> Delete</button></div><div class="studio-boundary"><Braces :size="18" /><p><strong>Template, not code.</strong> ClearDose resolves approved paths and bounded conditionals. It never evaluates submitted JavaScript.</p></div></aside>
    </main>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
