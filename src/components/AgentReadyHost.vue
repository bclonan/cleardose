<script setup>
import { computed } from "vue";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { agentReadyHostAdapter } from "../presentation/adapters/componentAdapters";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";

const props = defineProps({
  ...agentReadyProps,
  component: { type: [Object, String], required: true },
  componentProps: { type: Object, default: () => ({}) },
});

const { adapter } = useAgentReadyComponent(props, { name: "agent_ready_host", defaultAdapter: agentReadyHostAdapter });
const resolvedComponent = computed(() => adapter.value.resolve(props.component));
</script>

<template>
  <component :is="resolvedComponent" v-bind="componentProps">
    <slot />
  </component>
</template>
