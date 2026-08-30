import { createPinia } from "pinia";
import { ClearDoseFacade } from "../application/facades/ClearDoseFacade";
import { createClearDoseBrowserAdapter } from "../infrastructure/adapters/createClearDoseBrowserAdapter";
import { BrowserWebMcpAdapter } from "../infrastructure/webmcp/BrowserWebMcpAdapter";
import { WebMcpToolRegistry } from "../infrastructure/webmcp/WebMcpToolRegistry";
import { createDefaultTools } from "../infrastructure/webmcp/tools/createDefaultTools";
import { DuckDbWasmDao } from "../infrastructure/persistence/DuckDbWasmDao";
import { SectionHighlightService } from "../services/ui/SectionHighlightService";
import { WorkflowRuntime } from "../services/workflows/WorkflowRuntime";
import { usePharmacyStore } from "../stores/pharmacyStore";
import { clearDoseComponents, registerClearDoseComponents } from "./componentRegistry";
import { clearDoseComponentRegistryKey, clearDoseFacadeKey, clearDoseHighlightServiceKey, clearDoseToolRegistryKey, clearDoseWorkflowRuntimeKey } from "./injectionKeys";

export function createClearDosePlugin(options = {}) {
  const pinia = options.pinia ?? createPinia();
  const dataAdapter = options.dataAdapter ?? createClearDoseBrowserAdapter(options.persistence);
  const facade = options.facade ?? new ClearDoseFacade(dataAdapter);
  const webMcpAdapter = options.webMcpAdapter ?? new BrowserWebMcpAdapter(options.webMcp);
  const toolRegistry = options.toolRegistry ?? new WebMcpToolRegistry({
    adapter: webMcpAdapter,
    namespace: options.webMcp?.namespace ?? "cleardose",
  });
  const highlightService = options.highlightService ?? new SectionHighlightService(options.highlight);
  const workflowDao = options.workflowDao ?? new DuckDbWasmDao(options.workflowDatabase);
  const workflowRuntime = options.workflowRuntime ?? new WorkflowRuntime({
    dao: workflowDao,
    channelName: options.workflowDatabase?.channelName,
  });
  const components = clearDoseComponents;

  return {
    pinia,
    facade,
    toolRegistry,
    highlightService,
    workflowRuntime,
    install(app) {
      if (!options.pinia) app.use(pinia);
      app.provide(clearDoseFacadeKey, facade);
      app.provide(clearDoseToolRegistryKey, toolRegistry);
      app.provide(clearDoseComponentRegistryKey, components);
      app.provide(clearDoseHighlightServiceKey, highlightService);
      app.provide(clearDoseWorkflowRuntimeKey, workflowRuntime);
      registerClearDoseComponents(app, { prefix: options.componentPrefix ?? "Cd" });

      const store = usePharmacyStore(pinia);
      store.configure({ facade, toolRegistry, workflowRuntime });
      store.refresh();
      void workflowRuntime.initialize({ drugs: facade.getSnapshot().state.medications })
        .then(() => workflowRuntime.seedDemoFlows());

      if (options.webMcp?.enabled !== false) {
        void toolRegistry.registerDefinitions(createDefaultTools({ store, highlightService, workflowRuntime }));
      }
    },
  };
}
