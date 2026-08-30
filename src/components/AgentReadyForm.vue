<script setup>
import { agentReadyProps } from "../presentation/agentReadyProps";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";

const props = defineProps({
  ...agentReadyProps,
  formName: { type: String, default: "agent_ready_form" },
  autocomplete: { type: String, default: "on" },
  novalidate: { type: Boolean, default: false },
});
const emit = defineEmits(["submit"]);
const passthroughAdapter = Object.freeze({});
const { declarativeAttributes } = useAgentReadyComponent(props, {
  name: props.formName,
  defaultAdapter: passthroughAdapter,
});
</script>

<template>
  <form
    v-bind="declarativeAttributes"
    :autocomplete="autocomplete"
    :novalidate="novalidate"
    @submit.prevent="emit('submit', $event)"
  >
    <slot />
  </form>
</template>
