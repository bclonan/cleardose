import AccountNav from "../components/AccountNav.vue";
import AgentReadyHost from "../components/AgentReadyHost.vue";
import MedicationCard from "../components/MedicationCard.vue";
import StatusBadge from "../components/StatusBadge.vue";
import WebMcpStatus from "../components/WebMcpStatus.vue";

export const clearDoseComponents = Object.freeze({
  AccountNav,
  AgentReadyHost,
  MedicationCard,
  StatusBadge,
  WebMcpStatus,
});

export function registerClearDoseComponents(app, { prefix = "Cd" } = {}) {
  Object.entries(clearDoseComponents).forEach(([name, component]) => {
    app.component(`${prefix}${name}`, component);
  });
  return clearDoseComponents;
}
