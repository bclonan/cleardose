import AccountNav from "../components/AccountNav.vue";
import AgentControlCenter from "../components/AgentControlCenter.vue";
import AgentReadyHost from "../components/AgentReadyHost.vue";
import AgentReadyForm from "../components/AgentReadyForm.vue";
import MedicationCard from "../components/MedicationCard.vue";
import ComparisonPanel from "../components/ComparisonPanel.vue";
import StatusBadge from "../components/StatusBadge.vue";
import WebMcpStatus from "../components/WebMcpStatus.vue";
import WorkflowLiveViewer from "../components/WorkflowLiveViewer.vue";
import DoctorQuestionCard from "../components/DoctorQuestionCard.vue";
import PromptGuide from "../components/PromptGuide.vue";
import CapabilityMachinePane from "../components/CapabilityMachinePane.vue";
import HackathonLauncher from "../components/HackathonLauncher.vue";
import PrescriptionRecoveryPanel from "../components/PrescriptionRecoveryPanel.vue";
import CapabilityStudioVoiceGuide from "../components/CapabilityStudioVoiceGuide.vue";

export const clearDoseComponents = Object.freeze({
  AccountNav,
  AgentControlCenter,
  AgentReadyHost,
  AgentReadyForm,
  MedicationCard,
  ComparisonPanel,
  StatusBadge,
  WebMcpStatus,
  WorkflowLiveViewer,
  DoctorQuestionCard,
  PromptGuide,
  CapabilityMachinePane,
  HackathonLauncher,
  PrescriptionRecoveryPanel,
  CapabilityStudioVoiceGuide,
});

export function registerClearDoseComponents(app, { prefix = "Cd" } = {}) {
  Object.entries(clearDoseComponents).forEach(([name, component]) => {
    app.component(`${prefix}${name}`, component);
  });
  return clearDoseComponents;
}
