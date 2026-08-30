const SAFE_FACT_KEYS = new Set([
  "action",
  "drugId",
  "drugIds",
  "expectedVersion",
  "flowId",
  "fulfillmentMode",
  "limit",
  "locationId",
  "maxDeliveryDays",
  "postalCode",
  "purpose",
  "query",
  "requestId",
  "variantId",
  "variantIds",
]);

function copy(value) { return value == null ? value : structuredClone(value); }

function routePath(value) {
  const raw = String(value || "").trim();
  const hashPath = raw.includes("#") ? raw.slice(raw.indexOf("#") + 1) : raw;
  return (hashPath.split("?")[0] || "/").replace(/\/$/, "") || "/";
}

function qualifiedToolName(step) {
  const name = String(step?.toolName || step?.capabilityId?.split(".").at(-1) || "");
  return name.startsWith("cleardose_") ? name : `cleardose_${name}`;
}

function safeFactValue(value, depth = 0) {
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value.slice(0, 160);
  if (depth >= 3) return "[bounded]";
  if (Array.isArray(value)) return value.slice(0, 8).map((item) => safeFactValue(item, depth + 1));
  if (typeof value !== "object") return String(value).slice(0, 160);
  return Object.fromEntries(Object.entries(value).slice(0, 12).map(([key, item]) => [key, safeFactValue(item, depth + 1)]));
}

function requestFacts(request = {}) {
  return Object.fromEntries(Object.entries(request)
    .filter(([key]) => SAFE_FACT_KEYS.has(key))
    .map(([key, value]) => [key, safeFactValue(value)]));
}

function responseFacts(response = {}) {
  const content = response?.structuredContent ?? response ?? {};
  const comparison = content.comparison;
  const availability = content.availability;
  const runtime = content.runtime;
  const card = content.card;
  return {
    ok: content.ok !== false && !response?.isError,
    code: content.code ?? "",
    drugCount: Array.isArray(content.drugs) ? content.drugs.length : undefined,
    drugId: content.drug?.id ?? content.item?.drugId ?? "",
    variantCount: Array.isArray(content.drug?.variants) ? content.drug.variants.length : undefined,
    selectionCount: Array.isArray(comparison?.selections) ? comparison.selections.length : undefined,
    offerCount: Array.isArray(availability?.offers)
      ? availability.offers.length
      : Array.isArray(comparison?.selections?.[0]?.offers) ? comparison.selections[0].offers.length : undefined,
    locationId: availability?.location?.id ?? comparison?.location?.id ?? "",
    itemCount: Number.isFinite(content.itemCount) ? content.itemCount : undefined,
    total: Number.isFinite(content.total) ? content.total : undefined,
    flowCount: Array.isArray(runtime?.flows) ? runtime.flows.length : undefined,
    eventCount: Array.isArray(runtime?.events) ? runtime.events.length : undefined,
    cardId: card?.id ?? "",
    cardStatus: card?.status ?? "",
  };
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== ""));
}

export class ReplayDomProjectionService {
  constructor({
    documentRef = globalThis.document,
    eventFactory = (type) => new Event(type, { bubbles: true }),
  } = {}) {
    this.documentRef = documentRef;
    this.eventFactory = eventFactory;
    this.sequence = 0;
    this.state = Object.freeze({ status: "idle", sequence: 0 });
  }

  snapshot() { return copy(this.state); }

  reset() {
    this.sequence += 1;
    this.state = Object.freeze({ status: "idle", sequence: this.sequence });
    return this.snapshot();
  }

  query(selector) { return this.documentRef?.querySelector?.(selector) ?? null; }

  queryAll(selector) { return [...(this.documentRef?.querySelectorAll?.(selector) ?? [])]; }

  setValue(selector, value, control, changes) {
    if (value == null || value === "") return false;
    const element = this.query(selector);
    if (!element) return false;
    const next = String(value);
    const changed = String(element.value ?? "") !== next;
    element.value = next;
    element.dispatchEvent?.(this.eventFactory("input"));
    element.dispatchEvent?.(this.eventFactory("change"));
    changes.push({ control, changed });
    return true;
  }

  click(selector, control, changes) {
    const element = this.query(selector);
    if (!element || element.disabled) return false;
    element.click?.();
    changes.push({ control, changed: true });
    return true;
  }

  async showExplorerStep(step, request, changes) {
    const search = this.query('input[aria-label="Search WebMCP tools"]');
    if (!search) return false;
    const toolName = qualifiedToolName(step);
    this.setValue('input[aria-label="Search WebMCP tools"]', toolName, "explorer-tool-filter", changes);
    await Promise.resolve();
    await Promise.resolve();
    this.click(".explorer-tool-list button", "explorer-tool-selection", changes);
    await Promise.resolve();
    const textarea = this.query(".explorer-console textarea");
    if (textarea) {
      const facts = requestFacts(request);
      this.setValue(".explorer-console textarea", JSON.stringify(facts, null, 2), "explorer-request", changes);
    }
    return true;
  }

  projectSearch(request, changes) {
    return this.setValue(
      '[data-agent-section="medication-search"] input[name="query"], [data-agent-section="udi-search"] input[name="query"]',
      request?.query,
      "medication-query",
      changes,
    );
  }

  projectDrugDetail(response, changes) {
    const variantId = response?.structuredContent?.drug?.variants?.[0]?.id;
    let changed = this.setValue('select[name="availabilityVariantId"]', variantId, "exact-package", changes);
    const option = variantId
      ? this.query(`input[name="medication-variant"][value="${String(variantId).replace(/[^a-z0-9_-]/gi, "")}"]`)
      : null;
    if (option) {
      option.click?.();
      changes.push({ control: "exact-package", changed: true });
      changed = true;
    }
    if (this.query(".udi-result-list button")) changed = this.click(".udi-result-list button", "udi-result-selection", changes) || changed;
    return changed;
  }

  projectComparison(request, response, changes) {
    const firstDrugId = request?.drugId ?? request?.leftDrugId ?? request?.drugIds?.[0];
    const secondDrugId = request?.rightDrugId ?? request?.drugIds?.[1] ?? firstDrugId;
    const locationId = request?.locationId
      ?? response?.structuredContent?.comparison?.location?.id;
    let changed = this.setValue('select[name="leftMedicationId"]', firstDrugId, "comparison-anchor", changes);
    changed = this.setValue('select[name="purpose"]', request?.purpose, "comparison-purpose", changes) || changed;
    changed = this.setValue('select[name="rightMedicationId"]', secondDrugId, "comparison-option", changes) || changed;
    changed = this.setValue('select[name="leftVariantId"]', request?.variantIds?.[firstDrugId] ?? request?.leftVariantId, "comparison-package", changes) || changed;
    changed = this.setValue('select[name="locationId"]', locationId, "comparison-location", changes) || changed;
    return changed;
  }

  projectAvailability(request, response, changes) {
    const locationId = request?.locationId
      ?? response?.structuredContent?.availability?.location?.id;
    let changed = this.setValue('select[name="availabilityVariantId"], select[name="medication-variant"]', request?.variantId, "availability-package", changes);
    changed = this.setValue('select[name="demoLocationId"], select[name="detailLocationId"], select[name="locationId"]', locationId, "availability-location", changes) || changed;
    changed = this.setValue('select[name="fulfillmentMode"]', request?.fulfillmentMode, "availability-fulfillment", changes) || changed;
    changed = this.setValue('input[name="maxDeliveryDays"]', request?.maxDeliveryDays, "availability-deadline", changes) || changed;
    if (this.query("form.availability-controls")) changed = this.click('form.availability-controls button[type="submit"]', "availability-results", changes) || changed;
    return changed;
  }

  visibleCounts() {
    return compactObject({
      medicationCards: this.queryAll(".medication-card").length || undefined,
      providerOffers: this.queryAll("[data-availability-offer]").length || undefined,
      cartItems: this.queryAll(".cart-item").length || undefined,
      cartBadges: this.queryAll(".cart-count").length || undefined,
      stateNodes: this.queryAll(".workflow-state-node").length || undefined,
      questionCards: this.queryAll(".doctor-question-card").length || undefined,
    });
  }

  async project({ route, step, request = {}, response = {}, error = null } = {}) {
    const activeElement = this.documentRef?.activeElement ?? null;
    const changes = [];
    const path = routePath(route);
    const toolName = String(step?.toolName || step?.capabilityId?.split(".").at(-1) || "");
    let projected = await this.showExplorerStep(step, request, changes);

    if (toolName === "search_drug_index") projected = this.projectSearch(request, changes) || projected;
    if (toolName === "get_drug_index_entry") projected = this.projectDrugDetail(response, changes) || projected;
    if (["find_compatible_options", "compare_medication_options"].includes(toolName)) projected = this.projectComparison(request, response, changes) || projected;
    if (["get_drug_availability", "compare_drug_availability", "estimate_delivery"].includes(toolName)) projected = this.projectAvailability(request, response, changes) || projected;

    await Promise.resolve();
    const focusPreserved = !activeElement || this.documentRef?.activeElement === activeElement;
    if (!focusPreserved && activeElement?.focus) activeElement.focus({ preventScroll: true });

    this.sequence += 1;
    this.state = Object.freeze({
      status: projected ? "projected" : "state-reactive",
      sequence: this.sequence,
      route: path,
      stepId: String(step?.id || ""),
      toolName,
      request: requestFacts(request),
      response: compactObject({ ...responseFacts(response), ...(error ? { ok: false, code: error.code ?? "REPLAY_STEP_FAILED" } : {}) }),
      controls: changes,
      visible: this.visibleCounts(),
      focusPreserved: !activeElement || this.documentRef?.activeElement === activeElement,
    });
    return this.snapshot();
  }
}
