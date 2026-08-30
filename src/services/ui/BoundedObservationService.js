const DEFAULT_LIMITS = Object.freeze({
  maxArrayLength: 20,
  maxDepth: 4,
  maxObjectKeys: 40,
  maxStringLength: 240,
});

const SENSITIVE_KEY = /(?:password|passcode|secret|token|authorization|cookie|cardNumber|securityCode|memberId)/i;

function clonePrimitive(value, limits) {
  if (typeof value === "string") return value.slice(0, limits.maxStringLength);
  if (["number", "boolean"].includes(typeof value) || value == null) return value;
  return String(value).slice(0, limits.maxStringLength);
}

function boundedClone(value, limits, depth = 0, seen = new WeakSet()) {
  if (value == null || typeof value !== "object") return clonePrimitive(value, limits);
  if (depth >= limits.maxDepth) return "[depth-limited]";
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, limits.maxArrayLength).map((item) => boundedClone(item, limits, depth + 1, seen));
  }

  const result = {};
  Object.entries(value).slice(0, limits.maxObjectKeys).forEach(([key, item]) => {
    result[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : boundedClone(item, limits, depth + 1, seen);
  });
  return result;
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class BoundedObservationService {
  constructor({ readers = {}, limits = {} } = {}) {
    this.readers = new Map(Object.entries(readers));
    this.limits = Object.freeze({ ...DEFAULT_LIMITS, ...limits });
  }

  register(key, reader) {
    if (!String(key).trim() || typeof reader !== "function") throw new TypeError("An observation needs a stable key and reader function.");
    this.readers.set(String(key), reader);
    return () => this.readers.delete(String(key));
  }

  list() { return [...this.readers.keys()]; }

  async capture(keys = [], context = {}) {
    const snapshot = {};
    const requested = [...new Set(keys.map((key) => String(key)))];
    for (const key of requested) {
      const reader = this.readers.get(key);
      if (!reader) {
        snapshot[key] = { unavailable: true, reason: "Observation is not registered." };
        continue;
      }
      try {
        snapshot[key] = boundedClone(await reader(context), this.limits);
      } catch {
        snapshot[key] = { unavailable: true, reason: "Observation could not be read." };
      }
    }
    return Object.freeze(snapshot);
  }

  diff(before = {}, after = {}) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    return Object.freeze(keys.filter((key) => !sameValue(before[key], after[key])).map((key) => Object.freeze({
      key,
      before: boundedClone(before[key], this.limits),
      after: boundedClone(after[key], this.limits),
    })));
  }

  sanitize(value) { return boundedClone(value, this.limits); }
}

