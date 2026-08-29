import { computed, inject, onBeforeUnmount, onMounted, shallowRef } from "vue";
import { clearDoseFacadeKey, clearDoseToolRegistryKey } from "../app/injectionKeys";

export function useAgentReadyComponent(props, { name, defaultAdapter }) {
  const facade = inject(clearDoseFacadeKey, null);
  const toolRegistry = inject(clearDoseToolRegistryKey, null);
  const cleanup = shallowRef(() => {});
  const adapter = computed(() => props.adapter ?? defaultAdapter);

  onMounted(async () => {
    if (!props.registerMcp || !props.mcpTools.length || !toolRegistry) return;
    cleanup.value = await toolRegistry.registerComponentTools({
      component: name,
      tools: props.mcpTools,
      context: { facade, ...props.mcpContext },
    });
  });

  onBeforeUnmount(() => cleanup.value());
  return { adapter, facade, toolRegistry };
}
