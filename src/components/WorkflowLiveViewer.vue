<script setup>
import { computed, ref, watch } from "vue";
import { Activity, ArrowRight, Database, Radio, Rows3 } from "@lucide/vue";
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
const selectedEventId = ref("");
const flows = computed(() => store.workflow.flows);
const selectedFlow = computed(() => flows.value.find((flow) => flow.id === store.selectedFlowId) ?? flows.value[0] ?? null);
const definition = computed(() => selectedFlow.value?.context?.machineDefinition ?? store.workflow.definitions.find((item) => item.id === selectedFlow.value?.definitionId));
const flowEvents = computed(() => store.workflow.events.filter((event) => event.flowId === selectedFlow.value?.id).slice(-props.maxEvents).reverse());
const selectedEvent = computed(() => flowEvents.value.find((event) => event.id === selectedEventId.value) ?? flowEvents.value[0] ?? null);
const selectedContext = computed(() => selectedEvent.value?.context ?? selectedFlow.value?.context ?? {});
const contextJson = computed(() => JSON.stringify(selectedContext.value, null, 2));

watch(() => selectedFlow.value?.id, () => { selectedEventId.value = ""; });

function stateClass(state) {
  const states = definition.value?.states ?? [];
  const current = states.indexOf(selectedFlow.value?.state);
  const index = states.indexOf(state);
  return { current: index === current, visited: index < current };
}
</script>

<template>
  <section class="flow-viewer" :class="{ compact }" data-agent-section="workflow-runtime" aria-labelledby="flow-viewer-title">
    <header class="flow-viewer-header">
      <div><span class="eyebrow"><Activity :size="16" /> Live state inspector</span><h2 id="flow-viewer-title">Workflow runtime</h2></div>
      <span class="database-chip" :class="store.workflow.database.state"><Database :size="15" /> {{ store.workflow.database.engine }} · {{ store.workflow.database.persistence }}</span>
    </header>

    <div class="flow-viewer-body">
      <aside class="flow-lanes" aria-label="Concurrent workflow instances">
        <div class="flow-lanes-heading"><Rows3 :size="16" /><strong>{{ flows.length }} flows</strong><span><Radio :size="13" /> live</span></div>
        <button v-for="flow in flows" :key="flow.id" type="button" :class="{ selected: flow.id === selectedFlow?.id }" :aria-pressed="flow.id === selectedFlow?.id" @click="store.selectWorkflow(flow.id)">
          <span>{{ flow.definitionId }}</span><strong>{{ flow.title }}</strong><small>{{ adapter.stateLabel(flow.state) }} · {{ flow.eventCount }} events</small>
        </button>
        <p v-if="!flows.length">No flows yet. Run a scenario or WebMCP tool to begin.</p>
      </aside>

      <div class="flow-inspector">
        <template v-if="selectedFlow">
          <div class="flow-instance-meta"><div><span>Selected flow</span><strong>{{ selectedFlow.title }}</strong></div><code>{{ selectedFlow.id }}</code></div>
          <ol class="state-nodes" :aria-label="`${selectedFlow.title} states`">
            <li v-for="(state, index) in definition?.states" :key="state" :class="stateClass(state)">
              <span>{{ index + 1 }}</span><strong>{{ adapter.stateLabel(state) }}</strong><ArrowRight v-if="index < definition.states.length - 1" :size="15" aria-hidden="true" />
            </li>
          </ol>

          <div class="flow-detail-grid">
            <div class="flow-event-log">
              <h3>Event timeline</h3>
              <button v-for="event in flowEvents" :key="event.id" type="button" :class="{ selected: event.id === selectedEvent?.id }" :aria-pressed="event.id === selectedEvent?.id" @click="selectedEventId = event.id">
                <span>{{ adapter.timeLabel(event.createdAt) }}</span><strong>{{ adapter.eventLabel(event.type) }}</strong><small>{{ adapter.stateLabel(event.fromState || 'start') }} → {{ adapter.stateLabel(event.toState) }} · {{ event.source }}</small>
              </button>
            </div>
            <div class="flow-context-panel">
              <div><h3>Context at this step</h3><span>{{ selectedEvent ? adapter.timeLabel(selectedEvent.createdAt) : 'Current' }}</span></div>
              <pre tabindex="0"><code>{{ contextJson }}</code></pre>
            </div>
          </div>
        </template>
      </div>
    </div>
    <p class="sr-only" aria-live="polite">{{ selectedFlow ? `${selectedFlow.title} is ${adapter.stateLabel(selectedFlow.state)} with ${selectedFlow.eventCount} events.` : 'No workflow selected.' }}</p>
  </section>
</template>
