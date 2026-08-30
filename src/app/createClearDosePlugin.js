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
import { ProgrammaticReplayRuntime } from "../services/workflows/ProgrammaticReplayRuntime";
import { BoundedObservationService } from "../services/ui/BoundedObservationService";
import { DeclarativeToolRunner } from "../services/ui/DeclarativeToolRunner";
import { ReplayDomProjectionService } from "../services/ui/ReplayDomProjectionService";
import { usePharmacyStore } from "../stores/pharmacyStore";
import { clearDoseComponents, registerClearDoseComponents } from "./componentRegistry";
import { clearDoseCapabilityTemplateServiceKey, clearDoseComponentRegistryKey, clearDoseDeclarativeToolRunnerKey, clearDoseFacadeKey, clearDoseHighlightServiceKey, clearDoseReplayRuntimeKey, clearDoseToolRegistryKey, clearDoseWorkflowRuntimeKey } from "./injectionKeys";

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
    drugOperations: facade,
    channelName: options.workflowDatabase?.channelName,
  });
  workflowRuntime.configureDrugIndexOperations?.(facade);
  const capabilityTemplateDao = options.capabilityTemplateDao ?? new BrowserCapabilityTemplateDao(options.capabilityTemplates);
  const capabilityTemplateService = options.capabilityTemplateService ?? new CapabilityTemplateService({ dao: capabilityTemplateDao, toolRegistry, workflowRuntime });
  const declarativeToolRunner = options.declarativeToolRunner ?? new DeclarativeToolRunner();
  const replayProjection = options.replayProjection ?? new ReplayDomProjectionService(options.replayProjectionOptions);
  const components = clearDoseComponents;
  let replayRuntime = options.replayRuntime ?? null;

  return {
    pinia,
    facade,
    toolRegistry,
    highlightService,
    workflowRuntime,
    get replayRuntime() { return replayRuntime; },
    declarativeToolRunner,
    capabilityTemplateService,
    install(app) {
      if (!options.pinia) app.use(pinia);
      app.provide(clearDoseFacadeKey, facade);
      app.provide(clearDoseToolRegistryKey, toolRegistry);
      app.provide(clearDoseComponentRegistryKey, components);
      app.provide(clearDoseHighlightServiceKey, highlightService);
      app.provide(clearDoseWorkflowRuntimeKey, workflowRuntime);
      app.provide(clearDoseCapabilityTemplateServiceKey, capabilityTemplateService);
      const store = usePharmacyStore(pinia);
      const sectionState = (name) => {
        const element = globalThis.document?.querySelector?.(`[data-agent-section="${name}"]`);
        return { present: Boolean(element), focused: Boolean(element && element.contains(globalThis.document?.activeElement)) };
      };
      const workflowState = () => store.replayObservation().workflow;
      const observations = options.replayObservations ?? new BoundedObservationService({
        readers: {
          cart: () => store.replayObservation().cart,
          workflow: () => store.replayObservation().workflow,
          webMcp: () => store.replayObservation().webMcp,
          route: () => ({ hash: globalThis.location?.hash ?? "", pathname: globalThis.location?.pathname ?? "" }),
          "route.current": () => ({ hash: globalThis.location?.hash ?? "", pathname: globalThis.location?.pathname ?? "" }),
          "cart.summary": () => store.replayObservation().cart,
          "workflow.current": workflowState,
          "workflow.history": () => ({ eventCount: store.workflow.events.length, recentEventIds: store.workflow.events.slice(-8).map((event) => event.id) }),
          "workflow.actions": () => {
            const flowId = store.selectedFlowId || store.workflow.flows[0]?.id;
            return flowId ? store.getAvailableWorkflowActions({ flowId }) : { valid: [], disabled: [] };
          },
          "drug-search.results": () => ({ ...sectionState("udi-results"), visibleMedicationCards: globalThis.document?.querySelectorAll?.(".medication-card,.udi-result-list button")?.length ?? 0 }),
          "drug-search.selection": () => ({ ...sectionState("udi-results"), selectedResult: globalThis.document?.querySelector?.(".udi-result-list button.selected")?.getAttribute?.("data-drug-id") ?? "" }),
          "comparison.compatibility": () => sectionState("comparison-results"),
          "comparison.selection": () => ({ ...sectionState("comparison-results"), selectedControls: globalThis.document?.querySelectorAll?.(".comparison-form select")?.length ?? 0 }),
          "comparison.results": () => ({ ...sectionState("comparison-results"), visibleCards: globalThis.document?.querySelectorAll?.(".comparison-drug-card")?.length ?? 0 }),
          "availability.location": () => sectionState("availability-results"),
          "availability.offers": () => ({ ...sectionState("availability-results"), visibleOffers: globalThis.document?.querySelectorAll?.("[data-availability-offer]")?.length ?? 0 }),
          "availability.results": () => sectionState("availability-results"),
          "availability.delivery": () => sectionState("availability-results"),
          "replay.visibleAction": () => replayProjection.snapshot(),
          "doctor.context": () => sectionState("provider-handoff"),
          "doctor.exchange": () => ({ ...sectionState("question-card"), exchangeCount: store.workflow.exchanges.length }),
          "doctor.card": () => ({ ...sectionState("question-card"), cardCount: store.workflow.cards.length, latestStatus: store.workflow.cards[0]?.status ?? "" }),
          focus: () => {
            const element = globalThis.document?.activeElement;
            return { id: element?.id ?? "", name: element?.getAttribute?.("name") ?? "", section: element?.closest?.("[data-agent-section]")?.getAttribute?.("data-agent-section") ?? "" };
          },
          visibleSections: () => [...(globalThis.document?.querySelectorAll?.("[data-agent-section]") ?? [])].slice(0, 30).map((element) => element.getAttribute("data-agent-section")),
        },
      });
      const replayHooks = {
        onRunStart: async ({ scenario, state: replayState }) => {
          const flow = await workflowRuntime.startFlow({ definitionId: "programmatic-replay", title: `Replay: ${scenario.title}`, context: { scenarioId: scenario.id, route: replayState.route, mocked: true }, source: "programmatic-replay" });
          await workflowRuntime.transition(flow.id, { type: "REPLAY_STARTED", toState: "running", context: { runId: replayState.runId }, source: "programmatic-replay" });
          store.selectWorkflow(flow.id);
          return { flowId: flow.id };
        },
        onStepStart: async ({ state: replayState, step, request }) => {
          if (!replayState.workflowFlowId) return;
          await workflowRuntime.recordEvent({ flowId: replayState.workflowFlowId, type: "REPLAY_STEP_STARTED", fromState: "running", toState: "running", context: { stepId: step.id, kind: step.kind ?? "tool", toolName: step.toolName ?? "", request }, source: step.kind === "action" ? "dom" : "programmatic-replay" });
        },
        onStepComplete: async ({ state: replayState, step, trace }) => {
          if (!replayState.workflowFlowId) return;
          const replayFlowState = replayState.status === "paused" ? "paused" : "running";
          const eventType = replayFlowState === "paused" ? "REPLAY_PAUSED_STEP_COMPLETED" : trace.status === "expected-error" ? "REPLAY_FAILURE_OBSERVED" : "REPLAY_STEP_COMPLETED";
          await workflowRuntime.recordEvent({ flowId: replayState.workflowFlowId, type: eventType, fromState: replayFlowState, toState: replayFlowState, context: { stepId: step.id, toolName: trace.toolName, elapsedMs: trace.elapsedMs, changes: trace.changes, mocked: trace.mocked, recovery: trace.recovery, expectedFailure: trace.status === "expected-error" }, source: trace.status === "expected-error" ? "failure" : "programmatic-replay" });
        },
        onRunPause: async ({ state: replayState }) => replayState.workflowFlowId && workflowRuntime.recordEvent({ flowId: replayState.workflowFlowId, type: "REPLAY_PAUSED", fromState: "running", toState: "paused", context: { nextStepIndex: replayState.nextStepIndex }, source: "programmatic-replay" }),
        onRunResume: async ({ state: replayState }) => replayState.workflowFlowId && workflowRuntime.recordEvent({ flowId: replayState.workflowFlowId, type: "REPLAY_RESUMED", fromState: "paused", toState: "running", context: { nextStepIndex: replayState.nextStepIndex }, source: "programmatic-replay" }),
        onRunComplete: async ({ state: replayState }) => replayState.workflowFlowId && workflowRuntime.recordEvent({ flowId: replayState.workflowFlowId, type: "REPLAY_COMPLETED", fromState: "running", toState: "complete", context: { totalElapsedMs: replayState.totalElapsedMs, stepCount: replayState.steps.length }, source: "programmatic-replay" }),
        onRunError: async ({ state: replayState, trace }) => replayState.workflowFlowId && workflowRuntime.recordEvent({ flowId: replayState.workflowFlowId, type: "REPLAY_FAILED", fromState: "running", toState: "error", context: { stepId: trace.id, code: trace.error?.code ?? "REPLAY_FAILED", recovery: trace.recovery }, source: "failure" }),
      };
      replayRuntime ??= new ProgrammaticReplayRuntime({
        toolRegistry,
        invokeAction: async (action, request) => {
          if (action !== "invoke-declarative-webmcp") throw new TypeError(`Unknown replay action: ${action}.`);
          return declarativeToolRunner.invoke(request.toolName, request.arguments);
        },
        observations,
        highlight: (target) => highlightService.highlight(target),
        projectVisibleAction: (payload) => replayProjection.project(payload),
        resetSeed: async () => {
          replayProjection.reset();
          store.resetDemo();
          await workflowRuntime.clear();
          await workflowRuntime.seedDemoFlows();
        },
        hooks: replayHooks,
      });
      app.provide(clearDoseReplayRuntimeKey, replayRuntime);
      app.provide(clearDoseDeclarativeToolRunnerKey, declarativeToolRunner);
      registerClearDoseComponents(app, { prefix: options.componentPrefix ?? "Cd" });

      store.configure({ facade, toolRegistry, workflowRuntime, replayRuntime, declarativeToolRunner, capabilityTemplateService });
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
