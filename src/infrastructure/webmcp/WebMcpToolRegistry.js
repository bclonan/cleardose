function normalizeName(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
}

export class WebMcpToolInvocationError extends Error {
  constructor(message, { code = "TOOL_NOT_AVAILABLE", toolName = "" } = {}) {
    super(message);
    this.name = "WebMcpToolInvocationError";
    this.code = code;
    this.toolName = toolName;
  }
}

export class WebMcpToolRegistry {
  constructor({ adapter, namespace = "cleardose" }) {
    this.adapter = adapter;
    this.namespace = normalizeName(namespace);
    this.registrations = new Map();
    this.executors = new Map();
    this.listeners = new Set();
  }

  snapshot() {
    const records = [...this.registrations.values()];
    const registered = records.filter((item) => item.status === "registered").length;
    const errors = records.filter((item) => item.status === "error").length;
    const available = records.length;
    return Object.freeze({
      supported: this.adapter.isSupported(),
      status: errors ? "error" : registered ? "ready" : available ? "unsupported" : "idle",
      available,
      registered,
      tools: records.map(({
        name, namespace, title, description, inputSchema, outputSchema, annotations, status, error,
        capabilityId, category, interactionModel, registration, machine, examplePrompt, voicePrompt,
        advancedPrompt, expectedResult, routes, permissions, exampleRequests, exampleResponse,
        deterministicErrors, relatedTools, scenarioIds,
      }) => ({
        name,
        namespace: namespace ?? this.namespace,
        title: title ?? name,
        description: description ?? "",
        inputSchema: inputSchema ?? { type: "object", properties: {} },
        outputSchema: outputSchema ?? { type: "object", properties: {} },
        annotations: annotations ?? {},
        status,
        error: error ?? null,
        capabilityId: capabilityId ?? "",
        category: category ?? "uncategorized",
        interactionModel: interactionModel ?? "imperative",
        registration: registration ?? interactionModel ?? "imperative",
        machine: machine ?? null,
        examplePrompt: examplePrompt ?? "",
        voicePrompt: voicePrompt ?? examplePrompt ?? "",
        advancedPrompt: advancedPrompt ?? examplePrompt ?? "",
        expectedResult: expectedResult ?? "",
        routes: routes ?? ["*"],
        permissions: permissions ?? [],
        exampleRequests: exampleRequests ?? [],
        exampleResponse: exampleResponse ?? null,
        deterministicErrors: deterministicErrors ?? [],
        relatedTools: relatedTools ?? [],
        scenarioIds: scenarioIds ?? [],
        locallyInvokable: this.executors.has(name),
      })),
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  notify() { this.listeners.forEach((listener) => listener(this.snapshot())); }

  qualify(name, namespace = this.namespace) {
    const normalized = normalizeName(name);
    return normalized.startsWith(`${namespace}_`) ? normalized : `${namespace}_${normalized}`;
  }

  resolveName(name, namespace = this.namespace) {
    const normalized = normalizeName(name);
    if (this.registrations.has(normalized) || this.executors.has(normalized)) return normalized;
    return this.qualify(normalized, namespace);
  }

  async registerDefinitions(definitions, { namespace = this.namespace } = {}) {
    const registered = [];
    for (const definition of definitions) {
      const name = this.qualify(definition.name, namespace);
      this.registrations.get(name)?.unregister?.();
      this.executors.delete(name);
      const qualifiedDefinition = { namespace: normalizeName(namespace), ...definition, name };
      const registration = await this.adapter.register(qualifiedDefinition);
      const record = { ...registration, ...qualifiedDefinition, execute: undefined };
      if (typeof qualifiedDefinition.execute === "function") this.executors.set(name, qualifiedDefinition.execute);
      this.registrations.set(name, record);
      registered.push(record);
      this.notify();
    }
    return registered;
  }

  async invoke(name, input = {}, context = {}) {
    const toolName = this.resolveName(name);
    const execute = this.executors.get(toolName);
    if (!execute) {
      throw new WebMcpToolInvocationError(`Tool ${toolName || String(name)} is not available for local invocation.`, { toolName });
    }
    return execute(input ?? {}, Object.freeze({ source: "local", ...context, toolName }));
  }

  async registerComponentTools({ component, tools, context }) {
    const definitions = tools.map((tool) => ({
      ...tool,
      execute: (input) => tool.execute(input, context),
    }));
    const registrations = await this.registerDefinitions(definitions, {
      namespace: `${this.namespace}_${normalizeName(component)}`,
    });
    return () => {
      registrations.forEach((registration) => {
        registration.unregister();
        this.registrations.delete(registration.name);
        this.executors.delete(registration.name);
      });
      this.notify();
    };
  }

  unregister(name) {
    const qualifiedName = this.resolveName(name);
    const registration = this.registrations.get(qualifiedName);
    if (!registration) return false;
    registration.unregister?.();
    this.registrations.delete(qualifiedName);
    this.executors.delete(qualifiedName);
    this.notify();
    return true;
  }

  has(name) { return this.registrations.has(this.qualify(name)); }

  unregisterAll() {
    this.registrations.forEach((registration) => registration.unregister());
    this.registrations.clear();
    this.executors.clear();
    this.notify();
  }
}
