import { clone } from "../../domain/shared/clone";

export class BrowserStateDao {
  constructor({ storage, storageKey, seed }) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.seed = seed;
  }

  initialState() {
    return clone(this.seed());
  }

  read() {
    try {
      const stored = this.storage?.getItem(this.storageKey);
      return stored ? { ...this.initialState(), ...JSON.parse(stored) } : this.initialState();
    } catch {
      return this.initialState();
    }
  }

  write(state) {
    const snapshot = clone(state);
    this.storage?.setItem(this.storageKey, JSON.stringify(snapshot));
    return snapshot;
  }

  mutate(mutator) {
    const state = this.read();
    const result = mutator(state);
    this.write(state);
    return result;
  }

  reset() {
    this.storage?.removeItem(this.storageKey);
    return this.initialState();
  }
}

export class MemoryStorageAdapter {
  constructor() {
    this.values = new Map();
  }

  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
