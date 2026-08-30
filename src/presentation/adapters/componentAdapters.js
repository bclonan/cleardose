export const medicationCardAdapter = Object.freeze({
  selectDisplayVariant(medication) { return medication.variants[0]; },
  routeFor(medication) { return `/medications/${medication.slug}`; },
});

export const statusBadgeAdapter = Object.freeze({
  label(status) {
    return ({
      ready: "Ready to order",
      processing: "Pharmacy review",
      "needs-renewal": "Renewal needed",
      delivered: "Delivered",
      shipped: "Shipped",
      "waiting-for-prescription": "Waiting for prescription",
    })[status] ?? status;
  },
});

export const accountNavAdapter = Object.freeze({
  items() {
    return [
      { to: "/account", icon: "user", label: "Overview" },
      { to: "/account/prescriptions", icon: "prescriptions", label: "Prescriptions" },
      { to: "/account/orders", icon: "orders", label: "Orders" },
      { href: "#profile", icon: "settings", label: "Profile & delivery" },
    ];
  },
});

export const agentReadyHostAdapter = Object.freeze({
  resolve(component) { return component; },
});

export const webMcpStatusAdapter = Object.freeze({
  label(runtime) {
    if (runtime.status === "ready") return `${runtime.registered} agent tools ready`;
    if (runtime.status === "unsupported") return `${runtime.available} agent tools available`;
    if (runtime.status === "error") return "Agent tools need attention";
    return "Preparing agent tools";
  },
});

export const agentControlCenterAdapter = Object.freeze({
  ctaLabel(count) { return `Agent tools${count ? ` (${count})` : ""}`; },
  toolKind(tool) { return tool.annotations?.readOnlyHint ? "Read only" : "Changes demo state"; },
});

export const comparisonPanelAdapter = Object.freeze({
  defaultLeft(medications) { return medications.find((item) => item.id === "med_lisinopril")?.id ?? medications[0]?.id ?? ""; },
  defaultRight(medications) { return medications.find((item) => item.id === "med_lisinopril")?.id ?? medications[0]?.id ?? ""; },
  variantFor(medication, variantId) { return medication?.variants.find((item) => item.id === variantId) ?? medication?.variants[0]; },
});

export const workflowLiveViewerAdapter = Object.freeze({
  stateLabel(value) { return String(value).replaceAll("_", " "); },
  eventLabel(value) { return String(value).replaceAll("_", " "); },
  timeLabel(value) { return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(value)); },
});

export const doctorQuestionCardAdapter = Object.freeze({
  print() { globalThis.print?.(); },
  async copy(text) { return clipboardService.copy(text); },
});

export const promptGuideAdapter = Object.freeze({
  recognitionConstructor() { return globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition ?? null; },
});
import { ClipboardService } from "../../services/ui/ClipboardService";

const clipboardService = new ClipboardService();
