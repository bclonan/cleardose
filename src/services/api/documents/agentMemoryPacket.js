function lines(values = []) { return values.map((value) => String(value).trim()).filter(Boolean).slice(0, 12); }

export function createAgentMemoryPacket({ label = "ClearDose demo memory", goal = "", facts = [], decisions = [], nextSteps = [], flowIds = [] } = {}) {
  const packet = {
    id: `memory_${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
    artifactType: "agent-memory-packet",
    label: String(label || "ClearDose demo memory").trim().slice(0, 100),
    goal: String(goal || "").trim().slice(0, 500),
    facts: lines(facts), decisions: lines(decisions), nextSteps: lines(nextSteps), flowIds: lines(flowIds),
    createdAt: new Date().toISOString(),
    boundary: "User-reviewed demo context only. Do not infer clinical facts or retain data outside the user's chosen destination.",
  };
  packet.agentInstruction = "Review this packet with the user. If they approve, preserve only the explicit facts, decisions, next steps, and flow references in the memory mechanism they selected. Confirm what was retained and how it can be removed.";
  packet.markdown = [
    `# ${packet.label}`,
    "", `Goal: ${packet.goal || "Not specified."}`, "",
    "## Facts", ...(packet.facts.length ? packet.facts.map((item) => `- ${item}`) : ["- None recorded."]), "",
    "## Decisions", ...(packet.decisions.length ? packet.decisions.map((item) => `- ${item}`) : ["- None recorded."]), "",
    "## Next steps", ...(packet.nextSteps.length ? packet.nextSteps.map((item) => `- ${item}`) : ["- None recorded."]), "",
    "## Flow references", ...(packet.flowIds.length ? packet.flowIds.map((item) => `- ${item}`) : ["- None recorded."]), "",
    "## Agent instruction", packet.agentInstruction, "", `Boundary: ${packet.boundary}`,
  ].join("\n");
  return Object.freeze(packet);
}

