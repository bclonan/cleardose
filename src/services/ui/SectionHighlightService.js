const DEFAULT_TARGETS = Object.freeze([
  "medication-search",
  "comparison-results",
  "demo-side-by-side",
  "how-webmcp-works",
  "tool-catalog",
  "cart-summary",
  "checkout-flow",
  "provider-handoff",
  "primary-price",
  "add-to-cart-action",
  "agent-tools-control",
  "udi-search",
  "udi-results",
  "udi-lab",
  "workflow-runtime",
  "question-card",
  "failure-lab",
  "hackathon-shortcuts",
  "prompt-chain",
  "shortcut-observatory",
  "machine-inspector",
  "agent-memory",
  "prescription-recovery",
  "capability-studio",
  "studio-runtime",
  "demo-lab",
  "route-demo-scenarios",
  "programmatic-replay",
  "webmcp-explorer",
  "webmcp-console",
  "state-graph",
  "availability-results",
]);

export class SectionHighlightService {
  constructor({ documentRef = globalThis.document, duration = 5000 } = {}) {
    this.documentRef = documentRef;
    this.duration = duration;
    this.timer = null;
    this.activeElement = null;
  }

  listTargets() { return [...DEFAULT_TARGETS]; }

  highlight(target) {
    const escapedTarget = globalThis.CSS?.escape?.(target) ?? String(target).replace(/[^a-z0-9_-]/gi, "");
    const element = this.documentRef?.querySelector(`[data-agent-section="${escapedTarget}"]`);
    if (!element) return { ok: false, target, message: `Section "${target}" is not available on this page.` };

    this.clear();
    this.activeElement = element;
    element.classList.add("agent-highlighted");
    const reduceMotion = this.documentRef?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    element.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    const EventConstructor = this.documentRef?.defaultView?.CustomEvent ?? globalThis.CustomEvent;
    if (EventConstructor) this.documentRef.dispatchEvent?.(new EventConstructor("cleardose:highlight", { detail: { target } }));
    this.timer = globalThis.setTimeout(() => this.clear(), this.duration);
    return { ok: true, target, message: `Highlighted ${target.replaceAll("-", " ")}.` };
  }

  clear() {
    if (this.timer) globalThis.clearTimeout(this.timer);
    this.timer = null;
    this.activeElement?.classList.remove("agent-highlighted");
    this.activeElement = null;
  }
}
