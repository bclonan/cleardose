<script setup>
import { computed } from "vue";
import { Activity, ArrowRight, Braces, ShieldCheck } from "@lucide/vue";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";

const props = defineProps({
  ...agentReadyProps,
  capability: { type: Object, default: null },
  shortcut: { type: Object, default: null },
  activeStep: { type: Number, default: 0 },
});
useAgentReadyComponent(props, { name: "capability_machine_pane", defaultAdapter: Object.freeze({}) });
const states = computed(() => props.shortcut ? ["ready", ...props.shortcut.steps.map((item, index) => `step ${index + 1}: ${item.title}`), "human review", "complete"] : (props.capability?.machine?.states ?? []));
const machineId = computed(() => props.shortcut ? `machine.dynamic.shortcut-${props.shortcut.id}.v1` : props.capability?.machine?.id);
const scope = computed(() => props.shortcut?.scope ?? { role: props.capability?.machine?.role ?? "patient", situation: "tool-call", step: props.capability?.toolName ?? "idle" });
</script>

<template>
  <section class="machine-pane" data-agent-section="machine-inspector" aria-labelledby="machine-pane-title">
    <header><div><span class="eyebrow"><Activity :size="15" /> Deterministic analog</span><h2 id="machine-pane-title">Machine contract</h2></div><span class="machine-kind"><ShieldCheck :size="15" /> {{ shortcut ? 'dynamic scope' : (capability?.machine?.kind || 'static') }}</span></header>
    <code class="machine-id">{{ machineId || 'Select a capability or shortcut' }}</code>
    <ol v-if="states.length" class="machine-state-list">
      <li v-for="(state, index) in states" :key="state" :class="{ current: index === activeStep, visited: index < activeStep }"><span>{{ index + 1 }}</span><strong>{{ state }}</strong><ArrowRight v-if="index < states.length - 1" :size="14" /></li>
    </ol>
    <div class="machine-scope"><h3><Braces :size="15" /> Scope</h3><dl><template v-for="(value, key) in scope" :key="key"><dt>{{ key }}</dt><dd>{{ value }}</dd></template></dl></div>
  </section>
</template>

