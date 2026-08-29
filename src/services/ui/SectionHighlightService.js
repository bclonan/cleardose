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
    if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus({ preventScroll: true });
    this.documentRef.dispatchEvent(new CustomEvent("cleardose:highlight", { detail: { target } }));
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
