import AccountNav from "../components/AccountNav.vue";
import AgentControlCenter from "../components/AgentControlCenter.vue";
import AgentReadyHost from "../components/AgentReadyHost.vue";
import AgentReadyForm from "../components/AgentReadyForm.vue";
import MedicationCard from "../components/MedicationCard.vue";
import ComparisonPanel from "../components/ComparisonPanel.vue";
import StatusBadge from "../components/StatusBadge.vue";
import WebMcpStatus from "../components/WebMcpStatus.vue";

export const clearDoseComponents = Object.freeze({
  AccountNav,
  AgentControlCenter,
  AgentReadyHost,
  AgentReadyForm,
  MedicationCard,
  ComparisonPanel,
  StatusBadge,
  WebMcpStatus,
});

export function registerClearDoseComponents(app, { prefix = "Cd" } = {}) {
  Object.entries(clearDoseComponents).forEach(([name, component]) => {
    app.component(`${prefix}${name}`, component);
  });
  return clearDoseComponents;
}
