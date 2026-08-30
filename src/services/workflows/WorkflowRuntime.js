import { doctorQuestionCardExchange } from "../api/workflows/doctorQuestionCardExchange";
import { getWorkflowDefinition, workflowDefinitions } from "../api/workflows/workflowDefinitions";
import { getNegativeScenario, negativeScenarios } from "../api/mock/negativeScenarios";
import { getCapability } from "../../infrastructure/webmcp/catalog/capabilityCatalog";
import { createAgentMemoryPacket } from "../api/documents/agentMemoryPacket";
import { LocalDrugIndexApi } from "../api/local/LocalDrugIndexApi";
import { createSequentialTransitions, defineWorkflow, EMPTY_INPUT_SCHEMA, stateDetails, transitionAcceptsAction } from "../api/workflows/workflowStateContracts";

function copy(value) { return value == null ? value : structuredClone(value); }
function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`; }
function clock() { return globalThis.performance?.now?.() ?? Date.now(); }
function elapsed(started) { return Math.max(0, Math.round((clock() - started) * 100) / 100); }
function flowStatus(state, definition) {
  const meta = stateDetails(definition, state);
  if (meta.error) return "error";
  return meta.terminal ? "completed" : "active";
}

const SENSITIVE_CONTEXT_KEYS = /(password|passcode|secret|token|authorization|zip|postal|location|address|latitude|longitude|(^|_)lat($|_)|(^|_)lng($|_))/i;
const TRACE_SAFE_STRING_KEYS = new Set([
  "action", "artifactid", "availability", "capabilityid", "cardid", "category", "code", "correlationid", "currency",
  "definitionid", "drugid", "drugids", "eventid", "exchangeid", "field", "fieldnames", "flowid", "form", "fulfillmentmode",
  "id", "ids", "interactionmodel", "kind", "locationid", "machineid", "method", "mode", "offerid", "packetid", "providerid",
  "purpose", "reasoncode", "requestid", "route", "source", "state", "status", "strategy", "strength", "templateid", "tool", "type",
  "variantid", "variantids",
]);

function normalizedContextKey(value) { return String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase(); }

function omittedTraceValue(value) {
  if (Array.isArray(value)) return { omitted: true, count: value.length };
  if (value && typeof value === "object") return { omitted: true };
  return "[omitted]";
}

function boundedTracePayload(value, { depth = 0, seen = new WeakSet(), parentKey = "" } = {}) {
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") {
    return TRACE_SAFE_STRING_KEYS.has(normalizedContextKey(parentKey)) ? value.slice(0, 160) : "[omitted]";
  }
  if (typeof value !== "object") return undefined;
  if (depth >= 6) return "[bounded]";
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (value instanceof Date) {
    seen.delete(value);
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    if (!TRACE_SAFE_STRING_KEYS.has(normalizedContextKey(parentKey))) {
      seen.delete(value);
      return omittedTraceValue(value);
    }
    const result = value.slice(0, 24).map((item) => boundedTracePayload(item, { depth: depth + 1, seen, parentKey }));
    seen.delete(value);
    return result;
  }
  const result = {};
  for (const [key, item] of Object.entries(value).slice(0, 48)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) continue;
    result[key] = SENSITIVE_CONTEXT_KEYS.test(key)
      ? omittedTraceValue(item)
      : boundedTracePayload(item, { depth: depth + 1, seen, parentKey: key });
  }
  seen.delete(value);
  return result;
}

function boundedContext(value, { depth = 0, seen = new WeakSet() } = {}) {
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "string") return value.slice(0, 500);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return undefined;
  if (depth >= 8) return "[bounded]";
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (value instanceof Date) {
    const result = value.toISOString();
    seen.delete(value);
    return result;
  }
  if (Array.isArray(value)) {
    const result = value.slice(0, 24).map((item) => boundedContext(item, { depth: depth + 1, seen }));
    seen.delete(value);
    return result;
  }
  const result = {};
  for (const [key, item] of Object.entries(value).slice(0, 48)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) continue;
    result[key] = SENSITIVE_CONTEXT_KEYS.test(key) ? "[redacted]" : boundedContext(item, { depth: depth + 1, seen });
  }
  seen.delete(value);
  return result;
}

function plainRecord(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function safeChannelId(value, prefixes) {
  const normalized = String(value || "");
  return prefixes.some((prefix) => normalized.startsWith(prefix)) && /^[a-z]+_[a-zA-Z0-9._:-]{1,180}$/.test(normalized) ? normalized : "";
}
function safeChannelToken(value, { allowEmpty = false, maximum = 120 } = {}) {
  const normalized = String(value || "");
  if (allowEmpty && !normalized) return "";
  return normalized.length <= maximum && /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(normalized) ? normalized : "";
}
function safeChannelTimestamp(value) {
  const normalized = String(value || "");
  return normalized.length <= 40 && Number.isFinite(Date.parse(normalized)) ? normalized : "";
}
function safeScopePart(value, fallback) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return normalized || fallback;
}
function safeIncomingDynamicDefinition(value) {
  if (!plainRecord(value)) return null;
  const machineId = String(value.machineId || value.id || "");
  if (!/^machine\.dynamic\.[a-z][a-z0-9-]*\.v1$/.test(machineId)) return null;
  const baseId = machineId.replace(/^machine\.dynamic\./, "").replace(/\.v1$/, "");
  const states = Array.isArray(value.states) ? value.states.slice(0, 20).map(String) : [];
  const transitions = Array.isArray(value.transitions) ? value.transitions.slice(0, 60).map((transition) => ({
    action: transition?.action,
    aliases: Array.isArray(transition?.aliases) ? transition.aliases.slice(0, 20) : [],
    from: Array.isArray(transition?.from) ? transition.from.slice(0, 20) : transition?.from,
    to: transition?.to,
    label: String(transition?.action || "").toLowerCase().replaceAll("_", " "),
    description: "Validated transition received from another ClearDose tab.",
    trigger: transition?.humanOnly ? "human" : "user-or-agent",
    inputSchema: EMPTY_INPUT_SCHEMA,
    relatedCapabilityId: safeChannelToken(transition?.relatedCapabilityId, { allowEmpty: true, maximum: 160 }),
    relatedTool: safeChannelToken(transition?.relatedTool, { allowEmpty: true, maximum: 160 }),
    humanOnly: Boolean(transition?.humanOnly),
    recovery: Boolean(transition?.recovery),
  })) : [];
  const scope = {
    role: safeScopePart(value.scope?.role, "local-user"),
    situation: safeScopePart(value.scope?.situation, "cross-tab"),
    step: safeScopePart(value.scope?.step, "review"),
  };
  try {
    const normalized = defineWorkflow({
      id: baseId,
      title: "Validated dynamic workflow",
      description: "Dynamic state definition received from another ClearDose tab.",
      states,
      initialState: value.initialState,
      stateMeta: Object.fromEntries(states.map((state) => [state, {
        terminal: Boolean(value.stateMeta?.[state]?.terminal),
        error: Boolean(value.stateMeta?.[state]?.error),
        recovery: Boolean(value.stateMeta?.[state]?.recovery),
      }])),
      transitions,
    });
    return { ...copy(normalized), id: machineId, machineId, scope, kind: "dynamic" };
  } catch {
    return null;
  }
}

function runtimeCounts(runtime, { pendingEvents = 0 } = {}) {
  return { flows: runtime.flows.size, events: runtime.events.size + pendingEvents, exchanges: runtime.exchanges.size, artifacts: runtime.cards.size };
}

function compareRecent(left, right) {
  const timestamp = String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || ""));
  return timestamp || String(left.id || "").localeCompare(String(right.id || ""));
}

function compareChronological(left, right) {
  const timestamp = String(left.createdAt || left.updatedAt || "").localeCompare(String(right.createdAt || right.updatedAt || ""));
  const version = Number(left.version ?? left.context?.__runtime?.eventVersion ?? 0) - Number(right.version ?? right.context?.__runtime?.eventVersion ?? 0);
  return timestamp || version || String(left.id || "").localeCompare(String(right.id || ""));
}

function boundedCount(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(12, Math.trunc(parsed))) : fallback;
}

function memoryPacketPersistenceSummary(packet) {
  const createdAt = Number.isFinite(Date.parse(String(packet?.createdAt || ""))) ? String(packet.createdAt).slice(0, 40) : now();
  const updatedAt = Number.isFinite(Date.parse(String(packet?.updatedAt || ""))) ? String(packet.updatedAt).slice(0, 40) : createdAt;
  const counts = packet?.counts ?? {};
  const exportMethod = String(packet?.exportMethod || "").trim().replace(/[^a-z0-9_-]+/gi, "-").slice(0, 40);
  return {
    id: String(packet?.id || id("memory")).slice(0, 190),
    artifactType: "agent-memory-packet",
    flowId: String(packet?.flowId || "").slice(0, 190),
    status: packet?.status === "exported" ? "exported" : "human_review",
    counts: {
      facts: boundedCount(counts.facts, Array.isArray(packet?.facts) ? packet.facts.length : 0),
      decisions: boundedCount(counts.decisions, Array.isArray(packet?.decisions) ? packet.decisions.length : 0),
      nextSteps: boundedCount(counts.nextSteps, Array.isArray(packet?.nextSteps) ? packet.nextSteps.length : 0),
      flowReferences: boundedCount(counts.flowReferences, Array.isArray(packet?.flowIds) ? packet.flowIds.length : 0),
    },
    authoredTextStored: false,
    contentStored: false,
    ...(exportMethod ? { exportMethod } : {}),
    createdAt,
    updatedAt,
  };
}

export class WorkflowStateError extends Error {
  constructor(code, message, { retryable = false, recommendedTool = "", details = {} } = {}) {
    super(message);
    this.name = "WorkflowStateError";
    this.code = String(code);
    this.retryable = Boolean(retryable);
    this.recommendedTool = String(recommendedTool || "");
    this.details = boundedContext(details);
  }

  toStructuredContent() {
    return {
      ok: false,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      recommendedTool: this.recommendedTool || undefined,
      ...this.details,
    };
  }
}

function stateError(code, message, options) { return new WorkflowStateError(code, message, options); }

function validateSchema(value, schema, path = "input") {
  const type = schema?.type;
  if (type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw stateError("INVALID_ACTION_INPUT", `${path} must be an object.`, { details: { field: path } });
    const properties = schema.properties ?? {};
    const unknown = Object.keys(value).find((key) => !(key in properties));
    if (schema.additionalProperties === false && unknown) throw stateError("INVALID_ACTION_INPUT", `Unknown field ${path}.${unknown}.`, { details: { field: `${path}.${unknown}` } });
    for (const required of schema.required ?? []) {
      if (value[required] == null || value[required] === "") throw stateError("INVALID_ACTION_INPUT", `${path}.${required} is required.`, { details: { field: `${path}.${required}` } });
    }
    Object.entries(value).forEach(([key, item]) => { if (properties[key]) validateSchema(item, properties[key], `${path}.${key}`); });
    return;
  }
  if (type === "array") {
    if (!Array.isArray(value)) throw stateError("INVALID_ACTION_INPUT", `${path} must be an array.`, { details: { field: path } });
    if (schema.minItems != null && value.length < schema.minItems) throw stateError("INVALID_ACTION_INPUT", `${path} needs at least ${schema.minItems} items.`, { details: { field: path } });
    if (schema.maxItems != null && value.length > schema.maxItems) throw stateError("INVALID_ACTION_INPUT", `${path} allows at most ${schema.maxItems} items.`, { details: { field: path } });
    value.forEach((item, index) => validateSchema(item, schema.items ?? {}, `${path}[${index}]`));
    return;
  }
  if (type === "string" && typeof value !== "string") throw stateError("INVALID_ACTION_INPUT", `${path} must be a string.`, { details: { field: path } });
  if (type === "integer" && !Number.isInteger(value)) throw stateError("INVALID_ACTION_INPUT", `${path} must be an integer.`, { details: { field: path } });
  if (type === "number" && (typeof value !== "number" || !Number.isFinite(value))) throw stateError("INVALID_ACTION_INPUT", `${path} must be a number.`, { details: { field: path } });
  if (type === "boolean" && typeof value !== "boolean") throw stateError("INVALID_ACTION_INPUT", `${path} must be a boolean.`, { details: { field: path } });
  if (schema?.enum && !schema.enum.includes(value)) throw stateError("INVALID_ACTION_INPUT", `${path} is not an allowed value.`, { details: { field: path, allowed: schema.enum } });
  if (typeof value === "string" && schema?.minLength != null && value.trim().length < schema.minLength) throw stateError("INVALID_ACTION_INPUT", `${path} is too short.`, { details: { field: path } });
  if (typeof value === "string" && schema?.maxLength != null && value.length > schema.maxLength) throw stateError("INVALID_ACTION_INPUT", `${path} is too long.`, { details: { field: path } });
  if (typeof value === "number" && schema?.minimum != null && value < schema.minimum) throw stateError("INVALID_ACTION_INPUT", `${path} is below the minimum.`, { details: { field: path } });
  if (typeof value === "number" && schema?.maximum != null && value > schema.maximum) throw stateError("INVALID_ACTION_INPUT", `${path} exceeds the maximum.`, { details: { field: path } });
}

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
  constructor({ dao, drugOperations = null, channelName = "cleardose-flow-events-v1" }) {
    this.dao = dao;
    this.localDrugIndexApi = new LocalDrugIndexApi({ dao, operations: drugOperations });
    this.channelName = channelName;
    this.flows = new Map();
    this.events = new Map();
    this.exchanges = new Map();
    this.cards = new Map();
    this.dynamicDefinitions = new Map();
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
      for (const item of snapshot.cards) {
        const stored = item.artifactType === "agent-memory-packet" ? memoryPacketPersistenceSummary(item) : item;
        this.cards.set(stored.id, stored);
        if (item.artifactType === "agent-memory-packet" && JSON.stringify(stored) !== JSON.stringify(item)) await this.dao.saveCard(stored);
      }
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
      definitions: copy([...workflowDefinitions, ...this.dynamicDefinitions.values()]),
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

  requireFlow(flowId) {
    const flow = this.flows.get(String(flowId));
    if (!flow) throw stateError("UNKNOWN_FLOW", `Unknown workflow id: ${flowId}.`, { retryable: true, recommendedTool: "cleardose_inspect_workflow_runtime", details: { flowId: String(flowId || "") } });
    return flow;
  }

  requireDefinition(flow) {
    const definition = this.definitionForFlow(flow);
    if (!definition) throw stateError("UNKNOWN_WORKFLOW_DEFINITION", `Unknown workflow definition: ${flow?.definitionId}.`, { details: { definitionId: flow?.definitionId ?? "" } });
    return definition;
  }

  transitionFor(definition, state, action, toState = "") {
    return definition.transitions?.find((transition) => transition.from.includes(state)
      && transitionAcceptsAction(transition, action)
      && (!toState || transition.to === toState)) ?? null;
  }

  assertVersion(flow, expectedVersion) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw stateError("INVALID_STATE_VERSION", "expectedVersion must be a positive integer.", { details: { expectedVersion } });
    }
    if (flow.eventCount !== expectedVersion) {
      throw stateError("STALE_STATE_VERSION", `Workflow ${flow.id} is at version ${flow.eventCount}, not ${expectedVersion}.`, {
        retryable: true,
        recommendedTool: "cleardose_inspect_workflow_state",
        details: { flowId: flow.id, expectedVersion, currentVersion: flow.eventCount, currentState: flow.state },
      });
    }
  }

  assertRequestId(flow, requestId) {
    const normalized = String(requestId || "").trim();
    if (!normalized || normalized.length > 120 || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(normalized)) {
      throw stateError("INVALID_REQUEST_ID", "requestId must be 1 to 120 safe identifier characters.", { details: { field: "requestId" } });
    }
    const duplicate = [...this.events.values()].find((event) => event.flowId === flow.id && event.correlationId === normalized);
    if (duplicate) {
      throw stateError("DUPLICATE_ACTION", `Request ${normalized} was already applied to ${flow.id}.`, {
        retryable: false,
        recommendedTool: "cleardose_get_workflow_history",
        details: { flowId: flow.id, requestId: normalized, eventId: duplicate.id, currentVersion: flow.eventCount },
      });
    }
    return normalized;
  }

  async startFlow({ definitionId, title, context = {}, source = "ui", flowId = id("flow") }) {
    await this.readyPromise;
    const embeddedDefinition = context?.machineDefinition;
    const embeddedId = embeddedDefinition?.machineId ?? embeddedDefinition?.id;
    const definition = embeddedDefinition ? this.dynamicDefinitions.get(String(embeddedId)) : getWorkflowDefinition(definitionId);
    if (!definition) throw stateError("UNKNOWN_WORKFLOW_DEFINITION", `Unknown workflow definition: ${definitionId}.`, { details: { definitionId } });
    const initialState = definition.initialState ?? definition.states[0];
    const boundedInitialContext = boundedContext(embeddedDefinition ? { ...context, machineDefinition: definition } : context);
    const initialContext = boundedInitialContext && typeof boundedInitialContext === "object" && !Array.isArray(boundedInitialContext) ? boundedInitialContext : {};
    const persistedContext = { ...initialContext, __runtime: { initialContext, resetCount: 0 } };
    const timestamp = now();
    const flow = {
      id: flowId,
      definitionId,
      title: String(title || definition.title).slice(0, 120),
      state: initialState,
      status: flowStatus(initialState, definition),
      context: persistedContext,
      eventCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.flows.set(flow.id, flow);
    await this.recordEvent({ flowId, type: "FLOW_STARTED", toState: initialState, context: {}, source });
    return copy(this.flows.get(flow.id));
  }

  async transition(flowId, { type, toState, context = {}, source = "ui", correlationId = "" }) {
    await this.readyPromise;
    const flow = this.requireFlow(flowId);
    const definition = this.requireDefinition(flow);
    const currentMeta = stateDetails(definition, flow.state);
    if (currentMeta.terminal) throw stateError("TERMINAL_STATE", `Workflow ${flow.id} is already terminal at ${flow.state}.`, { recommendedTool: "cleardose_inspect_workflow_state", details: { flowId: flow.id, currentState: flow.state, currentVersion: flow.eventCount } });
    const transition = this.transitionFor(definition, flow.state, type, toState);
    if (!transition) {
      throw stateError("INVALID_TRANSITION", `${type} cannot move ${flow.definitionId} from ${flow.state} to ${toState}.`, {
        retryable: true,
        recommendedTool: "cleardose_get_available_workflow_actions",
        details: { flowId: flow.id, action: String(type || ""), fromState: flow.state, toState, currentVersion: flow.eventCount },
      });
    }
    if (transition.humanOnly && !["ui", "human"].includes(String(source))) {
      throw stateError("ACTION_REQUIRES_HUMAN", `${transition.action} requires a visible human action.`, { details: { flowId: flow.id, action: transition.action, currentState: flow.state } });
    }
    return this.recordEvent({ flowId: flow.id, type, fromState: flow.state, toState, context, source, correlationId });
  }

  async recordEvent({ flowId, type, fromState = null, toState, context = {}, source = "ui", correlationId = "", replaceContext = false }) {
    const flow = this.requireFlow(flowId);
    const definition = this.requireDefinition(flow);
    const normalizedType = String(type || "").trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_]*$/.test(normalizedType)) throw stateError("INVALID_EVENT_TYPE", "Workflow event types must use UPPER_SNAKE_CASE.", { details: { type } });
    if (!definition.states.includes(toState)) {
      throw stateError("INVALID_TRANSITION", `${toState || "(empty)"} is not a state in ${flow.definitionId}.`, {
        retryable: true,
        recommendedTool: "cleardose_get_available_workflow_actions",
        details: { flowId: flow.id, action: normalizedType, fromState: flow.state, toState, currentVersion: flow.eventCount },
      });
    }
    const startsFlow = normalizedType === "FLOW_STARTED" && flow.eventCount === 0 && toState === (definition.initialState ?? definition.states[0]);
    const resetsFlow = normalizedType === "WORKFLOW_RESET" && toState === (definition.initialState ?? definition.states[0]);
    const declaredTransition = startsFlow || resetsFlow ? null : this.transitionFor(definition, flow.state, normalizedType, toState);
    if (!startsFlow && !resetsFlow && !declaredTransition) {
      throw stateError("INVALID_TRANSITION", `${normalizedType} cannot move ${flow.definitionId} from ${flow.state} to ${toState}.`, {
        retryable: true,
        recommendedTool: "cleardose_get_available_workflow_actions",
        details: { flowId: flow.id, action: normalizedType, fromState: flow.state, suppliedFromState: fromState, toState, currentVersion: flow.eventCount },
      });
    }
    if (declaredTransition?.humanOnly && !["ui", "human"].includes(String(source))) {
      throw stateError("ACTION_REQUIRES_HUMAN", `${declaredTransition.action} requires a visible human action.`, {
        details: { flowId: flow.id, action: declaredTransition.action, currentState: flow.state },
      });
    }
    const timestamp = now();
    const boundedEventContext = boundedContext(context);
    const safeContext = boundedEventContext && typeof boundedEventContext === "object" && !Array.isArray(boundedEventContext) ? boundedEventContext : {};
    const baseContext = replaceContext ? safeContext : { ...flow.context, ...safeContext };
    const nextVersion = flow.eventCount + 1;
    const mergedContext = {
      ...baseContext,
      __runtime: { ...(baseContext?.__runtime ?? {}), eventVersion: nextVersion },
    };
    const event = {
      id: id("evt"), flowId: flow.id, definitionId: flow.definitionId,
      type: normalizedType.slice(0, 100), fromState: startsFlow ? null : flow.state, toState, source: String(source || "ui").slice(0, 80),
      correlationId: String(correlationId || "").slice(0, 120), context: mergedContext, createdAt: timestamp,
      version: nextVersion,
    };
    const nextFlow = {
      ...flow,
      state: toState,
      status: flowStatus(toState, this.definitionForFlow(flow)),
      context: mergedContext,
      eventCount: nextVersion,
      updatedAt: timestamp,
    };
    this.events.set(event.id, event);
    this.flows.set(flow.id, nextFlow);
    await this.dao.appendEvent(event, nextFlow);
    this.channel?.postMessage({ kind: "event", event, flow: nextFlow });
    this.notify();
    return copy(event);
  }

  async runTool(name, input, execute, metadata = {}) {
    const correlationId = id("call");
    const capability = getCapability(name);
    const startedAt = now();
    const startedClock = clock();
    const before = runtimeCounts(this);
    const safeInput = boundedTracePayload(input);
    const flow = await this.startFlow({
      definitionId: "webmcp-tool-call",
      title: `Tool · ${name}`,
      context: { tool: name, input: safeInput, correlationId, capabilityId: metadata.capabilityId ?? capability?.id ?? "", category: metadata.category ?? capability?.category ?? "uncategorized", interactionModel: metadata.interactionModel ?? capability?.interactionModel ?? "imperative", capabilityMachine: metadata.machine ?? capability?.machine ?? null, execution: { startedAt, before } },
      source: "webmcp",
    });
    await this.transition(flow.id, { type: "TOOL_EXECUTION_STARTED", toState: "running", context: { execution: { startedAt, before, running: true } }, source: "webmcp", correlationId });
    try {
      const result = await execute({ flowId: flow.id, correlationId });
      const isError = Boolean(result?.isError);
      const elapsedMs = elapsed(startedClock);
       const after = runtimeCounts(this, { pendingEvents: 1 });
      await this.transition(flow.id, {
        type: isError ? "TOOL_EXECUTION_REJECTED" : "TOOL_EXECUTION_COMPLETED",
        toState: isError ? "error" : "complete",
        context: { result: boundedTracePayload(result?.structuredContent ?? null), elapsedMs, execution: { startedAt, completedAt: now(), elapsedMs, outcome: isError ? "rejected" : "complete", before, after } },
        source: "webmcp",
        correlationId,
      });
      return result;
    } catch (error) {
      const elapsedMs = elapsed(startedClock);
      await this.transition(flow.id, {
        type: "TOOL_EXECUTION_FAILED", toState: "error",
        context: { errorRecorded: true, errorCode: error?.code ?? "TOOL_FAILURE", elapsedMs, execution: { startedAt, completedAt: now(), elapsedMs, outcome: "failed", before, after: runtimeCounts(this, { pendingEvents: 1 }) } }, source: "webmcp", correlationId,
      });
      throw error;
    }
  }

  async querySeededDrugs(input) { await this.readyPromise; return this.localDrugIndexApi.search(input); }
  async getSeededDrug(idValue) { await this.readyPromise; return this.localDrugIndexApi.get(idValue); }
  configureDrugIndexOperations(operations) { this.localDrugIndexApi.configureOperations(operations); }
  async compareSeededDrugPrices(input) { await this.readyPromise; return this.localDrugIndexApi.compareDrugPrices(input); }
  async findSeededRelatedDrugs(input) { await this.readyPromise; return this.localDrugIndexApi.findRelatedDrugs(input); }
  async listSeededCompatibleOptions(input) { await this.readyPromise; return this.localDrugIndexApi.listCompatibleOptions(input); }
  async compareSeededMedicationOptions(input) { await this.readyPromise; return this.localDrugIndexApi.compareMedicationOptions(input); }
  async getSeededDrugAvailability(input) { await this.readyPromise; return this.localDrugIndexApi.getDrugAvailability(input); }
  async compareSeededDrugAvailability(input) { await this.readyPromise; return this.localDrugIndexApi.compareDrugAvailability(input); }
  async estimateSeededDelivery(input) { await this.readyPromise; return this.localDrugIndexApi.estimateDelivery(input); }
  async reviewSeededInteractionFlags(input) { await this.readyPromise; return this.localDrugIndexApi.reviewInteractionFlags(input); }
  async buildSeededProcurementPlan(input) { await this.readyPromise; return this.localDrugIndexApi.buildProcurementPlan(input); }

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
    const stepTransitions = shortcut.steps.map((step, index) => ({
      action: `SHORTCUT_STEP_${index + 1}_VISIBLE`,
      from: index === 0 ? "ready" : states[index],
      to: states[index + 1],
      description: `Show ${step.title}.`,
      relatedCapabilityId: step.capabilityId,
    }));
    const transitions = [
      ...stepTransitions,
      { action: "HUMAN_REVIEW_REQUIRED", from: states.at(-3), to: "human_review", description: "Pause after the final visible shortcut step." },
      { action: "SHORTCUT_REVIEW_COMPLETED", from: "human_review", to: "complete", description: "Finish after visible human review.", humanOnly: true },
    ];
    return this.startDynamicMachine({
      id: `shortcut-${shortcut.id}`, title: shortcut.title, description: shortcut.summary, states,
      transitions,
      scope: shortcut.scope,
      context: { shortcutId: shortcut.id, mode: shortcut.mode, totalSteps: shortcut.steps.length, currentStep: 0 },
      source: "shortcut",
    });
  }

  async startDynamicMachine({ id: dynamicId, title, description = "", states, stateMeta = {}, transitions, initialState, scope, context = {}, source = "dynamic" }) {
    const normalizedId = String(dynamicId || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!normalizedId) throw new TypeError("A dynamic machine id is required.");
    if (!Array.isArray(states) || states.length < 2 || new Set(states).size !== states.length || states.some((state) => !/^[a-z][a-z0-9_]*$/.test(state))) throw new TypeError("Dynamic machines need two or more unique snake_case states.");
    if (!scope?.role || !scope?.situation || !scope?.step) throw new TypeError("Dynamic machine scope requires role, situation, and step.");
    const machineDefinition = this.registerDynamicDefinition({ id: normalizedId, title, description, states, stateMeta, transitions, initialState, scope }, { notify: false });
    const dynamicContext = { ...context };
    if (Object.hasOwn(dynamicContext, "input")) {
      dynamicContext.inputSummary = {
        fieldNames: Object.keys(dynamicContext.input ?? {}).slice(0, 20),
        fieldCount: Object.keys(dynamicContext.input ?? {}).length,
        valuesPersisted: false,
      };
      delete dynamicContext.input;
    }
    if (Object.hasOwn(dynamicContext, "guide")) {
      dynamicContext.guidePrepared = Boolean(dynamicContext.guide);
      delete dynamicContext.guide;
    }
    return this.startFlow({
      definitionId: "dynamic-capability",
      title: String(title || normalizedId),
      context: { ...dynamicContext, scope: copy(scope), machineKind: "dynamic", machineDefinition },
      source,
    });
  }

  registerDynamicDefinition({ id: dynamicId, title, description = "", states, stateMeta = {}, transitions, initialState, scope }, { notify = true } = {}) {
    const normalizedId = String(dynamicId || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!normalizedId) throw new TypeError("A dynamic machine id is required.");
    if (!Array.isArray(states) || states.length < 2 || states.length > 20 || new Set(states).size !== states.length || states.some((state) => !/^[a-z][a-z0-9_]*$/.test(state))) throw new TypeError("Dynamic machines need two or more unique snake_case states.");
    if (!scope?.role || !scope?.situation || !scope?.step) throw new TypeError("Dynamic machine scope requires role, situation, and step.");
    const machineId = `machine.dynamic.${normalizedId}.v1`;
    const normalized = defineWorkflow({
      id: normalizedId,
      title: String(title || normalizedId),
      description: String(description),
      states,
      stateMeta,
      initialState,
      transitions: transitions?.length ? transitions : createSequentialTransitions(states),
    });
    const definition = { ...copy(normalized), id: machineId, machineId, scope: copy(scope), kind: "dynamic" };
    this.dynamicDefinitions.set(machineId, definition);
    if (notify) this.notify();
    return copy(definition);
  }

  unregisterDynamicDefinition(idValue) {
    const normalizedId = String(idValue || "").replace(/^machine\.dynamic\./, "").replace(/\.v1$/, "").replace(/[^a-z0-9-]+/g, "-");
    const removed = this.dynamicDefinitions.delete(`machine.dynamic.${normalizedId}.v1`);
    if (removed) this.notify();
    return removed;
  }

  async createTemplateArtifact({ flowId, template, input }) {
    await this.readyPromise;
    const timestamp = now();
    const inputFieldCount = input && typeof input === "object" && !Array.isArray(input) ? Object.keys(input).length : 0;
    const artifact = {
      id: id("artifact"), artifactType: "dynamic-document", templateId: template.id, templateName: template.name,
      flowId: String(flowId), exchangeId: null, status: "human_review", title: template.title,
      content: "[omitted from persistence]", contentStored: false,
      input: { omitted: true, fieldCount: Math.min(12, inputFieldCount) }, scope: copy(template.scope),
      disclaimer: "User-created local template output. Review before copying, saving, or sharing. Not medical advice.",
      createdAt: timestamp, updatedAt: timestamp,
    };
    this.cards.set(artifact.id, artifact); await this.dao.saveCard(artifact);
    this.channel?.postMessage({ kind: "card", card: artifact }); this.notify();
    return copy(artifact);
  }

  async advanceShortcut(flowId, shortcut, index) {
    const stepIndex = Math.max(0, Math.min(shortcut.steps.length - 1, Number(index) || 0));
    const step = shortcut.steps[stepIndex];
    const toState = `step_${stepIndex + 1}_${step.id}`;
    const event = await this.transition(flowId, { type: `SHORTCUT_STEP_${stepIndex + 1}_VISIBLE`, toState, context: { currentStep: stepIndex + 1, promptAvailable: Boolean(step.prompt), capabilityId: step.capabilityId }, source: "shortcut" });
    if (stepIndex === shortcut.steps.length - 1) await this.transition(flowId, { type: "HUMAN_REVIEW_REQUIRED", toState: "human_review", context: { copiedPromptRequiresUserAction: true }, source: "shortcut" });
    return event;
  }

  async completeShortcut(flowId) {
    return this.transition(flowId, { type: "SHORTCUT_REVIEW_COMPLETED", toState: "complete", context: { completedByHuman: true }, source: "ui" });
  }

  async preparePrescriptionFollowUp(guidance) {
    const flow = await this.startFlow({ definitionId: "prescription-follow-up", title: `Prescription follow-up · ${guidance.drug.name}`, context: { code: guidance.code, drugId: guidance.drug.id, preferredPath: guidance.preferredPath }, source: "recovery" });
    await this.transition(flow.id, { type: "FOLLOW_UP_PREPARATION_STARTED", toState: "preparing", source: "recovery" });
    await this.transition(flow.id, { type: "EDITABLE_HANDOFF_PREPARED", toState: "human_review", context: { recommendedTool: guidance.recommendedTool, editablePromptPrepared: Boolean(guidance.editablePrompt), questionCount: guidance.questions?.length ?? 0, externalActionTaken: false }, source: "recovery" });
    return { ...guidance, flowId: flow.id };
  }

  async prepareMemoryPacket(input) {
    const flow = await this.startFlow({ definitionId: "memory-packet", title: "Memory packet review", context: { externalWrite: false, authoredTextStored: false }, source: "memory" });
    const packet = { ...createAgentMemoryPacket(input), flowId: flow.id, status: "human_review", updatedAt: now() };
    const stored = memoryPacketPersistenceSummary(packet);
    this.cards.set(stored.id, stored);
    await this.dao.saveCard(stored);
    this.channel?.postMessage({ kind: "card", card: stored });
    await this.transition(flow.id, { type: "MEMORY_PACKET_PREPARED", toState: "human_review", context: { packetId: packet.id, factCount: packet.facts.length, userActionRequired: true }, source: "memory" });
    this.notify();
    return copy(packet);
  }

  async markMemoryExported(packetId, method) {
    const packet = this.cards.get(String(packetId));
    if (!packet || packet.artifactType !== "agent-memory-packet") throw new TypeError(`Unknown memory packet: ${packetId}.`);
    const updated = memoryPacketPersistenceSummary({ ...packet, status: "exported", exportMethod: String(method), updatedAt: now() });
    this.cards.set(updated.id, updated); await this.dao.saveCard(updated);
    this.channel?.postMessage({ kind: "card", card: updated });
    await this.transition(updated.flowId, { type: "USER_EXPORTED_MEMORY", toState: "exported", context: { exportMethod: updated.exportMethod }, source: "ui" });
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
        activeIngredient: primaryDrug.activeIngredient?.name ?? primaryDrug.name,
        manufacturer: primaryDrug.manufacturer?.name ?? "Seeded fictional manufacturer",
        bestFictionalPrice: Math.min(...primaryDrug.variants.map((variant) => variant.price)),
        commonSideEffects: (primaryDrug.commonSideEffects ?? []).slice(0, 5),
        importantWarnings: (primaryDrug.importantWarnings ?? []).slice(0, 5),
        discussionPoints: (primaryDrug.discussionPoints ?? []).slice(0, 5),
        clinicalCoverage: primaryDrug.clinicalSample?.coverage ?? "not-seeded",
        availability: (primaryDrug.variants[0]?.offers ?? []).slice(0, 4).map((offer) => ({
          providerName: offer.providerName ?? offer.channel,
          status: offer.inventory?.status ?? offer.availability ?? "unknown",
          deliveredCashTotal: offer.deliveredCashTotal ?? offer.total,
          deliveryWindow: offer.fulfillment?.shipping?.deliveryWindow ?? null,
          fictional: true,
        })),
      },
      relatedDrugs: boundedRelated,
      concernSummary: { count: normalizedConcerns.length, authoredTextStored: false },
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
      instruction: doctorQuestionCardExchange.buildInstruction({ exchangeId, primaryDrug, relatedDrugs: boundedRelated, concernCount: normalizedConcerns.length }),
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
    const availabilityFacts = context.primaryDrug.availability.map((offer) => {
      const delivery = offer.deliveryWindow ? `, ${offer.deliveryWindow.minDays} to ${offer.deliveryWindow.maxDays} demo days` : "";
      const total = Number.isFinite(offer.deliveredCashTotal) ? `, $${Number(offer.deliveredCashTotal).toFixed(2)} delivered cash total` : "";
      return `${offer.providerName}: ${String(offer.status).replaceAll("_", " ")}${total}${delivery}.`;
    });
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
      availabilityFacts,
      clinicalFacts: {
        label: "Sample clinical data, incomplete",
        activeIngredient: context.primaryDrug.activeIngredient,
        manufacturer: context.primaryDrug.manufacturer,
        commonSideEffects: context.primaryDrug.commonSideEffects,
        importantWarnings: context.primaryDrug.importantWarnings,
        discussionPoints: context.primaryDrug.discussionPoints,
        coverage: context.primaryDrug.clinicalCoverage,
        requiresProfessionalReview: true,
      },
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

  actionStatus(flow, definition, transition) {
    const terminal = stateDetails(definition, flow.state).terminal;
    const fromCurrentState = transition.from.includes(flow.state);
    let disabledCode = "";
    let disabledReason = "";
    if (terminal) {
      disabledCode = "TERMINAL_STATE";
      disabledReason = `The workflow is terminal at ${flow.state}.`;
    } else if (!fromCurrentState) {
      disabledCode = "INVALID_TRANSITION";
      disabledReason = `${transition.action} is not valid from ${flow.state}.`;
    } else if (transition.humanOnly) {
      disabledCode = "ACTION_REQUIRES_HUMAN";
      disabledReason = `${transition.action} requires a visible human action.`;
    }
    return {
      action: transition.action,
      aliases: copy(transition.aliases ?? []),
      label: transition.label,
      description: transition.description,
      from: copy(transition.from),
      to: transition.to,
      trigger: transition.trigger,
      inputSchema: copy(transition.inputSchema),
      requiredInput: copy(transition.inputSchema?.required ?? []),
      relatedCapabilityId: transition.relatedCapabilityId,
      relatedTool: transition.relatedTool,
      humanOnly: transition.humanOnly,
      recovery: transition.recovery,
      available: fromCurrentState && !terminal && !transition.humanOnly,
      availableToHuman: fromCurrentState && !terminal,
      disabledCode,
      disabledReason,
    };
  }

  getAvailableActions({ flowId }) {
    const flow = this.requireFlow(flowId);
    const definition = this.requireDefinition(flow);
    const actions = (definition.transitions ?? []).map((transition) => this.actionStatus(flow, definition, transition));
    const availableActions = actions.filter((action) => action.available);
    const humanActions = actions.filter((action) => action.availableToHuman && action.humanOnly);
    const unavailableActions = actions.filter((action) => !action.availableToHuman);
    return {
      flowId: flow.id,
      definitionId: flow.definitionId,
      currentState: flow.state,
      version: flow.eventCount,
      terminal: stateDetails(definition, flow.state).terminal,
      error: stateDetails(definition, flow.state).error,
      valid: [...availableActions, ...humanActions].map((action) => action.action),
      disabled: unavailableActions.map((action) => action.action),
      validNextStates: [...new Set([...availableActions, ...humanActions].map((action) => action.to))],
      availableActions,
      humanActions,
      unavailableActions,
      resetAvailable: true,
    };
  }

  inspectState({ flowId }) {
    const flow = this.requireFlow(flowId);
    const definition = this.requireDefinition(flow);
    const actions = this.getAvailableActions({ flowId: flow.id });
    return {
      flow: copy(flow),
      definition: copy(definition),
      currentState: flow.state,
      version: flow.eventCount,
      stateMeta: copy(stateDetails(definition, flow.state)),
      terminal: actions.terminal,
      error: actions.error,
      availableActions: actions.availableActions,
      humanActions: actions.humanActions,
      unavailableActions: actions.unavailableActions,
      valid: actions.valid,
      disabled: actions.disabled,
      validNextStates: actions.validNextStates,
    };
  }

  getHistory({ flowId, limit = 40 } = {}) {
    const flow = this.requireFlow(flowId);
    const boundedLimit = Math.max(1, Math.min(100, Number(limit) || 40));
    const allEvents = [...this.events.values()]
      .filter((event) => event.flowId === flow.id)
      .sort((left, right) => {
        const leftVersion = Number(left.version ?? left.context?.__runtime?.eventVersion ?? 0);
        const rightVersion = Number(right.version ?? right.context?.__runtime?.eventVersion ?? 0);
        return leftVersion && rightVersion ? leftVersion - rightVersion : left.createdAt.localeCompare(right.createdAt);
      });
    const versionOffset = Math.max(0, allEvents.length - boundedLimit);
    const events = allEvents.slice(-boundedLimit).map((event, index) => ({ ...copy(event), version: Number(event.version ?? event.context?.__runtime?.eventVersion ?? versionOffset + index + 1) }));
    return { flowId: flow.id, currentState: flow.state, version: flow.eventCount, count: allEvents.length, events };
  }

  getTransition({ flowId, action }) {
    const flow = this.requireFlow(flowId);
    const definition = this.requireDefinition(flow);
    const normalizedAction = String(action || "").trim().toUpperCase();
    const transition = definition.transitions?.find((item) => item.from.includes(flow.state) && transitionAcceptsAction(item, normalizedAction))
      ?? definition.transitions?.find((item) => transitionAcceptsAction(item, normalizedAction));
    if (!transition) {
      throw stateError("UNKNOWN_ACTION", `Unknown action ${normalizedAction || "(empty)"} for ${flow.definitionId}.`, {
        retryable: true,
        recommendedTool: "cleardose_get_available_workflow_actions",
        details: { flowId: flow.id, action: normalizedAction, currentState: flow.state, currentVersion: flow.eventCount },
      });
    }
    return { flowId: flow.id, currentState: flow.state, version: flow.eventCount, transition: this.actionStatus(flow, definition, transition) };
  }

  async dispatch({ flowId, action, input = {}, expectedVersion, requestId, source = "agent" }) {
    await this.readyPromise;
    const flow = this.requireFlow(flowId);
    const definition = this.requireDefinition(flow);
    const correlationId = this.assertRequestId(flow, requestId);
    this.assertVersion(flow, expectedVersion);
    const currentMeta = stateDetails(definition, flow.state);
    if (currentMeta.terminal) {
      throw stateError("TERMINAL_STATE", `Workflow ${flow.id} is already terminal at ${flow.state}.`, { recommendedTool: "cleardose_inspect_workflow_state", details: { flowId: flow.id, currentState: flow.state, currentVersion: flow.eventCount } });
    }
    const normalizedAction = String(action || "").trim().toUpperCase();
    const transition = this.transitionFor(definition, flow.state, normalizedAction);
    if (!transition) {
      throw stateError("INVALID_TRANSITION", `${normalizedAction || "(empty)"} is not available from ${flow.state}.`, {
        retryable: true,
        recommendedTool: "cleardose_get_available_workflow_actions",
        details: { flowId: flow.id, action: normalizedAction, currentState: flow.state, currentVersion: flow.eventCount },
      });
    }
    if (transition.humanOnly) {
      throw stateError("ACTION_REQUIRES_HUMAN", `${transition.action} requires a visible human action.`, {
        retryable: false,
        details: { flowId: flow.id, action: transition.action, currentState: flow.state, visibleActionRequired: true },
      });
    }
    validateSchema(input, transition.inputSchema);
    const event = await this.recordEvent({
      flowId: flow.id,
      type: transition.action,
      fromState: flow.state,
      toState: transition.to,
      context: { actionInput: boundedTracePayload(input), dispatchedBy: String(source || "agent").slice(0, 40) },
      source: String(source || "agent"),
      correlationId,
    });
    const updated = this.requireFlow(flow.id);
    const actions = this.getAvailableActions({ flowId: flow.id });
    return { ok: true, event, flow: copy(updated), state: updated.state, version: updated.eventCount, availableActions: actions.availableActions, humanActions: actions.humanActions };
  }

  async resetFlow({ flowId, expectedVersion, requestId, source = "state-reset" }) {
    await this.readyPromise;
    const flow = this.requireFlow(flowId);
    const definition = this.requireDefinition(flow);
    const correlationId = this.assertRequestId(flow, requestId);
    this.assertVersion(flow, expectedVersion);
    const initialContext = boundedContext(flow.context?.__runtime?.initialContext ?? {});
    const resetCount = Number(flow.context?.__runtime?.resetCount || 0) + 1;
    const nextContext = { ...initialContext, __runtime: { initialContext, resetCount, lastResetRequestId: correlationId } };
    const event = await this.recordEvent({
      flowId: flow.id,
      type: "WORKFLOW_RESET",
      fromState: flow.state,
      toState: definition.initialState ?? definition.states[0],
      context: nextContext,
      source,
      correlationId,
      replaceContext: true,
    });
    const updated = this.requireFlow(flow.id);
    const actions = this.getAvailableActions({ flowId: flow.id });
    return { ok: true, event, flow: copy(updated), state: updated.state, version: updated.eventCount, availableActions: actions.availableActions, humanActions: actions.humanActions };
  }

  inspect({ flowId = "", limit = 40 } = {}) {
    const boundedLimit = Math.max(1, Math.min(100, Number(limit) || 40));
    const flows = (flowId ? [this.flows.get(String(flowId))].filter(Boolean) : [...this.flows.values()])
      .sort(compareRecent)
      .slice(0, boundedLimit);
    const selectedIds = new Set(flows.map((flow) => flow.id));
    const events = [...this.events.values()]
      .filter((event) => selectedIds.has(event.flowId))
      .sort(compareChronological)
      .slice(-boundedLimit);
    const allArtifacts = [...this.cards.values()]
      .filter((card) => selectedIds.has(card.flowId))
      .sort(compareRecent);
    const artifacts = allArtifacts.slice(0, boundedLimit);
    return {
      database: copy(this.database), flows: copy(flows), events: copy(events),
      cards: copy(allArtifacts.filter((item) => !item.artifactType || item.artifactType === "doctor-question-card").slice(0, boundedLimit)),
      artifacts: copy(artifacts),
      memoryPackets: copy(allArtifacts.filter((item) => item.artifactType === "agent-memory-packet").slice(0, boundedLimit)),
    };
  }

  async seedDemoFlows() {
    await this.readyPromise;
    const hasDefinition = (definitionId) => [...this.flows.values()].some((flow) => flow.definitionId === definitionId);
    if (!hasDefinition("medication-discovery")) {
      const discovery = await this.startFlow({ definitionId: "medication-discovery", title: "Lisinopril discovery", context: { query: "lisinopril" }, source: "seed" });
      await this.transition(discovery.id, { type: "SEARCH_SUBMITTED", toState: "searching", source: "seed" });
      await this.transition(discovery.id, { type: "UDI_MATCH_SELECTED", toState: "matched", context: { drugId: "med_lisinopril", resultCount: 1 }, source: "seed" });
    }
    if (!hasDefinition("procurement-plan")) {
      const plan = await this.startFlow({ definitionId: "procurement-plan", title: "Two-item local plan", context: { strategy: "lowest_total", itemCount: 2 }, source: "seed" });
      await this.transition(plan.id, { type: "PLAN_REQUESTED", toState: "planning", source: "seed" });
    }
    if (!hasDefinition("state-interaction-demo")) {
      await this.startFlow({
        definitionId: "state-interaction-demo",
        title: "Branching state demo",
        context: { drugId: "med_lisinopril", resultCount: 1, availabilityFixture: "default-service-area", externalActionTaken: false },
        source: "seed",
      });
    }
    return this.snapshot();
  }

  async executeNegativeScenarioOperation(operation = {}) {
    const startedAt = now();
    const startedClock = clock();
    const input = copy(operation.input ?? {});
    const expectedCode = String(operation.expectedCode || "");
    let result = null;
    let failure = null;

    try {
      if (operation.kind === "validate-health-form") {
        const concerns = Array.isArray(input.concerns) ? input.concerns : [];
        const fieldErrors = {};
        if (!input.drugId) fieldErrors.drugId = "Required exact UDI id.";
        if (concerns.some((item) => typeof item !== "string" || item.length > 160)) fieldErrors.concerns = "Each item must be 160 characters or fewer.";
        result = Object.keys(fieldErrors).length
          ? { ok: false, code: "INVALID_INPUT", fieldErrors, persisted: false }
          : { ok: true, persisted: false };
      } else if (operation.kind === "get-availability") {
        const availability = await this.getSeededDrugAvailability(input);
        result = availability.recovery
          ? { ok: false, code: availability.recovery.code, recovery: availability.recovery, counts: availability.counts }
          : { ok: true, counts: availability.counts };
      } else if (operation.kind === "compare-medications") {
        result = await this.compareSeededMedicationOptions(input);
      } else if (operation.kind === "compare-availability") {
        result = await this.compareSeededDrugAvailability(input);
      } else if (operation.kind === "estimate-delivery") {
        result = await this.estimateSeededDelivery(input);
      } else if (operation.kind === "verify-quote") {
        const availability = await this.getSeededDrugAvailability(input);
        const offer = availability.offers.find((item) => item.providerId === input.providerId);
        result = !offer || offer.quoteVersion !== input.quoteVersion
          ? { ok: false, code: "PRICE_VERSION_STALE", requestedQuoteVersion: input.quoteVersion, currentQuoteVersion: offer?.quoteVersion ?? null, requiresReconfirmation: true }
          : { ok: true, quoteVersion: offer.quoteVersion };
      } else if (operation.kind === "verify-prescription-gate") {
        const drug = await this.getSeededDrug(input.drugId);
        result = { ok: false, code: "PRESCRIPTION_REQUIRED", drugId: drug.id, externalActionTaken: false };
      } else if (operation.kind === "mock-service-failure") {
        result = { ok: false, code: "MOCK_SERVICE_FAILED", service: "availability", retryable: true, fixtureId: String(input.fixtureId || "mock-service-failure") };
      } else if (operation.kind === "mock-structured-failure") {
        result = {
          ok: false,
          code: String(input.code || "MOCK_FAILURE"),
          retryable: Boolean(input.retryable),
          ...(input.recommendedTool ? { recommendedTool: String(input.recommendedTool) } : {}),
          ...(input.recommendedAction ? { recommendedAction: String(input.recommendedAction) } : {}),
          externalActionTaken: false,
          mocked: true,
        };
      } else if (operation.kind === "duplicate-action") {
        const probe = await this.startFlow({ definitionId: "state-interaction-demo", title: "Duplicate action probe", context: { fixtureId: "duplicate-submission", externalActionTaken: false }, source: "scenario" });
        await this.dispatch({ flowId: probe.id, action: input.action, input: {}, expectedVersion: probe.eventCount, requestId: input.requestId, source: "scenario" });
        await this.dispatch({ flowId: probe.id, action: input.action, input: {}, expectedVersion: probe.eventCount, requestId: input.requestId, source: "scenario" });
      } else if (operation.kind === "find-compatible-options") {
        const compatibility = await this.listSeededCompatibleOptions(input);
        const eligible = compatibility.options.filter((option) => option.eligibleForPurpose);
        result = eligible.length
          ? { ok: true, count: eligible.length }
          : { ok: false, code: "NO_EQUIVALENT_MEDICATION", retryable: false, count: 0, recommendedTool: "cleardose_get_drug_index_entry", recoveryInput: { drugId: input.drugId }, comparisonCreated: false };
      } else {
        throw new TypeError(`Unknown negative scenario operation: ${operation.kind || "(empty)"}.`);
      }
    } catch (error) {
      const structured = typeof error?.toStructuredContent === "function" ? error.toStructuredContent() : null;
      failure = structured ?? {
        ok: false,
        code: error?.code ?? "SCENARIO_OPERATION_FAILED",
        message: error instanceof Error ? error.message : String(error),
        retryable: Boolean(error?.retryable),
      };
    }

    const evidence = boundedContext({
      operation: operation.kind,
      expectedCode,
      input,
      result: failure ?? result,
      elapsedMs: elapsed(startedClock),
      startedAt,
      completedAt: now(),
      mocked: true,
    });
    const observedCode = String((failure ?? result)?.code || "");
    if (expectedCode && observedCode !== expectedCode) {
      throw new Error(`Negative scenario expected ${expectedCode} but observed ${observedCode || "no failure"}.`);
    }
    return evidence;
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
    let operationEvidence = null;
    for (let index = 0; index < scenario.transitions.length; index += 1) {
      const transition = scenario.transitions[index];
      const isFailureTransition = index === scenario.transitions.length - 1;
      if (isFailureTransition && scenario.operation) operationEvidence = await this.executeNegativeScenarioOperation(scenario.operation);
      await this.transition(flow.id, {
        ...transition,
        context: { ...(transition.context ?? {}), ...(operationEvidence ? { operationEvidence } : {}) },
        source: isFailureTransition ? "failure" : "scenario",
      });
    }
    return copy(this.flows.get(flow.id));
  }

  async clear() {
    await this.readyPromise;
    this.flows.clear(); this.events.clear(); this.exchanges.clear(); this.cards.clear();
    await this.dao.clearWorkflowData();
    this.notify();
  }

  validateIncomingEventMessage(message) {
    const event = message?.event;
    const flow = message?.flow;
    if (!plainRecord(event) || !plainRecord(flow)) return { ok: false, code: "INVALID_CHANNEL_EVENT" };
    const flowId = safeChannelId(flow.id, ["flow_"]);
    const eventId = safeChannelId(event.id, ["evt_"]);
    if (!flowId || !eventId || event.flowId !== flowId) return { ok: false, code: "INVALID_CHANNEL_ID" };
    if (!safeChannelToken(flow.definitionId, { maximum: 120 }) || event.definitionId !== flow.definitionId) return { ok: false, code: "INVALID_CHANNEL_DEFINITION" };

    let definition = getWorkflowDefinition(flow.definitionId);
    let dynamicDefinition = null;
    if (flow.definitionId === "dynamic-capability") {
      dynamicDefinition = safeIncomingDynamicDefinition(flow.context?.machineDefinition);
      definition = dynamicDefinition;
    }
    if (!definition || !definition.states.includes(flow.state) || event.toState !== flow.state) return { ok: false, code: "INVALID_CHANNEL_STATE" };

    const type = String(event.type || "");
    const source = safeChannelToken(event.source, { maximum: 80 });
    const correlationId = safeChannelToken(event.correlationId, { allowEmpty: true, maximum: 120 });
    const version = Number(event.version);
    if (!/^[A-Z][A-Z0-9_]{0,99}$/.test(type) || !source || (!correlationId && event.correlationId)) return { ok: false, code: "INVALID_CHANNEL_EVENT" };
    if (!Number.isInteger(version) || version < 1 || version > 1_000_000 || Number(flow.eventCount) !== version) return { ok: false, code: "INVALID_CHANNEL_VERSION" };
    if (!safeChannelTimestamp(event.createdAt) || !safeChannelTimestamp(flow.createdAt) || !safeChannelTimestamp(flow.updatedAt)) return { ok: false, code: "INVALID_CHANNEL_TIMESTAMP" };

    const startsFlow = type === "FLOW_STARTED" && version === 1 && event.fromState == null && event.toState === definition.initialState;
    const resetsFlow = type === "WORKFLOW_RESET" && definition.states.includes(event.fromState) && event.toState === definition.initialState;
    const declaredTransition = startsFlow || resetsFlow ? null : this.transitionFor(definition, event.fromState, type, event.toState);
    if (!startsFlow && !resetsFlow && !declaredTransition) return { ok: false, code: "INVALID_CHANNEL_TRANSITION" };
    if (declaredTransition?.humanOnly && !["ui", "human"].includes(source)) return { ok: false, code: "INVALID_CHANNEL_SOURCE" };

    if (this.events.has(eventId)) return { ok: false, code: "DUPLICATE_CHANNEL_EVENT" };
    const prior = this.flows.get(flowId);
    if (prior && (prior.definitionId !== flow.definitionId || prior.state !== event.fromState || prior.eventCount + 1 !== version)) {
      return { ok: false, code: "OUT_OF_ORDER_CHANNEL_EVENT" };
    }

    const tracedContext = boundedTracePayload(flow.context);
    const safeContext = plainRecord(tracedContext) ? tracedContext : {};
    const tracedInitialContext = boundedTracePayload(flow.context?.__runtime?.initialContext ?? {});
    const initialContext = plainRecord(tracedInitialContext) ? tracedInitialContext : {};
    delete safeContext.machineDefinition;
    delete initialContext.machineDefinition;
    if (dynamicDefinition) {
      safeContext.machineDefinition = dynamicDefinition;
      initialContext.machineDefinition = dynamicDefinition;
    }
    safeContext.__runtime = {
      initialContext,
      resetCount: Math.max(0, Math.min(10_000, Number(flow.context?.__runtime?.resetCount) || 0)),
      eventVersion: version,
      ...(safeChannelToken(flow.context?.__runtime?.lastResetRequestId, { allowEmpty: true, maximum: 120 }) ? { lastResetRequestId: flow.context.__runtime.lastResetRequestId } : {}),
    };

    const safeFlow = {
      id: flowId,
      definitionId: flow.definitionId,
      title: definition.title,
      state: event.toState,
      status: flowStatus(event.toState, definition),
      context: safeContext,
      eventCount: version,
      createdAt: prior?.createdAt ?? flow.createdAt,
      updatedAt: flow.updatedAt,
    };
    const safeEvent = {
      id: eventId,
      flowId,
      definitionId: flow.definitionId,
      type,
      fromState: startsFlow ? null : event.fromState,
      toState: event.toState,
      source,
      correlationId,
      context: safeContext,
      createdAt: event.createdAt,
      version,
    };
    return { ok: true, event: safeEvent, flow: safeFlow };
  }

  validateIncomingExchange(value) {
    if (!plainRecord(value)) return null;
    const idValue = safeChannelId(value.id, ["exchange_"]);
    const flowId = safeChannelId(value.flowId, ["flow_"]);
    const type = safeChannelToken(value.type, { maximum: 100 });
    const status = safeChannelToken(value.status, { maximum: 60 });
    const createdAt = safeChannelTimestamp(value.createdAt);
    const updatedAt = safeChannelTimestamp(value.updatedAt);
    if (!idValue || !flowId || !this.flows.has(flowId) || !type || !status || !createdAt || !updatedAt) return null;
    const requestContext = boundedTracePayload(value.requestContext);
    return {
      id: idValue,
      type,
      flowId,
      status,
      requestContext: plainRecord(requestContext) ? requestContext : {},
      instruction: "Structured exchange prepared in another ClearDose tab. Review authored text in the originating tab.",
      expectedResponseSchema: { type: "object", properties: {}, additionalProperties: false },
      createdAt,
      updatedAt,
      crossTabSummary: true,
    };
  }

  validateIncomingArtifact(value) {
    if (!plainRecord(value)) return null;
    const idValue = safeChannelId(value.id, ["card_", "memory_", "artifact_"]);
    const flowId = safeChannelId(value.flowId, ["flow_"]);
    const exchangeId = value.exchangeId ? safeChannelId(value.exchangeId, ["exchange_"]) : "";
    const status = safeChannelToken(value.status, { maximum: 60 });
    const originalArtifactType = safeChannelToken(value.artifactType || "doctor-question-card", { maximum: 100 });
    const createdAt = safeChannelTimestamp(value.createdAt);
    const updatedAt = safeChannelTimestamp(value.updatedAt ?? value.createdAt);
    if (!idValue || !flowId || !this.flows.has(flowId) || (value.exchangeId && !exchangeId) || !status || !originalArtifactType || !createdAt || !updatedAt) return null;
    return {
      id: idValue,
      artifactType: "cross-tab-artifact-summary",
      originalArtifactType,
      flowId,
      ...(exchangeId ? { exchangeId } : {}),
      status,
      crossTabSummary: true,
      contentAvailableInOriginatingTab: true,
      createdAt,
      updatedAt,
    };
  }

  async receive(message) {
    if (!plainRecord(message)) return { accepted: false, code: "INVALID_CHANNEL_MESSAGE" };
    if (message.kind === "clear") return { accepted: false, code: "REMOTE_CLEAR_NOT_ALLOWED" };
    if (message.kind === "event") {
      const validated = this.validateIncomingEventMessage(message);
      if (!validated.ok) return { accepted: false, code: validated.code };
      this.events.set(validated.event.id, validated.event);
      this.flows.set(validated.flow.id, validated.flow);
      if (validated.flow.context?.machineDefinition) this.dynamicDefinitions.set(validated.flow.context.machineDefinition.id, validated.flow.context.machineDefinition);
      await this.dao.appendEvent(validated.event, validated.flow);
      this.notify();
      return { accepted: true, kind: "event", eventId: validated.event.id };
    }
    if (message.kind === "exchange") {
      const exchange = this.validateIncomingExchange(message.exchange);
      if (!exchange) return { accepted: false, code: "INVALID_CHANNEL_EXCHANGE" };
      this.exchanges.set(exchange.id, exchange);
      await this.dao.saveExchange(exchange);
      this.notify();
      return { accepted: true, kind: "exchange", exchangeId: exchange.id };
    }
    if (message.kind === "card") {
      const artifact = this.validateIncomingArtifact(message.card);
      const exchange = message.exchange ? this.validateIncomingExchange(message.exchange) : null;
      if (!artifact || (message.exchange && !exchange)) return { accepted: false, code: "INVALID_CHANNEL_ARTIFACT" };
      this.cards.set(artifact.id, artifact);
      await this.dao.saveCard(artifact);
      if (exchange) { this.exchanges.set(exchange.id, exchange); await this.dao.saveExchange(exchange); }
      this.notify();
      return { accepted: true, kind: "card", artifactId: artifact.id };
    }
    return { accepted: false, code: "UNKNOWN_CHANNEL_MESSAGE" };
  }
}
