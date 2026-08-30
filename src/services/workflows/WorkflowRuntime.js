import { doctorQuestionCardExchange } from "../api/workflows/doctorQuestionCardExchange";
import { getWorkflowDefinition, workflowDefinitions } from "../api/workflows/workflowDefinitions";
import { getNegativeScenario, negativeScenarios } from "../api/mock/negativeScenarios";

function copy(value) { return value == null ? value : structuredClone(value); }
function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`; }
function completedState(state) { return ["ready", "complete", "error", "rejected"].includes(state); }

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
      cards: copy([...this.cards.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))),
    });
  }

  async startFlow({ definitionId, title, context = {}, source = "ui", flowId = id("flow") }) {
    await this.readyPromise;
    const definition = getWorkflowDefinition(definitionId);
    if (!definition) throw new TypeError(`Unknown workflow definition: ${definitionId}.`);
    const initialState = definition.states[0];
    const timestamp = now();
    const flow = {
      id: flowId,
      definitionId,
      title: String(title || definition.title).slice(0, 120),
      state: initialState,
      status: completedState(initialState) ? "completed" : "active",
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
    const definition = getWorkflowDefinition(flow.definitionId);
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
      status: completedState(toState) ? (toState === "error" ? "error" : "completed") : "active",
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
    const flow = await this.startFlow({
      definitionId: "webmcp-tool-call",
      title: `Tool · ${name}`,
      context: { tool: name, input: copy(input), correlationId },
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
    return { database: copy(this.database), flows: copy(flows), events: copy(events), cards: copy([...this.cards.values()].filter((card) => selectedIds.has(card.flowId))) };
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
