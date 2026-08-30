function copy(value) {
  return value == null ? value : structuredClone(value);
}

export class MemoryWorkflowDao {
  constructor({ reason = "Explicit memory adapter" } = {}) {
    this.reason = reason;
    this.flows = new Map();
    this.events = new Map();
    this.exchanges = new Map();
    this.cards = new Map();
    this.drugs = new Map();
  }

  async initialize({ drugs = [] } = {}) {
    drugs.forEach((drug) => this.drugs.set(drug.id, copy(drug)));
    return this.status();
  }

  status() {
    return Object.freeze({
      engine: "memory",
      persistence: "session",
      state: "ready",
      fallbackReason: this.reason,
      drugCount: this.drugs.size,
    });
  }

  async appendEvent(event, flow) {
    this.events.set(event.id, copy(event));
    this.flows.set(flow.id, copy(flow));
  }

  async saveExchange(exchange) { this.exchanges.set(exchange.id, copy(exchange)); }
  async saveCard(card) { this.cards.set(card.id, copy(card)); }

  async loadSnapshot() {
    return {
      flows: copy([...this.flows.values()]),
      events: copy([...this.events.values()]),
      exchanges: copy([...this.exchanges.values()]),
      cards: copy([...this.cards.values()]),
      database: this.status(),
    };
  }

  async clearWorkflowData() {
    this.flows.clear();
    this.events.clear();
    this.exchanges.clear();
    this.cards.clear();
  }
}

