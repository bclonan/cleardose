// Public extension surface for host applications and future WebMCP packages.
export { createClearDosePlugin } from "./app/createClearDosePlugin";
export { clearDoseComponents, registerClearDoseComponents } from "./app/componentRegistry";
export { ClearDoseFacade } from "./application/facades/ClearDoseFacade";
export { usePharmacyStore, formatMoney } from "./stores/pharmacyStore";
export { agentReadyProps } from "./presentation/agentReadyProps";
export { createClearDoseBrowserAdapter } from "./infrastructure/adapters/createClearDoseBrowserAdapter";
export { BrowserWebMcpAdapter } from "./infrastructure/webmcp/BrowserWebMcpAdapter";
export { WebMcpToolRegistry } from "./infrastructure/webmcp/WebMcpToolRegistry";
export { createDefaultTools } from "./infrastructure/webmcp/tools/createDefaultTools";
export * from "./domain/dto";
