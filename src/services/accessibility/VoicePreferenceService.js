const DEFAULT_STORAGE_KEY = "cleardose-voice-guidance";

function browserStorage() {
  try { return globalThis.localStorage; }
  catch { return null; }
}

export class VoicePreferenceService {
  constructor({ storage, storageKey = DEFAULT_STORAGE_KEY } = {}) {
    this.storage = storage === undefined ? browserStorage() : storage;
    this.storageKey = storageKey;
    this.memoryEnabled = false;
  }

  load() {
    try {
      const stored = this.storage?.getItem(this.storageKey);
      if (stored === "on" || stored === "off") this.memoryEnabled = stored === "on";
    } catch { /* Keep the in-memory preference when browser storage is denied. */ }
    return this.memoryEnabled;
  }

  save(enabled) {
    this.memoryEnabled = Boolean(enabled);
    try { this.storage?.setItem(this.storageKey, this.memoryEnabled ? "on" : "off"); }
    catch { /* Voice guidance still works for this session. */ }
    return this.memoryEnabled;
  }
}
