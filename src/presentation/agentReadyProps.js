export const agentReadyProps = {
  adapter: { type: Object, default: null },
  mcpTools: { type: Array, default: () => [] },
  imperativeTools: { type: Array, default: () => [] },
  declarativeTool: { type: Object, default: null },
  mcp: { type: Object, default: () => ({}) },
  mcpMode: {
    type: String,
    default: "auto",
    validator: (value) => ["auto", "imperative", "declarative", "both"].includes(value),
  },
  mcpContext: { type: Object, default: () => ({}) },
  registerMcp: { type: Boolean, default: true },
};
