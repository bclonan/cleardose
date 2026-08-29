<script setup>
import { computed } from "vue";
import { ClipboardList, Package, Settings, UserRound } from "@lucide/vue";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { accountNavAdapter } from "../presentation/adapters/componentAdapters";
import { agentReadyProps } from "../presentation/agentReadyProps";

const props = defineProps(agentReadyProps);
const { adapter } = useAgentReadyComponent(props, { name: "account_nav", defaultAdapter: accountNavAdapter });
const items = computed(() => adapter.value.items());
const icons = { user: UserRound, prescriptions: ClipboardList, orders: Package, settings: Settings };
</script>

<template>
  <aside class="account-sidebar" aria-label="Account navigation">
    <template v-for="item in items" :key="item.to ?? item.href">
      <RouterLink v-if="item.to" :to="item.to"><component :is="icons[item.icon]" :size="18" /> {{ item.label }}</RouterLink>
      <a v-else :href="item.href"><component :is="icons[item.icon]" :size="18" /> {{ item.label }}</a>
    </template>
  </aside>
</template>
