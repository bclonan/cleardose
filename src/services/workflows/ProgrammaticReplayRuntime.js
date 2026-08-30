import { demoScenarios, getDemoScenario } from "../api/demos/demoScenarios.js";
import { BoundedObservationService } from "../ui/BoundedObservationService.js";
import { normalizeDemoRoute } from "../../domain/shared/demoRoute.js";

const BLOCKED_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

function cloneReplayValue(value, seen = new WeakMap()) {
  if (value == null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Date) return new Date(value.getTime());
  const result = Array.isArray(value) ? [] : {};
  seen.set(value, result);
  Object.entries(value).forEach(([key, item]) => {
    if (!BLOCKED_PATH_SEGMENTS.has(key)) result[key] = cloneReplayValue(item, seen);
  });
  return result;
}

function copy(value) {
  if (value == null) return value;
  try { return structuredClone(value); }
  catch { return cloneReplayValue(value); }
}
function defaultClock() { return globalThis.performance?.now?.() ?? Date.now(); }
function defaultNow() { return new Date().toISOString(); }
function defaultId() { return `call_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`; }
function defaultSleep(milliseconds) { return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds)); }
function roundDuration(value) { return Math.max(0, Math.round(Number(value || 0) * 100) / 100); }

function pathSegments(path) {
  return String(path || "").replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean).map((segment) => {
    if (BLOCKED_PATH_SEGMENTS.has(segment)) throw new TypeError(`Replay reference path contains a blocked segment: ${segment}.`);
    return segment;
  });
}

function readPath(root, path) {
  return pathSegments(path).reduce((value, segment) => value?.[segment], root);
}

export function resolveReplayInput(value, source) {
  if (Array.isArray(value)) return value.map((item) => resolveReplayInput(item, source));
  if (!value || typeof value !== "object") return value;
  if (Object.hasOwn(value, "$from")) {
    let resolved = readPath(source, value.$from);
    if (value.$find && Array.isArray(resolved)) {
      resolved = resolved.find((item) => readPath(item, value.$find.path) === value.$find.equals);
    }
    if (resolved !== undefined && Object.hasOwn(value, "$select")) resolved = readPath(resolved, value.$select);
    if (resolved !== undefined) return copy(resolved);
    if (Object.hasOwn(value, "$default")) return resolveReplayInput(value.$default, source);
    throw new TypeError(`Replay input reference did not resolve: ${value.$from}.`);
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveReplayInput(item, source)]));
}

function toolNameFor(step) {
  return step.toolName ?? String(step.capabilityId || "").split(".").at(-1);
}

function responseErrorCode(response) {
  return response?.structuredContent?.code ?? response?.code ?? "TOOL_ERROR";
}

function isErrorResponse(response) {
  return Boolean(response?.isError || response?.structuredContent?.ok === false || response?.ok === false);
}

function serializeError(error) {
  return {
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
    code: error?.code ?? "REPLAY_STEP_FAILED",
  };
}

function initialState() {
  return {
    status: "idle",
    scenarioId: "",
    route: "",
    runId: "",
    workflowFlowId: "",
    currentStepIndex: -1,
    nextStepIndex: 0,
    startedAt: "",
    completedAt: "",
    totalElapsedMs: 0,
    steps: [],
    error: null,
    warnings: [],
  };
}

export class ProgrammaticReplayRuntime {
  constructor({
    scenarios = demoScenarios,
    toolRegistry,
    invokeTool,
    invokeAction,
    observations = new BoundedObservationService(),
    highlight,
    projectVisibleAction,
    resetSeed,
    hooks = {},
    clock = defaultClock,
    now = defaultNow,
    idFactory = defaultId,
    sleep = defaultSleep,
  } = {}) {
    this.scenarios = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
    this.invokeTool = invokeTool ?? (toolRegistry?.invoke ? toolRegistry.invoke.bind(toolRegistry) : null);
    this.invokeAction = invokeAction ?? null;
    this.observations = observations;
    this.highlight = highlight ?? null;
    this.projectVisibleAction = projectVisibleAction ?? null;
    this.resetSeed = resetSeed ?? (async () => {});
    this.hooks = hooks;
    this.clock = clock;
    this.now = now;
    this.idFactory = idFactory;
    this.sleep = sleep;
    this.listeners = new Set();
    this.state = initialState();
    this.activeScenario = null;
    this.rawSteps = {};
    this.startedTick = null;
    this.generation = 0;
    this.activeDrive = null;
  }

  snapshot() {
    const state = copy(this.state);
    if (this.startedTick != null && ["running", "paused"].includes(state.status)) {
      state.totalElapsedMs = roundDuration(this.clock() - this.startedTick);
    }
    return Object.freeze(state);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  notify() { this.listeners.forEach((listener) => listener(this.snapshot())); }

  getScenario(id) { return this.scenarios.get(String(id)) ?? getDemoScenario(id); }

  registerScenario(scenario) {
    if (!scenario || typeof scenario !== "object" || !/^[a-z0-9-]{3,120}$/.test(String(scenario.id)) || !Array.isArray(scenario.routes) || !scenario.routes.length || !Array.isArray(scenario.steps) || !scenario.steps.length) {
      throw new TypeError("A replay scenario needs a stable id, at least one route, and at least one step.");
    }
    this.scenarios.set(String(scenario.id), scenario);
    return scenario;
  }

  async prepare(scenarioId, { route = "", resetSeed = true } = {}) {
    await this.settleActive();
    const scenario = this.getScenario(scenarioId);
    if (!scenario) throw new TypeError(`Unknown replay scenario: ${scenarioId}.`);
    const normalizedRoute = normalizeDemoRoute(route || scenario.routes[0]);
    if (!scenario.routes.includes(normalizedRoute)) throw new TypeError(`${scenario.id} is not available on ${normalizedRoute}.`);
    if (resetSeed) await this.resetSeed({ reason: "prepare", scenario: copy(scenario), route: normalizedRoute });

    this.generation += 1;
    this.activeScenario = scenario;
    this.rawSteps = {};
    this.startedTick = this.clock();
    this.state = {
      ...initialState(),
      status: "paused",
      scenarioId: scenario.id,
      route: normalizedRoute,
      runId: this.idFactory(),
      startedAt: this.now(),
    };
    const hookResult = await this.callHook("onRunStart", { scenario, state: this.snapshot() });
    this.state.workflowFlowId = typeof hookResult === "string" ? hookResult : hookResult?.flowId ?? "";
    this.notify();
    return this.snapshot();
  }

  async run(scenarioId, options = {}) {
    if (this.activeDrive) throw new Error("A replay step is already running.");
    await this.prepare(scenarioId, options);
    this.state.status = "running";
    this.notify();
    return this.startDrive({ single: false });
  }

  async pause() {
    if (this.state.status !== "running") return this.snapshot();
    this.state.status = "paused";
    this.state.totalElapsedMs = this.elapsedTotal();
    this.notify();
    await this.callHook("onRunPause", { scenario: this.activeScenario, state: this.snapshot() });
    return this.snapshot();
  }

  async resume() {
    if (this.state.status !== "paused" || !this.activeScenario) return this.snapshot();
    if (this.activeDrive) await this.activeDrive;
    this.state.status = "running";
    this.notify();
    await this.callHook("onRunResume", { scenario: this.activeScenario, state: this.snapshot() });
    return this.startDrive({ single: false });
  }

  async step(scenarioId = this.state.scenarioId, options = {}) {
    if (!this.activeScenario || this.state.scenarioId !== scenarioId || ["complete", "error", "idle"].includes(this.state.status)) {
      await this.prepare(scenarioId, options);
    } else if (this.activeDrive) {
      await this.pause();
      await this.activeDrive;
    }
    if (this.state.nextStepIndex >= this.activeScenario.steps.length) return this.finishRun();
    this.state.status = "running";
    this.notify();
    return this.startDrive({ single: true });
  }

  async restart({ autoRun = true, route = this.state.route } = {}) {
    const scenarioId = this.state.scenarioId;
    if (!scenarioId) throw new Error("Select a replay scenario before restarting.");
    await this.pause();
    await this.settleActive();
    await this.prepare(scenarioId, { route, resetSeed: true });
    if (!autoRun) return this.snapshot();
    this.state.status = "running";
    this.notify();
    return this.startDrive({ single: false });
  }

  async reset() {
    const scenario = this.activeScenario;
    const route = this.state.route;
    await this.pause();
    await this.settleActive();
    await this.resetSeed({ reason: "reset", scenario: scenario ? copy(scenario) : null, route });
    this.generation += 1;
    this.activeScenario = null;
    this.rawSteps = {};
    this.startedTick = null;
    this.state = initialState();
    this.notify();
    await this.callHook("onReset", { scenario, route, state: this.snapshot() });
    return this.snapshot();
  }

  elapsedTotal() { return this.startedTick == null ? 0 : roundDuration(this.clock() - this.startedTick); }

  async settleActive() {
    if (this.activeDrive) await this.activeDrive;
  }

  startDrive({ single }) {
    if (this.activeDrive) return this.activeDrive;
    const generation = this.generation;
    const drive = this.drive(generation, { single }).finally(() => {
      if (this.activeDrive === drive) this.activeDrive = null;
    });
    this.activeDrive = drive;
    return drive;
  }

  async drive(generation, { single }) {
    let executed = 0;
    while (this.state.nextStepIndex < this.activeScenario.steps.length) {
      if (generation !== this.generation || this.state.status !== "running") return this.snapshot();
      const completed = await this.executeCurrentStep(generation);
      if (!completed || this.state.status === "error") return this.snapshot();
      executed += 1;
      if (single && executed === 1) {
        if (this.state.nextStepIndex >= this.activeScenario.steps.length) return this.finishRun();
        this.state.status = "paused";
        this.state.totalElapsedMs = this.elapsedTotal();
        this.notify();
        await this.callHook("onRunPause", { scenario: this.activeScenario, state: this.snapshot(), reason: "single-step" });
        return this.snapshot();
      }
      const pauseMs = Number(this.activeScenario.steps[this.state.currentStepIndex]?.pauseAfterMs ?? 0);
      if (pauseMs > 0 && this.state.status === "running" && this.state.nextStepIndex < this.activeScenario.steps.length) await this.sleep(pauseMs);
    }
    return this.finishRun();
  }

  async executeCurrentStep(generation) {
    const stepIndex = this.state.nextStepIndex;
    const step = this.activeScenario.steps[stepIndex];
    const referenceSource = {
      scenario: this.activeScenario,
      route: this.state.route,
      previous: stepIndex > 0 ? this.rawSteps[this.activeScenario.steps[stepIndex - 1].id] : null,
      steps: this.rawSteps,
    };
    let request;
    try {
      request = resolveReplayInput(step.input ?? {}, referenceSource);
    } catch (error) {
      return this.failBeforeExecution(step, stepIndex, error);
    }

    const context = {
      source: "programmatic-replay",
      replayRunId: this.state.runId,
      scenarioId: this.activeScenario.id,
      stepId: step.id,
      route: this.state.route,
      workflowFlowId: this.state.workflowFlowId,
    };
    const observationKeys = [...new Set([
      ...(step.observe ?? []),
      ...(this.projectVisibleAction ? ["replay.visibleAction"] : []),
    ])];
    const startedTick = this.clock();
    const startedAt = this.now();
    const before = await this.observations.capture(observationKeys, { ...context, phase: "before", request });
    const highlightTarget = step.highlightTargets?.[this.state.route] ?? step.highlightTarget ?? "";
    let highlightResult = null;
    if (highlightTarget && this.highlight) {
      try { highlightResult = await this.highlight(highlightTarget, context); }
      catch { highlightResult = { ok: false, target: highlightTarget, message: "Highlighting was unavailable." }; }
    }
    await this.callHook("onStepStart", { scenario: this.activeScenario, step, stepIndex, request, before, highlightTarget, state: this.snapshot() });

    let response = null;
    let caught = null;
    try {
      if (step.kind === "action") {
        if (!this.invokeAction) throw new Error("No replay action invoker is configured.");
        response = await this.invokeAction(step.action, request, context);
      } else {
        if (!this.invokeTool) throw new Error("No local WebMCP tool invoker is configured.");
        response = await this.invokeTool(toolNameFor(step), request, context);
      }
    } catch (error) { caught = error; }

    if (generation !== this.generation) return false;
    let visibleAction = null;
    if (this.projectVisibleAction) {
      try {
        visibleAction = await this.projectVisibleAction({
          scenario: this.activeScenario,
          step,
          stepIndex,
          route: this.state.route,
          request,
          response,
          error: caught ? serializeError(caught) : null,
          context,
        });
      } catch {
        visibleAction = { status: "unavailable", stepId: step.id, toolName: toolNameFor(step) };
      }
    }
    const after = await this.observations.capture(observationKeys, { ...context, phase: "after", request, response, visibleAction });
    const changes = this.observations.diff(before, after);
    const elapsedMs = roundDuration(this.clock() - startedTick);
    const actualCode = caught?.code ?? (isErrorResponse(response) ? responseErrorCode(response) : "");
    const expectedCode = typeof step.expectedError === "string" ? step.expectedError : step.expectedError?.code ?? "";
    const expectedError = Boolean(actualCode && expectedCode && actualCode === expectedCode);
    const failed = Boolean(caught || isErrorResponse(response));
    const trace = {
      id: step.id,
      index: stepIndex,
      title: step.title,
      kind: step.kind ?? "tool",
      capabilityId: step.capabilityId ?? "",
      toolName: toolNameFor(step),
      status: failed ? (expectedError ? "expected-error" : "error") : "complete",
      mocked: step.mocked ?? this.activeScenario.mocked ?? true,
      mockDisclosure: step.mockDisclosure ?? this.activeScenario.mockDisclosure,
      request: this.observations.sanitize(request),
      response: caught ? null : this.observations.sanitize(response),
      error: caught ? this.observations.sanitize(serializeError(caught)) : (failed ? { code: actualCode, message: response?.content?.[0]?.text ?? "The tool returned an error." } : null),
      expectedError: expectedCode || null,
      recovery: step.recovery ?? null,
      highlight: highlightResult ? this.observations.sanitize(highlightResult) : null,
      visibleAction: visibleAction ? this.observations.sanitize(visibleAction) : null,
      before,
      after,
      changes,
      startedAt,
      completedAt: this.now(),
      elapsedMs,
    };

    this.rawSteps[step.id] = { request: copy(request), response: copy(response), error: caught ? serializeError(caught) : null, trace: copy(trace) };
    this.state.steps.push(trace);
    this.state.currentStepIndex = stepIndex;
    this.state.nextStepIndex = stepIndex + 1;
    this.state.totalElapsedMs = this.elapsedTotal();
    this.notify();
    await this.callHook("onStepComplete", { scenario: this.activeScenario, step, stepIndex, trace: copy(trace), state: this.snapshot() });

    if (failed && !expectedError && !step.continueOnError) {
      this.state.status = "error";
      this.state.error = trace.error;
      this.state.completedAt = this.now();
      this.state.totalElapsedMs = this.elapsedTotal();
      this.notify();
      await this.callHook("onRunError", { scenario: this.activeScenario, step, trace: copy(trace), state: this.snapshot() });
      return false;
    }
    return true;
  }

  async failBeforeExecution(step, stepIndex, error) {
    const trace = {
      id: step.id,
      index: stepIndex,
      title: step.title,
      kind: step.kind ?? "tool",
      capabilityId: step.capabilityId ?? "",
      toolName: toolNameFor(step),
      status: "error",
      mocked: step.mocked ?? this.activeScenario.mocked ?? true,
      mockDisclosure: step.mockDisclosure ?? this.activeScenario.mockDisclosure,
      request: null,
      response: null,
      error: serializeError(error),
      expectedError: null,
      recovery: step.recovery ?? null,
      highlight: null,
      visibleAction: null,
      before: {},
      after: {},
      changes: [],
      startedAt: this.now(),
      completedAt: this.now(),
      elapsedMs: 0,
    };
    this.state.steps.push(trace);
    this.state.currentStepIndex = stepIndex;
    this.state.nextStepIndex = stepIndex + 1;
    this.state.status = "error";
    this.state.error = trace.error;
    this.state.completedAt = this.now();
    this.state.totalElapsedMs = this.elapsedTotal();
    this.notify();
    await this.callHook("onRunError", { scenario: this.activeScenario, step, trace: copy(trace), state: this.snapshot() });
    return false;
  }

  async finishRun() {
    if (this.state.status !== "complete") {
      this.state.status = "complete";
      this.state.completedAt = this.now();
      this.state.totalElapsedMs = this.elapsedTotal();
      this.notify();
      await this.callHook("onRunComplete", { scenario: this.activeScenario, state: this.snapshot() });
    }
    return this.snapshot();
  }

  async callHook(name, payload) {
    const hook = this.hooks?.[name];
    if (typeof hook !== "function") return null;
    try { return await hook(copy(payload)); }
    catch (error) {
      this.state.warnings.push({ code: "EVENT_HOOK_FAILED", hook: name, message: error instanceof Error ? error.message.slice(0, 180) : "Replay event hook failed." });
      this.notify();
      return null;
    }
  }
}
