import { createPinia } from "pinia";
import { ClearDoseFacade } from "../application/facades/ClearDoseFacade";
import { createClearDoseBrowserAdapter } from "../infrastructure/adapters/createClearDoseBrowserAdapter";
import { BrowserWebMcpAdapter } from "../infrastructure/webmcp/BrowserWebMcpAdapter";
import { WebMcpToolRegistry } from "../infrastructure/webmcp/WebMcpToolRegistry";
import { createDefaultTools } from "../infrastructure/webmcp/tools/createDefaultTools";
import { DuckDbWasmDao } from "../infrastructure/persistence/DuckDbWasmDao";
import { SectionHighlightService } from "../services/ui/SectionHighlightService";
import { WorkflowRuntime } from "../services/workflows/WorkflowRuntime";
import { BrowserCapabilityTemplateDao } from "../infrastructure/persistence/BrowserCapabilityTemplateDao";
import { CapabilityTemplateService } from "../services/templates/CapabilityTemplateService";
import { usePharmacyStore } from "../stores/pharmacyStore";
import { clearDoseComponents, registerClearDoseComponents } from "./componentRegistry";
import { clearDoseCapabilityTemplateServiceKey, clearDoseComponentRegistryKey, clearDoseFacadeKey, clearDoseHighlightServiceKey, clearDoseToolRegistryKey, clearDoseWorkflowRuntimeKey } from "./injectionKeys";

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
  const capabilityTemplateDao = options.capabilityTemplateDao ?? new BrowserCapabilityTemplateDao(options.capabilityTemplates);
  const capabilityTemplateService = options.capabilityTemplateService ?? new CapabilityTemplateService({ dao: capabilityTemplateDao, toolRegistry, workflowRuntime });
  const components = clearDoseComponents;

  return {
    pinia,
    facade,
    toolRegistry,
    highlightService,
    workflowRuntime,
    capabilityTemplateService,
    install(app) {
      if (!options.pinia) app.use(pinia);
      app.provide(clearDoseFacadeKey, facade);
      app.provide(clearDoseToolRegistryKey, toolRegistry);
      app.provide(clearDoseComponentRegistryKey, components);
      app.provide(clearDoseHighlightServiceKey, highlightService);
      app.provide(clearDoseWorkflowRuntimeKey, workflowRuntime);
      app.provide(clearDoseCapabilityTemplateServiceKey, capabilityTemplateService);
      registerClearDoseComponents(app, { prefix: options.componentPrefix ?? "Cd" });

      const store = usePharmacyStore(pinia);
      store.configure({ facade, toolRegistry, workflowRuntime, capabilityTemplateService });
      store.refresh();
      const runtimeReady = workflowRuntime.initialize({ drugs: facade.getSnapshot().state.medications })
        .then(() => workflowRuntime.seedDemoFlows());

      globalThis.document?.addEventListener("submit", (event) => {
        const form = event.target;
        const toolName = form?.getAttribute?.("toolname");
        if (!toolName || form.dataset.cleardoseObserved === "true") return;
        form.dataset.cleardoseObserved = "true";
        queueMicrotask(() => { delete form.dataset.cleardoseObserved; });
        const fieldNames = [...new FormData(form).keys()];
        void workflowRuntime.recordDeclarativeForm({ name: toolName, fieldNames });
      }, true);

      if (options.webMcp?.enabled !== false) {
        const toolsReady = toolRegistry.registerDefinitions(createDefaultTools({ store, highlightService, workflowRuntime }));
        void Promise.all([runtimeReady, toolsReady]).then(() => capabilityTemplateService.initialize());
      } else {
        void runtimeReady.then(() => capabilityTemplateService.initialize());
      }
    },
  };
}
