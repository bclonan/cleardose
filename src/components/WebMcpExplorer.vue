<script setup>
import { computed, inject, nextTick, onUnmounted, ref, useId, watch } from "vue";
import { useRoute } from "vue-router";
import { AlertTriangle, Braces, Check, ChevronRight, CircleDot, Clipboard, Clock3, Eye, Mic2, Play, RotateCcw, Search, ShieldCheck, TerminalSquare, WandSparkles } from "@lucide/vue";
import { clearDoseHighlightServiceKey } from "../app/injectionKeys";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { sanitizeExplorerInvocationValue, sanitizeExplorerJsonText, sanitizeExplorerValue } from "../stores/pharmacyStore";
import { ClipboardService } from "../services/ui/ClipboardService";
import DemoScenarioCard from "./DemoScenarioCard.vue";

const props = defineProps({ ...agentReadyProps });
useAgentReadyComponent(props, { name: "webmcp_explorer", defaultAdapter: Object.freeze({}) });
const store = usePharmacyStore();
const route = useRoute();
const highlightService = inject(clearDoseHighlightServiceKey, null);
const clipboard = new ClipboardService();
const componentId = useId();
const query = ref("");
const kind = ref("all");
const selectedName = ref("cleardose_search_drug_index");
const requestText = ref("{}");
const requestError = ref("");
const receipt = ref(null);
const promptMode = ref("human");
const promptModes = ["human", "voice", "advanced"];
const promptPanelId = `${componentId}-tool-prompt-panel`;
const promptTitleId = `${componentId}-tool-prompt-title`;
const announcement = ref("WebMCP Explorer ready.");
let consoleMounted = true;
onUnmounted(() => { consoleMounted = false; });

const runtimeTools = computed(() => new Map(store.webMcp.tools.map((tool) => [tool.name, tool])));
const entries = computed(() => {
  const staticNames = new Set(store.capabilityManifest.map((item) => item.qualifiedName));
  const builtIns = store.capabilityManifest.map((capability) => {
    const runtime = runtimeTools.value.get(capability.qualifiedName);
    const present = capability.interactionModel === "declarative"
      ? Boolean(globalThis.document?.querySelector?.(`[toolname="${capability.qualifiedName}"]`))
      : true;
    return {
      ...capability,
      ...runtime,
      name: capability.qualifiedName,
      inputSchema: runtime?.inputSchema ?? capability.inputSchema ?? { type: "object", properties: {}, additionalProperties: false },
      outputSchema: runtime?.outputSchema ?? capability.outputSchema,
      exampleRequests: (runtime?.exampleRequests ?? capability.exampleRequests ?? [{}]).map((input) => sanitizeExplorerInvocationValue(input)),
      exampleResponse: sanitizeExplorerValue(runtime?.exampleResponse ?? capability.exampleResponse ?? { ok: true }),
      browserStatus: capability.interactionModel === "declarative" ? (present ? "visible" : "not-on-route") : (runtime?.status ?? "initializing"),
      locallyInvokable: capability.interactionModel === "declarative" ? present : Boolean(runtime?.locallyInvokable),
      currentRouteAvailable: capability.routes.includes("*") || capability.routes.includes(route.path) || (capability.interactionModel === "declarative" && present),
    };
  });
  const userTools = store.webMcp.tools.filter((tool) => !staticNames.has(tool.name)).map((tool) => ({
    ...tool, id: tool.capabilityId || tool.name, toolName: tool.name, qualifiedName: tool.name, namespace: tool.namespace ?? tool.name.split("_")[0],
    routes: tool.routes ?? ["*"], permissions: tool.permissions ?? [tool.annotations?.readOnlyHint ? "local-read" : "local-state-write"],
    outputSchema: tool.outputSchema ?? { type: "object", maxProperties: 24, properties: {}, additionalProperties: true }, exampleRequests: (tool.exampleRequests ?? [{}]).map((input) => sanitizeExplorerInvocationValue(input)),
    exampleResponse: sanitizeExplorerValue(tool.exampleResponse ?? { ok: true }), deterministicErrors: tool.deterministicErrors ?? [], relatedTools: tool.relatedTools ?? [], scenarioIds: tool.scenarioIds ?? [],
    browserStatus: tool.status, locallyInvokable: tool.locallyInvokable, currentRouteAvailable: true,
  }));
  return [...builtIns, ...userTools];
});

const filtered = computed(() => {
  const term = query.value.trim().toLowerCase();
  return entries.value.filter((entry) => (kind.value === "all" || entry.interactionModel === kind.value)
    && (!term || `${entry.name} ${entry.title} ${entry.description} ${entry.category}`.toLowerCase().includes(term)));
});
const selected = computed(() => entries.value.find((entry) => entry.name === selectedName.value) ?? filtered.value[0] ?? entries.value[0]);
const linkedScenarios = computed(() => {
  if (!selected.value) return [];
  const catalogMatches = store.demoScenarioCatalog.filter((scenario) => selected.value.scenarioIds?.includes(scenario.id) || scenario.capabilityIds.includes(selected.value.id));
  return catalogMatches.length ? catalogMatches : [store.capabilityReplayScenario(selected.value, { route: route.path })];
});
const selectedPrompt = computed(() => ({ human: selected.value?.examplePrompt, voice: selected.value?.voicePrompt, advanced: selected.value?.advancedPrompt })[promptMode.value] || selected.value?.examplePrompt || "Run the seeded example and show me the structured result.");

function liveRequest(input) {
  const flow = store.workflow.flows.find((item) => item.definitionId === "state-interaction-demo") ?? store.workflow.flows[0];
  const replace = (value) => {
    if (Array.isArray(value)) return value.map(replace);
    if (!value || typeof value !== "object") return value === "flow_demo" && flow ? flow.id : value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === "expectedVersion" && flow ? flow.eventCount : replace(item)]));
  };
  return replace(input ?? {});
}

const prebuiltRequests = computed(() => {
  if (!selected.value) return [];
  const valid = (selected.value.exampleRequests ?? [{}]).map((input, index) => ({ label: index ? `Example ${index + 1}` : "Seeded success", input: liveRequest(input) }));
  const baseInput = liveRequest(selected.value.exampleRequests?.[0] ?? {});
  const firstRequired = selected.value.inputSchema?.required?.[0];
  if (firstRequired) {
    const missingRequired = structuredClone(baseInput);
    delete missingRequired[firstRequired];
    valid.push({ label: `Missing required field: ${firstRequired}`, input: missingRequired });
  }
  const enumField = Object.entries(selected.value.inputSchema?.properties ?? {}).find(([, schema]) => Array.isArray(schema?.enum) && schema.enum.length);
  if (enumField) valid.push({ label: `Invalid ${enumField[0]} option`, input: { ...baseInput, [enumField[0]]: "unsupported" } });
  if (selected.value.interactionModel === "declarative" && !selected.value.currentRouteAvailable) {
    valid.push({ label: "Tool unavailable on this route", input: baseInput });
  }
  if (selected.value.name === "cleardose_search_drug_index") {
    valid.push({ label: "Empty seeded result", input: { query: "zz-no-seeded-medication-zz", limit: 5 } });
  }
  if (selected.value.name === "cleardose_get_drug_availability") {
    valid.push(
      { label: "Unavailable package", input: { drugId: "med_azithromycin", variantId: "azithromycin-500mg-60", locationId: "demo-chicago" } },
      { label: "Recovery location", input: { drugId: "med_azithromycin", variantId: "azithromycin-500mg-60", locationId: "demo-baltimore" } },
      { label: "Unknown location", input: { drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", locationId: "outside-demo" } },
    );
  }
  if (selected.value.name === "cleardose_compare_medication_options") {
    valid.push({ label: "Rejected unrelated pair", input: { drugIds: ["med_lisinopril", "med_atorvastatin"], purpose: "price", locationId: "demo-baltimore" } });
  }
  if (selected.value.name === "cleardose_dispatch_workflow_transition") {
    const flow = store.workflow.flows.find((item) => item.definitionId === "state-interaction-demo");
    if (flow) {
      valid.push(
        { label: "Stale version", input: { flowId: flow.id, action: "COMPARE", input: {}, expectedVersion: flow.eventCount + 1, requestId: `call_stale_${flow.eventCount}` } },
        { label: "Human-only checkout", input: { flowId: flow.id, action: "START_CHECKOUT", input: {}, expectedVersion: flow.eventCount, requestId: `call_human_${flow.eventCount}` } },
      );
    }
  }
  if (selected.value.name === "cleardose_compare_drug_availability") {
    valid.push({ label: "Missed delivery window", input: { drugId: "med_atorvastatin", variantId: "atorvastatin-40mg-90", locationId: "demo-remote", fulfillmentMode: "shipping", maxDeliveryDays: 3 } });
  }
  if (selected.value.name === "cleardose_estimate_delivery") {
    valid.push({ label: "Unavailable provider", input: { drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", providerId: "metro-demo-pharmacy", locationId: "demo-baltimore", fulfillmentMode: "shipping" } });
  }
  if (["cleardose_inspect_workflow_state", "cleardose_get_workflow_history", "cleardose_get_available_workflow_actions"].includes(selected.value.name)) {
    valid.push({ label: "Unknown flow", input: { flowId: "flow_missing", ...(selected.value.name === "cleardose_get_workflow_history" ? { limit: 20 } : {}) } });
  }
  if (selected.value.name === "cleardose_get_workflow_transition") {
    const flow = store.workflow.flows.find((item) => item.definitionId === "state-interaction-demo");
    if (flow) valid.push({ label: "Unknown action", input: { flowId: flow.id, action: "NOT_DECLARED" } });
  }
  if (selected.value.name === "cleardose_reset_workflow_state") {
    const flow = store.workflow.flows.find((item) => item.definitionId === "state-interaction-demo");
    if (flow) valid.push({ label: "Stale reset", input: { flowId: flow.id, expectedVersion: flow.eventCount + 1, requestId: `call_stale_reset_${flow.eventCount}` } });
  }
  if (selected.value.name === "cleardose_highlight_section") {
    valid.push({ label: "Section not on route", input: { target: "checkout-flow" } });
  }
  if (selected.value.name === "cleardose_add_to_cart") {
    valid.push({ label: "Unknown package", input: { drugId: "med_lisinopril", variantId: "missing-package" } });
  }
  if (selected.value.interactionModel === "declarative") {
    const firstField = Object.keys(selected.value.inputSchema?.properties ?? {})[0];
    if (firstField) valid.push({ label: "Wrong field type", input: { [firstField]: 42 } });
    valid.push({ label: "Unknown input field", input: { unexpectedField: "demo" } });
  }
  if (selected.value.interactionModel === "imperative" && Object.keys(selected.value.inputSchema?.properties ?? {}).length) {
    valid.push({ label: "Malformed input", input: { unexpectedField: true } });
  }
  return valid;
});

watch(selected, (entry) => {
  if (!entry) return;
  requestText.value = JSON.stringify(liveRequest(entry.exampleRequests?.[0] ?? {}), null, 2);
  requestError.value = "";
  receipt.value = store.explorer.lastInvocation?.toolName === entry.name ? store.explorer.lastInvocation : null;
  promptMode.value = "human";
}, { immediate: true });

watch(() => store.explorer.lastInvocation, (lastInvocation) => {
  if (!lastInvocation) return;
  if (entries.value.some((entry) => entry.name === lastInvocation.toolName)) selectedName.value = lastInvocation.toolName;
  receipt.value = lastInvocation;
});

watch(() => store.demoLab.selectedToolName, (name) => {
  if (name && entries.value.some((entry) => entry.name === name)) selectedName.value = name;
}, { immediate: true });

function choose(name) { selectedName.value = name; }
function loadRequest(input) { requestText.value = JSON.stringify(sanitizeExplorerInvocationValue(input), null, 2); requestError.value = ""; }

async function invoke() {
  requestError.value = "";
  let input;
  try { input = JSON.parse(requestText.value); }
  catch {
    requestText.value = sanitizeExplorerJsonText(requestText.value, { invalid: true });
    requestError.value = "Request must be valid JSON. Any sensitive values in the invalid text were removed.";
    return;
  }
  const invocationInput = sanitizeExplorerInvocationValue(input);
  requestText.value = JSON.stringify(invocationInput, null, 2);
  highlightService?.highlight("webmcp-console");
  const result = await store.invokeWebMcpTool(selected.value.name, invocationInput, { interactionModel: selected.value.interactionModel });
  if (consoleMounted) receipt.value = result;
}

async function reset() {
  await store.resetReplay();
  receipt.value = null;
  loadRequest(liveRequest(selected.value?.exampleRequests?.[0] ?? {}));
}

async function copyPrompt() {
  try { await clipboard.copy(selectedPrompt.value); announcement.value = "Prompt copied."; }
  catch (error) { announcement.value = error instanceof Error ? error.message : "Copy failed."; }
}

async function runPromptDemo() {
  const scenario = linkedScenarios.value[0];
  try { await store.runReplayScenario(scenario.id, { route: scenario.routes.includes("/demo") ? "/demo" : scenario.routes[0], resetSeed: true }); }
  catch (error) { announcement.value = error instanceof Error ? error.message : "The replay could not run."; }
}

function inspectPromptCalls() {
  const scenario = linkedScenarios.value[0];
  store.openDemoLab("replay", { scenarioId: scenario.id });
  announcement.value = "Replay trace opened.";
}

function promptTabId(mode) { return `${componentId}-tool-prompt-tab-${mode}`; }
function selectPromptMode(mode) { promptMode.value = mode; }
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
  <section id="explorer" class="webmcp-explorer" data-agent-section="webmcp-explorer" aria-labelledby="explorer-title">
    <header class="explorer-heading">
      <div><span class="eyebrow"><TerminalSquare :size="17" /> Live WebMCP Explorer</span><h2 id="explorer-title">Inspect and run the browser tool contract.</h2><p>Every imperative request below calls the same wrapped handler registered with <code>document.modelContext</code>. The console stays usable when that browser API is unavailable.</p></div>
      <dl><div><dt>Catalog</dt><dd>{{ entries.length }}</dd></div><div><dt>Browser registered</dt><dd>{{ store.webMcp.registered }}</dd></div><div><dt>Local replay</dt><dd>{{ entries.filter((item) => item.locallyInvokable).length }}</dd></div></dl>
    </header>

    <div class="explorer-shell">
      <aside class="explorer-sidebar" aria-label="WebMCP capabilities">
        <div class="explorer-search"><Search :size="16" /><input v-model="query" name="webmcp-tool-search" type="search" autocomplete="off" aria-label="Search WebMCP tools" placeholder="Search tools" /></div>
        <div class="explorer-filters"><button type="button" :aria-pressed="kind === 'all'" @click="kind = 'all'">All</button><button type="button" :aria-pressed="kind === 'imperative'" @click="kind = 'imperative'">Imperative</button><button type="button" :aria-pressed="kind === 'declarative'" @click="kind = 'declarative'">Declarative</button></div>
        <div class="explorer-tool-list">
          <button v-for="entry in filtered" :key="entry.name" type="button" :class="{ selected: entry.name === selected?.name }" :aria-pressed="entry.name === selected?.name" @click="choose(entry.name)">
            <span><CircleDot :size="13" />{{ entry.browserStatus }}</span><strong>{{ entry.title || entry.toolName }}</strong><code>{{ entry.name }}</code><small>{{ entry.namespace }} · {{ entry.interactionModel }}</small>
          </button>
        </div>
      </aside>

      <div v-if="selected" class="explorer-main">
        <article class="explorer-reference">
          <header><div><span>{{ selected.category }}</span><h3>{{ selected.title || selected.toolName }}</h3><code>{{ selected.name }}</code></div><span class="tool-live-chip" :data-status="selected.browserStatus"><CircleDot :size="13" />{{ selected.browserStatus }}</span></header>
          <p>{{ selected.description || selected.expectedResult }}</p>
          <dl class="tool-fact-grid"><div><dt>Namespace</dt><dd>{{ selected.namespace }}</dd></div><div><dt>Registration</dt><dd>{{ selected.interactionModel }}</dd></div><div><dt>Routes</dt><dd>{{ selected.routes.join(', ') }}</dd></div><div><dt>Current route</dt><dd>{{ selected.currentRouteAvailable ? 'Available' : 'Unavailable' }}</dd></div><div><dt>Capabilities</dt><dd>{{ selected.permissions.join(', ') }}</dd></div><div><dt>Machine</dt><dd><code>{{ selected.machine?.id || 'dynamic' }}</code></dd></div></dl>

          <section class="tool-prompt-spec-card" :aria-labelledby="promptTitleId">
            <header><div><span>Runnable prompt specification</span><h4 :id="promptTitleId">Ask for this capability in your own words</h4></div><ShieldCheck :size="17" /></header>
            <div class="tool-prompt-tabs" role="tablist" aria-label="Tool prompt variants" aria-orientation="horizontal" @keydown="handlePromptTabKeydown"><button :id="promptTabId('human')" type="button" role="tab" :aria-controls="promptPanelId" :aria-selected="promptMode === 'human'" :tabindex="promptMode === 'human' ? 0 : -1" @click="selectPromptMode('human')">Human</button><button :id="promptTabId('voice')" type="button" role="tab" :aria-controls="promptPanelId" :aria-selected="promptMode === 'voice'" :tabindex="promptMode === 'voice' ? 0 : -1" @click="selectPromptMode('voice')"><Mic2 :size="14" /> Voice</button><button :id="promptTabId('advanced')" type="button" role="tab" :aria-controls="promptPanelId" :aria-selected="promptMode === 'advanced'" :tabindex="promptMode === 'advanced' ? 0 : -1" @click="selectPromptMode('advanced')"><Braces :size="14" /> Advanced</button></div>
            <blockquote :id="promptPanelId" role="tabpanel" :aria-labelledby="promptTabId(promptMode)" tabindex="0">{{ selectedPrompt }}</blockquote>
            <dl><div><dt>Tool</dt><dd><code>{{ selected.name }}</code></dd></div><div><dt>Expected result</dt><dd>{{ selected.expectedResult }}</dd></div></dl>
            <footer><button class="button button-primary" type="button" @click="runPromptDemo"><Play :size="15" /> Run programmatic replay</button><button class="button button-ghost" type="button" @click="copyPrompt"><Clipboard :size="15" /> Copy prompt</button><button class="text-action" type="button" @click="inspectPromptCalls"><Eye :size="15" /> Inspect calls</button></footer>
          </section>

          <details open><summary>Input schema <ChevronRight :size="14" /></summary><pre tabindex="0"><code>{{ JSON.stringify(selected.inputSchema, null, 2) }}</code></pre></details>
          <details><summary>Output schema <ChevronRight :size="14" /></summary><pre tabindex="0"><code>{{ JSON.stringify(selected.outputSchema, null, 2) }}</code></pre></details>
          <details><summary>Examples, errors, and related tools <ChevronRight :size="14" /></summary><div class="tool-reference-grid"><section><h4>Example response</h4><pre tabindex="0"><code>{{ JSON.stringify(selected.exampleResponse, null, 2) }}</code></pre></section><section><h4>Deterministic errors</h4><ul><li v-for="error in selected.deterministicErrors" :key="error.code"><code>{{ error.code }}</code><span>{{ error.recovery }}</span></li><li v-if="!selected.deterministicErrors.length">No tool-specific fixture. Schema validation errors still apply.</li></ul><h4>Related tools</h4><div class="related-tool-links"><button v-for="tool in selected.relatedTools" :key="tool" type="button" @click="choose(tool.startsWith('cleardose_') ? tool : `cleardose_${tool}`)">{{ tool }}</button></div></section></div></details>
        </article>

        <section class="explorer-console" data-agent-section="webmcp-console" aria-labelledby="console-title">
          <header><div><span class="eyebrow"><Braces :size="15" /> Try it</span><h3 id="console-title">Local request console</h3></div><span><ShieldCheck :size="14" /> Seeded mock, no external call</span></header>
          <div class="prebuilt-requests"><button v-for="example in prebuiltRequests" :key="example.label" type="button" @click="loadRequest(example.input)"><WandSparkles :size="14" />{{ example.label }}</button></div>
          <label>Tool parameters<textarea v-model="requestText" name="webmcp-tool-parameters" autocomplete="off" rows="11" spellcheck="false" aria-describedby="console-route-note"></textarea></label>
          <p id="console-route-note">{{ selected.interactionModel === 'declarative' ? 'Declarative calls edit the visible form only when its route is open.' : 'Imperative calls use the same Pinia, facade, API, and workflow path as browser WebMCP.' }}</p>
          <p v-if="requestError" class="inline-error" role="alert">{{ requestError }}</p>
          <div class="console-actions"><button class="button button-primary" type="button" :disabled="store.explorer.invoking" @click="invoke"><Play :size="16" />{{ store.explorer.invoking ? 'Running' : 'Invoke tool' }}</button><button class="button button-ghost" type="button" @click="reset"><RotateCcw :size="16" /> Reset seeded state</button></div>

          <div v-if="receipt" class="console-receipt" :class="{ failed: receipt.error || receipt.response?.isError || receipt.response?.ok === false }">
            <div class="receipt-summary"><span><Check v-if="!receipt.error && !receipt.response?.isError && receipt.response?.ok !== false" :size="16" /><AlertTriangle v-else :size="16" />{{ receipt.error || receipt.response?.isError || receipt.response?.ok === false ? 'Structured failure' : 'Completed' }}</span><strong><Clock3 :size="15" />{{ receipt.elapsedMs }} ms</strong><code>{{ receipt.id }}</code></div>
            <div class="replay-io-grid"><section><h4>Request</h4><pre tabindex="0"><code>{{ JSON.stringify(receipt.request, null, 2) }}</code></pre></section><section><h4>Response</h4><pre tabindex="0"><code>{{ JSON.stringify(receipt.error || receipt.response, null, 2) }}</code></pre></section></div>
            <section class="receipt-changes"><h4>Observed changes</h4><ul v-if="receipt.changes.length"><li v-for="change in receipt.changes" :key="change.key"><code>{{ change.key }}</code><span>{{ JSON.stringify(change.before) }} → {{ JSON.stringify(change.after) }}</span></li></ul><p v-else>No bounded application state or visible form field changed.</p></section>
          </div>
        </section>

        <section v-if="linkedScenarios.length" class="explorer-prompt-specs"><header><span class="eyebrow">Active prompt specifications</span><h3>Scenarios that may call this tool</h3></header><div><DemoScenarioCard v-for="scenario in linkedScenarios" :key="scenario.id" :scenario="scenario" compact /></div></section>
      </div>
    </div>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </section>
</template>
