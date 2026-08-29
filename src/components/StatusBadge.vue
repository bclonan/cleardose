<script setup>
import { computed } from "vue";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { statusBadgeAdapter } from "../presentation/adapters/componentAdapters";
import { agentReadyProps } from "../presentation/agentReadyProps";

const props = defineProps({ ...agentReadyProps, status: { type: String, required: true } });
const { adapter } = useAgentReadyComponent(props, { name: "status_badge", defaultAdapter: statusBadgeAdapter });
const label = computed(() => adapter.value.label(props.status));
</script>

<template>
  <span class="status-badge" :class="`status-${status}`"><span></span>{{ label }}</span>
</template>
