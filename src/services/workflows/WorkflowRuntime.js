import { doctorQuestionCardExchange } from "../api/workflows/doctorQuestionCardExchange";
import { getWorkflowDefinition, workflowDefinitions } from "../api/workflows/workflowDefinitions";
import { getNegativeScenario, negativeScenarios } from "../api/mock/negativeScenarios";
import { getCapability } from "../../infrastructure/webmcp/catalog/capabilityCatalog";
import { createAgentMemoryPacket } from "../api/documents/agentMemoryPacket";
import { LocalDrugIndexApi } from "../api/local/LocalDrugIndexApi";

function copy(value) { return value == null ? value : structuredClone(value); }
function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`; }
function completedState(state, definition) { return ["error", "rejected"].includes(state) || definition?.states?.at(-1) === state; }

function boundedStrings(values, { field, minimum = 0, maximum = 8, maxLength = 220, question = false } = {}) {
  if (!Array.isArray(values) || values.length < minimum || values.length > maximum) {
    throw new TypeError(`${field} must contain ${minimum} to ${maximum} items.`);
  }
  return values.map((value, index) => {
    if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
      throw new TypeError(`${field}[${index}] must be a non-empty string no longer than ${maxLength} characters.`);
    }
    const normalized = value.trim();
    if (question && !normalized.endsWith("?")) throw new TypeError(`${field}[${index}] must be phrased as a question ending with a question mark.`);
    return normalized;
  });
}

export class WorkflowRuntime {
  constructor({ dao, channelName = "cleardose-flow-events-v1" }) {
    this.dao = dao;
    this.localDrugIndexApi = new LocalDrugIndexApi({ dao });
    this.channelName = channelName;
    this.flows = new Map();
    this.events = new Map();
    this.exchanges = new Map();
    this.cards = new Map();
    this.listeners = new Set();
    this.database = { engine: "duckdb-wasm", persistence: "initializing", state: "idle", drugCount: 0 };
    this.channel = null;
    this.readyPromise = Promise.resolve();
  }

  initialize({ drugs = [] } = {}) {
    this.readyPromise = (async () => {
      this.database = await this.dao.initialize({ drugs });
      const snapshot = await this.dao.loadSnapshot();
      snapshot.flows.forEach((item) => this.flows.set(item.id, item));
      snapshot.events.forEach((item) => this.events.set(item.id, item));
      snapshot.exchanges.forEach((item) => this.exchanges.set(item.id, item));
      snapshot.cards.forEach((item) => this.cards.set(item.id, item));
      this.openChannel();
      this.notify();
      return this.snapshot();
    })();
    return this.readyPromise;
  }

  openChannel() {
    if (typeof document === "undefined" || typeof BroadcastChannel !== "function" || this.channel) return;
    this.channel = new BroadcastChannel(this.channelName);
    this.channel.addEventListener("message", (message) => { void this.receive(message.data); });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  notify() { this.listeners.forEach((listener) => listener(this.snapshot())); }

  snapshot() {
    const flows = [...this.flows.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const events = [...this.events.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    return Object.freeze({
      database: copy(this.database),
      definitions: copy(workflowDefinitions),
      scenarios: copy(negativeScenarios),
      flows: copy(flows),
      events: copy(events),
      exchanges: copy([...this.exchanges.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))),
      cards: copy([...this.cards.values()].filter((item) => !item.artifactType || item.artifactType === "doctor-question-card").sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))),
      artifacts: copy([...this.cards.values()].sort((left, right) => String(right.updatedAt || right.createdAt).localeCompare(String(left.updatedAt || left.createdAt)))),
      memoryPackets: copy([...this.cards.values()].filter((item) => item.artifactType === "agent-memory-packet").sort((left, right) => right.createdAt.localeCompare(left.createdAt))),
    });
  }

  definitionForFlow(flow) {
    return flow?.context?.machineDefinition ?? getWorkflowDefinition(flow?.definitionId);
  }

  async startFlow({ definitionId, title, context = {}, source = "ui", flowId = id("flow") }) {
    await this.readyPromise;
    const definition = context?.machineDefinition ?? getWorkflowDefinition(definitionId);
    if (!definition) throw new TypeError(`Unknown workflow definition: ${definitionId}.`);
    const initialState = definition.states[0];
    const timestamp = now();
    const flow = {
      id: flowId,
      definitionId,
      title: String(title || definition.title).slice(0, 120),
      state: initialState,
      status: completedState(initialState, definition) ? "completed" : "active",
      context: copy(context),
      eventCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.flows.set(flow.id, flow);
    await this.recordEvent({ flowId, type: "FLOW_STARTED", toState: initialState, context, source });
    return copy(this.flows.get(flow.id));
  }

  async transition(flowId, { type, toState, context = {}, source = "ui", correlationId = "" }) {
    await this.readyPromise;
    const flow = this.flows.get(String(flowId));
    if (!flow) throw new TypeError(`Unknown workflow id: ${flowId}.`);
    const definition = this.definitionForFlow(flow);
    if (!definition.states.includes(toState)) throw new TypeError(`State ${toState} does not belong to ${flow.definitionId}.`);
    return this.recordEvent({ flowId: flow.id, type, fromState: flow.state, toState, context, source, correlationId });
  }

  async recordEvent({ flowId, type, fromState = null, toState, context = {}, source = "ui", correlationId = "" }) {
    const flow = this.flows.get(String(flowId));
    if (!flow) throw new TypeError(`Unknown workflow id: ${flowId}.`);
    const timestamp = now();
    const mergedContext = { ...flow.context, ...copy(context) };
    const event = {
      id: id("evt"), flowId: flow.id, definitionId: flow.definitionId,
      type: String(type).slice(0, 100), fromState, toState, source,
      correlationId: String(correlationId || "").slice(0, 120), context: mergedContext, createdAt: timestamp,
    };
    const nextFlow = {
      ...flow,
      state: toState,
      status: completedState(toState, this.definitionForFlow(flow)) ? (toState === "error" ? "error" : "completed") : "active",
      context: mergedContext,
      eventCount: flow.eventCount + 1,
      updatedAt: timestamp,
    };
    this.events.set(event.id, event);
    this.flows.set(flow.id, nextFlow);
    await this.dao.appendEvent(event, nextFlow);
    this.channel?.postMessage({ kind: "event", event, flow: nextFlow });
    this.notify();
    return copy(event);
  }

  async runTool(name, input, execute) {
    const correlationId = id("call");
    const capability = getCapability(name);
    const flow = await this.startFlow({
      definitionId: "webmcp-tool-call",
      title: `Tool · ${name}`,
      context: { tool: name, input: copy(input), correlationId, capabilityId: capability?.id ?? "", category: capability?.category ?? "uncategorized", interactionModel: capability?.interactionModel ?? "imperative", capabilityMachine: capability?.machine ?? null },
      source: "webmcp",
    });
    await this.transition(flow.id, { type: "TOOL_EXECUTION_STARTED", toState: "running", source: "webmcp", correlationId });
    try {
      const result = await execute();
      const isError = Boolean(result?.isError);
      await this.transition(flow.id, {
        type: isError ? "TOOL_EXECUTION_REJECTED" : "TOOL_EXECUTION_COMPLETED",
        toState: isError ? "error" : "complete",
        context: { result: copy(result?.structuredContent ?? null) },
        source: "webmcp",
        correlationId,
      });
      return result;
    } catch (error) {
      await this.transition(flow.id, {
        type: "TOOL_EXECUTION_FAILED", toState: "error",
        context: { error: error instanceof Error ? error.message : "Tool failed." }, source: "webmcp", correlationId,
      });
      throw error;
    }
  }

  async querySeededDrugs(input) { await this.readyPromise; return this.localDrugIndexApi.search(input); }
  async getSeededDrug(idValue) { await this.readyPromise; return this.localDrugIndexApi.get(idValue); }

  async recordDeclarativeForm({ name, fieldNames = [] }) {
    const capability = getCapability(name);
    const flow = await this.startFlow({
      definitionId: "agent-ready-form",
      title: `Form · ${name}`,
      context: { tool: name, capabilityId: capability?.id ?? "", interactionModel: "declarative", fieldNames: [...new Set(fieldNames)].slice(0, 20), valuesPersisted: false },
      source: "declarative-webmcp",
    });
    await this.transition(flow.id, { type: "VISIBLE_FORM_SUBMITTED", toState: "validating", source: "declarative-webmcp" });
    await this.transition(flow.id, { type: "VISIBLE_FORM_READY", toState: "ready", context: { humanSubmissionControl: true }, source: "declarative-webmcp" });
    return copy(this.flows.get(flow.id));
  }

  async startShortcut(shortcut) {
    const states = ["ready", ...shortcut.steps.map((item, index) => `step_${index + 1}_${item.id}`), "human_review", "complete"];
    return this.startDynamicMachine({
      id: `shortcut-${shortcut.id}`, title: shortcut.title, description: shortcut.summary, states,
      scope: shortcut.scope,
      context: { shortcutId: shortcut.id, mode: shortcut.mode, totalSteps: shortcut.steps.length, currentStep: 0 },
      source: "shortcut",
    });
  }

  async startDynamicMachine({ id: dynamicId, title, description = "", states, scope, context = {}, source = "dynamic" }) {
    const normalizedId = String(dynamicId || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!normalizedId) throw new TypeError("A dynamic machine id is required.");
    if (!Array.isArray(states) || states.length < 2 || new Set(states).size !== states.length || states.some((state) => !/^[a-z][a-z0-9_]*$/.test(state))) throw new TypeError("Dynamic machines need two or more unique snake_case states.");
    if (!scope?.role || !scope?.situation || !scope?.step) throw new TypeError("Dynamic machine scope requires role, situation, and step.");
    const machineId = `machine.dynamic.${normalizedId}.v1`;
    const machineDefinition = { id: machineId, machineId, title: String(title || normalizedId), description: String(description), states: [...states] };
    return this.startFlow({
      definitionId: "shortcut-runner",
      title: String(title || normalizedId),
      context: { ...context, scope: copy(scope), machineKind: "dynamic", machineDefinition },
      source,
    });
  }

  async advanceShortcut(flowId, shortcut, index) {
    const stepIndex = Math.max(0, Math.min(shortcut.steps.length - 1, Number(index) || 0));
    const step = shortcut.steps[stepIndex];
    const toState = `step_${stepIndex + 1}_${step.id}`;
    const event = await this.transition(flowId, { type: `SHORTCUT_STEP_${stepIndex + 1}_VISIBLE`, toState, context: { currentStep: stepIndex + 1, prompt: step.prompt, capabilityId: step.capabilityId }, source: "shortcut" });
    if (stepIndex === shortcut.steps.length - 1) await this.transition(flowId, { type: "HUMAN_REVIEW_REQUIRED", toState: "human_review", context: { copiedPromptRequiresUserAction: true }, source: "shortcut" });
    return event;
  }

  async completeShortcut(flowId) {
    return this.transition(flowId, { type: "SHORTCUT_REVIEW_COMPLETED", toState: "complete", context: { completedByHuman: true }, source: "shortcut" });
  }

  async preparePrescriptionFollowUp(guidance) {
    const flow = await this.startFlow({ definitionId: "prescription-follow-up", title: `Prescription follow-up · ${guidance.drug.name}`, context: { code: guidance.code, drugId: guidance.drug.id, preferredPath: guidance.preferredPath }, source: "recovery" });
    await this.transition(flow.id, { type: "FOLLOW_UP_PREPARATION_STARTED", toState: "preparing", source: "recovery" });
    await this.transition(flow.id, { type: "EDITABLE_HANDOFF_PREPARED", toState: "human_review", context: { recommendedTool: guidance.recommendedTool, editablePrompt: guidance.editablePrompt, externalActionTaken: false }, source: "recovery" });
    return { ...guidance, flowId: flow.id };
  }

  async prepareMemoryPacket(input) {
    const flow = await this.startFlow({ definitionId: "memory-packet", title: `Memory · ${input.label || "ClearDose demo"}`, context: { scope: input.scope ?? {}, externalWrite: false }, source: "memory" });
    const packet = { ...createAgentMemoryPacket(input), flowId: flow.id, status: "human_review", updatedAt: now() };
    this.cards.set(packet.id, packet);
    await this.dao.saveCard(packet);
    this.channel?.postMessage({ kind: "card", card: packet });
    await this.transition(flow.id, { type: "MEMORY_PACKET_PREPARED", toState: "human_review", context: { packetId: packet.id, factCount: packet.facts.length, userActionRequired: true }, source: "memory" });
    this.notify();
    return copy(packet);
  }

  async markMemoryExported(packetId, method) {
    const packet = this.cards.get(String(packetId));
    if (!packet || packet.artifactType !== "agent-memory-packet") throw new TypeError(`Unknown memory packet: ${packetId}.`);
    const updated = { ...packet, status: "exported", exportMethod: String(method), updatedAt: now() };
    this.cards.set(updated.id, updated); await this.dao.saveCard(updated);
    this.channel?.postMessage({ kind: "card", card: updated });
    await this.transition(updated.flowId, { type: "USER_EXPORTED_MEMORY", toState: "exported", context: { exportMethod: updated.exportMethod }, source: "memory" });
    this.notify(); return copy(updated);
  }

  async prepareDoctorQuestionCard({ primaryDrug, relatedDrugs = [], concerns = [] }) {
    if (!primaryDrug?.id) throw new TypeError("A valid primary drug record is required.");
    const normalizedConcerns = boundedStrings(concerns, { field: "concerns", minimum: 0, maximum: 6, maxLength: 160 });
    const boundedRelated = relatedDrugs.slice(0, 3).map((drug) => ({ id: drug.id, name: drug.name, fromPrice: drug.fromPrice }));
    const flow = await this.startFlow({
      definitionId: "doctor-question-card",
      title: `Question card · ${primaryDrug.name}`,
      context: { primaryDrugId: primaryDrug.id, primaryDrugName: primaryDrug.name, relatedDrugIds: boundedRelated.map((drug) => drug.id) },
      source: "exchange",
    });
    await this.transition(flow.id, { type: "SITE_CONTEXT_RESOLVED", toState: "context_ready", source: "exchange" });
    const exchangeId = id("exchange");
    const requestContext = {
      primaryDrug: {
        id: primaryDrug.id,
        name: primaryDrug.name,
        genericFor: primaryDrug.genericFor,
        drugClass: primaryDrug.drugClass,
        bestFictionalPrice: Math.min(...primaryDrug.variants.map((variant) => variant.price)),
      },
      relatedDrugs: boundedRelated,
      concerns: normalizedConcerns,
      boundaries: [
        "Discussion prompts only; related records are not therapeutic equivalents.",
        "Fictional price facts only; a licensed clinician must answer clinical questions.",
      ],
    };
    const exchange = {
      id: exchangeId,
      type: doctorQuestionCardExchange.id,
      flowId: flow.id,
      status: "awaiting_agent",
      requestContext,
      instruction: doctorQuestionCardExchange.buildInstruction({ exchangeId, primaryDrug, relatedDrugs: boundedRelated, concerns: normalizedConcerns }),
      expectedResponseSchema: doctorQuestionCardExchange.responseSchema,
      createdAt: now(),
      updatedAt: now(),
    };
    this.exchanges.set(exchange.id, exchange);
    await this.dao.saveExchange(exchange);
    this.channel?.postMessage({ kind: "exchange", exchange });
    await this.transition(flow.id, { type: "AGENT_HANDOFF_CREATED", toState: "agent_drafting", context: { exchangeId }, source: "exchange" });
    this.notify();
    return copy(exchange);
  }

  async submitDoctorQuestionCard({ exchangeId, title, questions }) {
    await this.readyPromise;
    const exchange = this.exchanges.get(String(exchangeId));
    if (!exchange || exchange.type !== doctorQuestionCardExchange.id) throw new TypeError(`Unknown doctor question card exchange: ${exchangeId}.`);
    if (exchange.status !== "awaiting_agent") throw new TypeError("This exchange already has a submitted draft.");
    const normalizedTitle = String(title || "").trim();
    if (!normalizedTitle || normalizedTitle.length > 90) throw new TypeError("title must be a non-empty string no longer than 90 characters.");
    const normalizedQuestions = boundedStrings(questions, { field: "questions", minimum: 2, maximum: 8, maxLength: 220, question: true });
    const context = exchange.requestContext;
    const priceFacts = [
      `${context.primaryDrug.name}: fictional indexed packages from $${context.primaryDrug.bestFictionalPrice.toFixed(2)}.`,
      ...context.relatedDrugs.map((drug) => `${drug.name}: fictional indexed packages from $${Number(drug.fromPrice).toFixed(2)}.`),
    ];
    const timestamp = now();
    const card = {
      id: id("card"),
      artifactType: "doctor-question-card",
      exchangeId: exchange.id,
      flowId: exchange.flowId,
      status: "human_review",
      title: normalizedTitle,
      summary: `Patient-owned discussion prompts about ${context.primaryDrug.name}${context.relatedDrugs.length ? ` and ${context.relatedDrugs.map((drug) => drug.name).join(", ")}` : ""}.`,
      questions: normalizedQuestions,
      priceFacts,
      drugNames: [context.primaryDrug.name, ...context.relatedDrugs.map((drug) => drug.name)],
      disclaimer: "Draft questions and fictional price facts only. Not medical advice. Review this card and discuss medication decisions with a licensed clinician or pharmacist.",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.cards.set(card.id, card);
    const updatedExchange = { ...exchange, status: "draft_received", updatedAt: timestamp };
    this.exchanges.set(exchange.id, updatedExchange);
    await Promise.all([this.dao.saveCard(card), this.dao.saveExchange(updatedExchange)]);
    this.channel?.postMessage({ kind: "card", card, exchange: updatedExchange });
    await this.transition(exchange.flowId, {
      type: "STRUCTURED_DRAFT_RECEIVED",
      toState: "human_review",
      context: { cardId: card.id, questionCount: card.questions.length },
      source: "exchange",
    });
    this.notify();
    return copy(card);
  }

  async markCardReviewed(cardId) {
    await this.readyPromise;
    const card = this.cards.get(String(cardId));
    if (!card) throw new TypeError(`Unknown generated card: ${cardId}.`);
    const updatedCard = { ...card, status: "reviewed", updatedAt: now() };
    this.cards.set(card.id, updatedCard);
    await this.dao.saveCard(updatedCard);
    await this.transition(card.flowId, { type: "PATIENT_REVIEW_COMPLETED", toState: "complete", context: { cardId: card.id }, source: "ui" });
    this.channel?.postMessage({ kind: "card", card: updatedCard });
    this.notify();
    return copy(updatedCard);
  }

  inspect({ flowId = "", limit = 40 } = {}) {
    const boundedLimit = Math.max(1, Math.min(100, Number(limit) || 40));
    const flows = flowId ? [this.flows.get(String(flowId))].filter(Boolean) : [...this.flows.values()];
    const selectedIds = new Set(flows.map((flow) => flow.id));
    const events = [...this.events.values()].filter((event) => selectedIds.has(event.flowId)).slice(-boundedLimit);
    const artifacts = [...this.cards.values()].filter((card) => selectedIds.has(card.flowId));
    return {
      database: copy(this.database), flows: copy(flows), events: copy(events),
      cards: copy(artifacts.filter((item) => !item.artifactType || item.artifactType === "doctor-question-card")),
      artifacts: copy(artifacts),
      memoryPackets: copy(artifacts.filter((item) => item.artifactType === "agent-memory-packet")),
    };
  }

  async seedDemoFlows() {
    await this.readyPromise;
    if (this.flows.size) return this.snapshot();
    const discovery = await this.startFlow({ definitionId: "medication-discovery", title: "Lisinopril discovery", context: { query: "lisinopril" }, source: "seed" });
    await this.transition(discovery.id, { type: "SEARCH_SUBMITTED", toState: "searching", source: "seed" });
    await this.transition(discovery.id, { type: "UDI_MATCH_SELECTED", toState: "matched", context: { drugId: "med_lisinopril", resultCount: 1 }, source: "seed" });
    const plan = await this.startFlow({ definitionId: "procurement-plan", title: "Two-item local plan", context: { strategy: "lowest_total", itemCount: 2 }, source: "seed" });
    await this.transition(plan.id, { type: "PLAN_REQUESTED", toState: "planning", source: "seed" });
    return this.snapshot();
  }

  async runNegativeScenario(scenarioId) {
    await this.readyPromise;
    const scenario = getNegativeScenario(scenarioId);
    if (!scenario) throw new TypeError(`Unknown demo failure scenario: ${scenarioId}.`);
    const flow = await this.startFlow({
      definitionId: scenario.definitionId,
      title: scenario.title,
      context: { scenarioId: scenario.id, demoOnly: true },
      source: "scenario",
    });
    for (const transition of scenario.transitions) {
      await this.transition(flow.id, { ...transition, source: "scenario" });
    }
    return copy(this.flows.get(flow.id));
  }

  async clear() {
    await this.readyPromise;
    this.flows.clear(); this.events.clear(); this.exchanges.clear(); this.cards.clear();
    await this.dao.clearWorkflowData();
    this.channel?.postMessage({ kind: "clear" });
    this.notify();
  }

  async receive(message) {
    if (!message || typeof message !== "object") return;
    if (message.kind === "clear") {
      this.flows.clear(); this.events.clear(); this.exchanges.clear(); this.cards.clear();
      await this.dao.clearWorkflowData();
      this.notify();
      return;
    }
    if (message.kind === "event" && message.event && message.flow && !this.events.has(message.event.id)) {
      this.events.set(message.event.id, message.event);
      this.flows.set(message.flow.id, message.flow);
      await this.dao.appendEvent(message.event, message.flow);
    }
    if (message.kind === "exchange" && message.exchange) {
      this.exchanges.set(message.exchange.id, message.exchange);
      await this.dao.saveExchange(message.exchange);
    }
    if (message.kind === "card" && message.card) {
      this.cards.set(message.card.id, message.card);
      await this.dao.saveCard(message.card);
      if (message.exchange) { this.exchanges.set(message.exchange.id, message.exchange); await this.dao.saveExchange(message.exchange); }
    }
    this.notify();
  }
}
