function copy(value) { return value == null ? value : structuredClone(value); }

export class BrowserCapabilityTemplateDao {
  constructor({ storage = globalThis.localStorage, storageKey = "cleardose-capability-templates-v1" } = {}) {
    this.storage = storage; this.storageKey = storageKey; this.memory = [];
  }
  load() {
    try { return copy(JSON.parse(this.storage?.getItem(this.storageKey) || "[]")); }
    catch { return copy(this.memory); }
  }
  saveAll(records) {
    this.memory = copy(records);
    try { this.storage?.setItem(this.storageKey, JSON.stringify(records)); } catch { /* Local persistence is optional. */ }
    return this.load();
  }
}

