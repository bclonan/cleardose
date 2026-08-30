// Public extension surface for host applications and future WebMCP packages.
export { createClearDosePlugin } from "./app/createClearDosePlugin";
export { clearDoseComponents, registerClearDoseComponents } from "./app/componentRegistry";
export { ClearDoseFacade } from "./application/facades/ClearDoseFacade";
export { usePharmacyStore, formatMoney } from "./stores/pharmacyStore";
export { agentReadyProps } from "./presentation/agentReadyProps";
export { createClearDoseBrowserAdapter } from "./infrastructure/adapters/createClearDoseBrowserAdapter";
export { createMockPharmacyApi, MockPharmacyApi, mockSeed } from "./services/api";
export { UniversalDrugIndex, drugConcepts, demoInteractionRules } from "./services/api";
export { BrowserWebMcpAdapter } from "./infrastructure/webmcp/BrowserWebMcpAdapter";
export { WebMcpToolRegistry } from "./infrastructure/webmcp/WebMcpToolRegistry";
export { createDefaultTools } from "./infrastructure/webmcp/tools/createDefaultTools";
export { SectionHighlightService } from "./services/ui/SectionHighlightService";
export { VoiceGuidanceService } from "./services/accessibility/VoiceGuidanceService";
export { getVoiceJourney } from "./services/accessibility/voiceJourneys";
export * from "./domain/dto";
