<script setup>
import { computed } from "vue";
import { Bot, CircleCheck } from "@lucide/vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { webMcpStatusAdapter } from "../presentation/adapters/componentAdapters";

const props = defineProps(agentReadyProps);
const store = usePharmacyStore();
const { adapter } = useAgentReadyComponent(props, { name: "webmcp_status", defaultAdapter: webMcpStatusAdapter });
const label = computed(() => adapter.value.label(store.webMcp));
</script>

<template>
  <span class="webmcp-status" :title="store.webMcp.supported ? 'Registered with this browser' : 'Available when this browser enables WebMCP'">
    <CircleCheck v-if="store.webMcp.status === 'ready'" :size="15" />
    <Bot v-else :size="15" />
    {{ label }}
  </span>
</template>
