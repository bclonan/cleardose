<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Bot, Code2, MousePointer2 } from "@lucide/vue";
import { usePharmacyStore } from "../composables/usePharmacyStore";
import { useAgentReadyComponent } from "../composables/useAgentReadyComponent";
import { agentReadyProps } from "../presentation/agentReadyProps";
import { normalizeDemoRoute } from "../domain/shared/demoRoute.js";
import DemoScenarioCard from "./DemoScenarioCard.vue";

const props = defineProps({ ...agentReadyProps });
useAgentReadyComponent(props, { name: "route_demo_section", defaultAdapter: Object.freeze({}) });
const route = useRoute();
const store = usePharmacyStore();

const scenarios = computed(() => store.demoScenariosForRoute(normalizeDemoRoute(route.path)).slice(0, route.path === "/demo" ? 1 : 2));
</script>

<template>
  <section v-if="scenarios.length" class="route-demo-section" data-agent-section="route-demo-scenarios" aria-labelledby="route-demo-title">
    <div class="page-width">
      <header class="route-demo-heading">
        <div><span class="eyebrow"><Bot :size="16" /> Try it on this page</span><h2 id="route-demo-title">One workflow, three ways to run it.</h2><p>Use the visible UI yourself, ask a WebMCP agent, or run the same seeded steps through the local replay engine.</p></div>
        <div class="three-path-key" aria-label="Available interaction paths"><span><MousePointer2 :size="15" /> Human</span><span><Bot :size="15" /> WebMCP</span><span><Code2 :size="15" /> Replay</span></div>
      </header>
      <div class="route-demo-grid"><DemoScenarioCard v-for="scenario in scenarios" :key="scenario.id" :scenario="scenario" /></div>
    </div>
  </section>
</template>
