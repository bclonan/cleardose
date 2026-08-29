export const agentReadyProps = {
  adapter: { type: Object, default: null },
  mcpTools: { type: Array, default: () => [] },
  mcpContext: { type: Object, default: () => ({}) },
  registerMcp: { type: Boolean, default: true },
};
