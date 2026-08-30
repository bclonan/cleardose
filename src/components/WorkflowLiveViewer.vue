<script setup>
import { computed, ref, useId, watch } from "vue";
import { Activity, ArrowRight, Database, History, Play, Radio, RotateCcw, Rows3, ShieldAlert, UserRound } from "@lucide/vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { workflowLiveViewerAdapter } from "../presentation/adapters/componentAdapters";

const props = defineProps({
  ...agentReadyProps,
  compact: { type: Boolean, default: false },
  maxEvents: { type: Number, default: 30 },
});
const store = usePharmacyStore();
const { adapter } = useAgentReadyComponent(props, { name: "workflow_live_viewer", defaultAdapter: workflowLiveViewerAdapter });
const componentId = useId();
const selectedEventId = ref("");
const selectedState = ref("");
const selectedAction = ref("");
const actionInput = ref("{}");
const actionError = ref("");
const actionResult = ref(null);
const announcement = ref("Live state inspector ready.");

const flows = computed(() => store.workflow.flows);
const selectedFlow = computed(() => flows.value.find((flow) => flow.id === store.selectedFlowId) ?? flows.value[0] ?? null);
const definition = computed(() => selectedFlow.value?.context?.machineDefinition ?? store.workflow.definitions.find((item) => item.id === selectedFlow.value?.definitionId));
const flowEvents = computed(() => store.workflow.events.filter((event) => event.flowId === selectedFlow.value?.id).slice(-props.maxEvents));
const selectedEvent = computed(() => flowEvents.value.find((event) => event.id === selectedEventId.value) ?? flowEvents.value.at(-1) ?? null);
const selectedContext = computed(() => selectedEvent.value?.context ?? selectedFlow.value?.context ?? {});
const contextJson = computed(() => JSON.stringify(selectedContext.value, null, 2));
const actions = computed(() => {
  if (!selectedFlow.value) return { availableActions: [], humanActions: [], unavailableActions: [], validNextStates: [] };
  try { return store.getAvailableWorkflowActions({ flowId: selectedFlow.value.id }); }
  catch { return { availableActions: [], humanActions: [], unavailableActions: [], validNextStates: [] }; }
});
const allActions = computed(() => [...actions.value.availableActions, ...actions.value.humanActions, ...actions.value.unavailableActions]);
const activeAction = computed(() => allActions.value.find((item) => item.action === selectedAction.value) ?? allActions.value[0] ?? null);
const visitedStates = computed(() => new Set(flowEvents.value.flatMap((event) => [event.fromState, event.toState]).filter(Boolean)));
const selectedStateMeta = computed(() => definition.value?.stateMeta?.[selectedState.value] ?? {});
const selectedStateTransitions = computed(() => (definition.value?.transitions ?? [])
  .filter((transition) => transition.from.includes(selectedState.value))
  .map((transition) => ({
    ...transition,
    runtime: allActions.value.find((action) => action.action === transition.action) ?? null,
  })));
const selectedStateStatus = computed(() => {
  if (!selectedState.value) return "No state selected";
  const labels = [];
  if (selectedState.value === selectedFlow.value?.state) labels.push("Current");
  else if (visitedStates.value.has(selectedState.value)) labels.push("Visited");
  else if (actions.value.validNextStates?.includes(selectedState.value)) labels.push("Valid next");
  else labels.push("Inactive");
  if (selectedStateMeta.value.error) labels.push("Error");
  if (selectedStateMeta.value.recovery) labels.push("Recovery");
  if (selectedStateMeta.value.terminal) labels.push("Terminal");
  return labels.join(" · ");
});
const selectedStateDescription = computed(() => {
  if (selectedStateMeta.value.description) return selectedStateMeta.value.description;
  const incoming = (definition.value?.transitions ?? []).find((transition) => transition.to === selectedState.value);
  if (incoming?.description) return `Entered after this rule: ${incoming.description}`;
  return selectedStateTransitions.value.length
    ? `This state has ${selectedStateTransitions.value.length} declared exit${selectedStateTransitions.value.length === 1 ? "" : "s"}.`
    : "This state has no declared exits.";
});
const flowViewerTitleId = `${componentId}-flow-viewer-title`;
const actionInputId = computed(() => `${componentId}-workflow-action-input-${selectedFlow.value?.id ?? "none"}`);
const stateDetailTitleId = computed(() => `${componentId}-selected-state-title`);

watch(() => selectedFlow.value?.id, () => {
  selectedEventId.value = "";
  selectedState.value = selectedFlow.value?.state ?? "";
  selectedAction.value = "";
  actionInput.value = "{}";
  actionError.value = "";
  actionResult.value = null;
}, { immediate: true });

watch(activeAction, (action) => {
  if (!action) return;
  const input = {};
  for (const field of action.requiredInput ?? []) {
    const schema = action.inputSchema?.properties?.[field] ?? {};
    input[field] = schema.type === "integer" || schema.type === "number" ? schema.minimum ?? 1 : schema.type === "boolean" ? true : field === "zip" ? "21201" : "demo";
  }
  actionInput.value = JSON.stringify(input, null, 2);
  actionError.value = "";
}, { immediate: true });

function stateClass(state) {
  const meta = definition.value?.stateMeta?.[state] ?? {};
  return {
    current: state === selectedFlow.value?.state,
    selected: state === selectedState.value,
    visited: visitedStates.value.has(state),
    available: actions.value.validNextStates?.includes(state),
    terminal: Boolean(meta.terminal),
    error: Boolean(meta.error),
    recovery: Boolean(meta.recovery),
  };
}

function actionClass(action) {
  return {
    available: action.available,
    human: action.humanOnly && action.availableToHuman,
    disabled: !action.availableToHuman,
    recovery: action.recovery,
    selected: action.action === activeAction.value?.action,
  };
}

function eventCategory(event) {
  const type = String(event.type || "").toUpperCase();
  const source = String(event.source || "").toLowerCase();
  if (/RECOVER|RETRY|RESET|CORRECT|RETURN/.test(type)) return "Recovery";
  if (/FAIL|ERROR|REJECT|UNAVAILABLE|MISSED/.test(type) || source === "failure") return "Failure";
  if (source.includes("mock") || source === "seed") return "Mock API";
  if (source.includes("dom") || source.includes("form")) return "DOM";
  if (source.includes("webmcp") || source.includes("programmatic-replay")) return "MCP";
  if (source.includes("agent")) return "Agent";
  return "User";
}

async function dispatchAction() {
  const action = activeAction.value;
  if (!selectedFlow.value || !action?.available) return;
  actionError.value = "";
  actionResult.value = null;
  try {
    const input = JSON.parse(actionInput.value || "{}");
    actionResult.value = await store.dispatchWorkflowTransition({
      flowId: selectedFlow.value.id,
      action: action.action,
      input,
      expectedVersion: selectedFlow.value.eventCount,
      requestId: `call_${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      source: "live-state-inspector",
    });
    announcement.value = `${action.action} moved the workflow to ${actionResult.value.state}.`;
  } catch (error) {
    const structured = typeof error?.toStructuredContent === "function" ? error.toStructuredContent() : null;
    actionError.value = structured?.message ?? (error instanceof Error ? error.message : "The transition failed.");
    actionResult.value = structured;
    announcement.value = actionError.value;
  }
}

async function resetFlow() {
  if (!selectedFlow.value) return;
  actionError.value = "";
  try {
    actionResult.value = await store.resetWorkflowState({
      flowId: selectedFlow.value.id,
      expectedVersion: selectedFlow.value.eventCount,
      requestId: `call_${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      source: "live-state-inspector",
    });
    announcement.value = `Reset ${selectedFlow.value.title} to ${actionResult.value.state}.`;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "The workflow could not reset.";
  }
}
</script>

<template>
  <section class="flow-viewer" :class="{ compact }" data-agent-section="workflow-runtime" :aria-labelledby="flowViewerTitleId">
    <header class="flow-viewer-header">
      <div><span class="eyebrow"><Activity :size="16" /> Live state inspector</span><h2 :id="flowViewerTitleId">Application truth, one event at a time</h2></div>
      <span class="database-chip" :class="store.workflow.database.state"><Database :size="15" /> {{ store.workflow.database.engine }} · {{ store.workflow.database.persistence }}</span>
    </header>

    <div class="flow-viewer-body">
      <aside class="flow-lanes" aria-label="Concurrent workflow instances">
        <div class="flow-lanes-heading"><Rows3 :size="16" /><strong>{{ flows.length }} flows</strong><span><Radio :size="13" /> live</span></div>
        <button v-for="flow in flows" :key="flow.id" type="button" :class="{ selected: flow.id === selectedFlow?.id }" :aria-pressed="flow.id === selectedFlow?.id" @click="store.selectWorkflow(flow.id)">
          <span>{{ flow.definitionId }}</span><strong>{{ flow.title }}</strong><small>{{ adapter.stateLabel(flow.state) }} · v{{ flow.eventCount }}</small>
        </button>
        <p v-if="!flows.length">No flows yet. Run a scenario or WebMCP tool to begin.</p>
      </aside>

      <div class="flow-inspector">
        <template v-if="selectedFlow">
          <div class="flow-instance-meta"><div><span>Selected flow</span><strong>{{ selectedFlow.title }}</strong><small>{{ definition?.description }}</small></div><code>{{ selectedFlow.id }} · v{{ selectedFlow.eventCount }}</code></div>

          <div class="workflow-state-map" data-agent-section="state-graph" :aria-label="`${selectedFlow.title} branching state graph`">
            <button v-for="state in definition?.states" :key="state" type="button" class="workflow-state-node" :class="stateClass(state)" :aria-pressed="state === selectedState" @click="selectedState = state">
              <span>{{ state === selectedFlow.state ? 'Current' : visitedStates.has(state) ? 'Visited' : actions.validNextStates?.includes(state) ? 'Valid next' : 'Inactive' }}</span>
              <strong>{{ adapter.stateLabel(state) }}</strong>
              <small v-if="definition?.stateMeta?.[state]?.error">Error state</small>
              <small v-else-if="definition?.stateMeta?.[state]?.terminal">Terminal state</small>
              <small v-else-if="definition?.stateMeta?.[state]?.recovery">Recovery state</small>
            </button>
          </div>

          <section class="workflow-state-detail" aria-live="polite" :aria-labelledby="stateDetailTitleId">
            <div>
              <span class="eyebrow">Selected state</span>
              <h3 :id="stateDetailTitleId">{{ adapter.stateLabel(selectedState) }}</h3>
              <strong>{{ selectedStateStatus }}</strong>
              <p>{{ selectedStateDescription }}</p>
            </div>
            <div class="workflow-state-exits">
              <span>Possible exits</span>
              <ul v-if="selectedStateTransitions.length">
                <li v-for="transition in selectedStateTransitions" :key="transition.action">
                  <button type="button" @click="selectedAction = transition.action">
                    <strong>{{ transition.label }}</strong>
                    <small><code>{{ transition.action }}</code> to {{ adapter.stateLabel(transition.to) }}</small>
                    <em v-if="transition.runtime?.available">Available now</em>
                    <em v-else-if="transition.runtime?.humanOnly && transition.runtime?.availableToHuman">Human action</em>
                    <em v-else>Declared exit</em>
                  </button>
                </li>
              </ul>
              <p v-else>No exit is declared for this state.</p>
            </div>
          </section>

          <div class="workflow-transition-map" aria-label="Declared state transitions">
            <button v-for="action in allActions" :key="`${action.action}:${action.from.join(',')}`" type="button" :class="actionClass(action)" :aria-pressed="action.action === activeAction?.action" @click="selectedAction = action.action">
              <span>{{ action.from.join(' or ') }}</span><ArrowRight :size="14" aria-hidden="true" /><strong>{{ action.to }}</strong><small>{{ action.action }}</small>
            </button>
          </div>

          <div class="workflow-action-console">
            <div class="workflow-action-copy">
              <span class="eyebrow">Selected transition</span>
              <h3>{{ activeAction?.label ?? 'No transition selected' }}</h3>
              <p>{{ activeAction?.description ?? 'Choose a declared edge to inspect its rule.' }}</p>
              <dl v-if="activeAction">
                <div><dt>Trigger</dt><dd>{{ activeAction.trigger }}</dd></div>
                <div><dt>Required input</dt><dd><template v-if="activeAction.requiredInput?.length"><code v-for="field in activeAction.requiredInput" :key="field">{{ field }}</code></template><span v-else>None</span></dd></div>
                <div><dt>Result</dt><dd>{{ activeAction.from.join(' or ') }} → {{ activeAction.to }}</dd></div>
                <div><dt>Related tool</dt><dd><code>{{ activeAction.relatedTool || 'No tool required' }}</code></dd></div>
              </dl>
            </div>
            <form class="workflow-action-form" @submit.prevent="dispatchAction">
              <label :for="actionInputId">Bounded action input <small>{{ activeAction?.requiredInput?.length ? `Required: ${activeAction.requiredInput.join(', ')}` : 'No required fields' }}</small></label>
              <textarea :id="actionInputId" v-model="actionInput" name="workflow-action-input" autocomplete="off" rows="4" spellcheck="false"></textarea>
              <p v-if="activeAction?.humanOnly" class="state-human-gate"><UserRound :size="17" /> This action needs a visible human control.</p>
              <p v-else-if="activeAction?.disabledReason" class="state-disabled-reason"><ShieldAlert :size="17" /> {{ activeAction.disabledReason }}</p>
              <p v-if="actionError" class="state-action-error" role="alert">{{ actionError }}</p>
              <div><button class="button button-primary" type="submit" :disabled="!activeAction?.available"><Play :size="16" /> Dispatch transition</button><button class="button button-outline" type="button" @click="resetFlow"><RotateCcw :size="16" /> Reset flow</button></div>
              <pre v-if="actionResult" tabindex="0"><code>{{ JSON.stringify(actionResult, null, 2) }}</code></pre>
            </form>
          </div>

          <div class="flow-detail-grid">
            <div class="flow-event-log">
              <h3><History :size="17" /> Chronological event history</h3>
              <button v-for="event in flowEvents" :key="event.id" type="button" :class="{ selected: event.id === selectedEvent?.id }" :aria-pressed="event.id === selectedEvent?.id" @click="selectedEventId = event.id">
                <span>{{ adapter.timeLabel(event.createdAt) }} <em :class="`event-${eventCategory(event).toLowerCase().replace(' ', '-')}`">{{ eventCategory(event) }}</em></span>
                <strong>{{ adapter.eventLabel(event.type) }}</strong>
                <small>{{ adapter.stateLabel(event.fromState || 'start') }} → {{ adapter.stateLabel(event.toState) }} · {{ event.source }} · {{ event.id }}</small>
              </button>
            </div>
            <div class="flow-context-panel">
              <div><h3>Bounded context snapshot</h3><span>{{ selectedEvent ? adapter.timeLabel(selectedEvent.createdAt) : 'Current' }}</span></div>
              <pre tabindex="0"><code>{{ contextJson }}</code></pre>
            </div>
          </div>
        </template>
      </div>
    </div>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </section>
</template>
