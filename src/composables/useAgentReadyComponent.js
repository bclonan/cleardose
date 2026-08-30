import { computed, inject, onBeforeUnmount, onMounted, shallowRef } from "vue";
import { clearDoseFacadeKey, clearDoseToolRegistryKey } from "../app/injectionKeys";

export function useAgentReadyComponent(props, { name, defaultAdapter }) {
  const facade = inject(clearDoseFacadeKey, null);
  const toolRegistry = inject(clearDoseToolRegistryKey, null);
  const cleanup = shallowRef(() => {});
  const adapter = computed(() => props.adapter ?? defaultAdapter);
  const imperativeTools = computed(() => [
    ...(props.mcpTools ?? []),
    ...(props.imperativeTools ?? []),
    ...(props.mcp?.tools ?? []),
  ]);
  const declarativeTool = computed(() => props.declarativeTool ?? props.mcp?.declarative ?? null);
  const declarativeAttributes = computed(() => {
    const tool = declarativeTool.value;
    if (!tool || !["auto", "declarative", "both"].includes(props.mcpMode)) return {};
    return {
      toolname: tool.name,
      tooldescription: tool.description,
      toolautosubmit: tool.autoSubmit ? "" : undefined,
    };
  });

  onMounted(async () => {
    if (!props.registerMcp || !["auto", "imperative", "both"].includes(props.mcpMode) || !imperativeTools.value.length || !toolRegistry) return;
    cleanup.value = await toolRegistry.registerComponentTools({
      component: name,
      tools: imperativeTools.value,
      context: { facade, ...props.mcpContext },
    });
  });

  onBeforeUnmount(() => cleanup.value());
  return { adapter, declarativeAttributes, declarativeTool, facade, imperativeTools, toolRegistry };
}
