const requiredPorts = ["api", "catalog", "customers", "cart", "orders", "prescriptions", "dao"];

/**
 * Runtime contract guard for a ClearDose data adapter. Keeping this framework-free
 * makes browser, HTTP, IndexedDB, and test adapters interchangeable.
 */
export function assertClearDoseDataAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") throw new TypeError("A ClearDose data adapter is required.");
  const missing = requiredPorts.filter((port) => !adapter[port]);
  if (missing.length) throw new TypeError(`ClearDose data adapter is missing: ${missing.join(", ")}.`);
  return adapter;
}
