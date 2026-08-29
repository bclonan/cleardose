function normalizeName(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
}

export class WebMcpToolRegistry {
  constructor({ adapter, namespace = "cleardose" }) {
    this.adapter = adapter;
    this.namespace = normalizeName(namespace);
    this.registrations = new Map();
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
      tools: records.map(({ name, status, error }) => ({ name, status, error: error ?? null })),
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

  async registerDefinitions(definitions, { namespace = this.namespace } = {}) {
    const registered = [];
    for (const definition of definitions) {
      const name = this.qualify(definition.name, namespace);
      this.registrations.get(name)?.unregister?.();
      const registration = await this.adapter.register({ ...definition, name });
      this.registrations.set(name, registration);
      registered.push(registration);
      this.notify();
    }
    return registered;
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
      });
      this.notify();
    };
  }

  unregisterAll() {
    this.registrations.forEach((registration) => registration.unregister());
    this.registrations.clear();
    this.notify();
  }
}
