import { normalizeDemoRoute } from "../../../domain/shared/demoRoute.js";

const DISCLOSURE = Object.freeze({
  label: "Seeded local mock",
  detail: "This one-step replay uses the capability's seeded example. It contacts no pharmacy, clinician, insurer, payment service, or patient record.",
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function safeSlug(value) {
  const slug = String(value || "capability").toLowerCase().replace(/^cleardose_/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return slug || "capability";
}

export function capabilityReplayScenarioId(capability) {
  return `capability-${safeSlug(capability?.toolName || capability?.qualifiedName || capability?.name)}`;
}

export function createCapabilityReplayScenario(capability, { route = "/" } = {}) {
  if (!capability || typeof capability !== "object") throw new TypeError("A capability replay needs a capability contract.");
  const interactionModel = capability.interactionModel === "declarative" ? "declarative" : "imperative";
  const qualifiedName = String(capability.qualifiedName || capability.name || "");
  const toolName = String(capability.toolName || qualifiedName.replace(/^cleardose_/, ""));
  if (!/^[a-z][a-z0-9_]{2,119}$/.test(toolName) || !/^[a-z][a-z0-9_]{2,159}$/.test(qualifiedName)) {
    throw new TypeError("A capability replay needs stable lowercase tool names.");
  }
  const currentRoute = normalizeDemoRoute(route);
  const declaredRoutes = Array.isArray(capability.routes) ? capability.routes : [];
  const replayRoute = declaredRoutes.includes("*") || declaredRoutes.includes("global") || declaredRoutes.includes(currentRoute)
    ? currentRoute
    : normalizeDemoRoute(declaredRoutes.find((item) => String(item).startsWith("/")) || currentRoute);
  const example = structuredClone(capability.exampleRequests?.[0] ?? {});
  const title = String(capability.title || toolName.replaceAll("_", " ")).slice(0, 160);
  const capabilityId = String(capability.id || `cleardose.dynamic.${toolName}`).slice(0, 180);
  const step = {
    id: "invoke-capability",
    title: `Run ${title}`,
    kind: interactionModel === "declarative" ? "action" : "tool",
    capabilityId,
    toolName,
    ...(interactionModel === "declarative" ? {
      action: "invoke-declarative-webmcp",
      input: { toolName: qualifiedName, arguments: example },
    } : { input: example }),
    mocked: true,
    pauseAfterMs: 0,
    observe: ["route.current", "workflow.current", "workflow.history", "focus"],
  };
  return deepFreeze({
    id: capabilityReplayScenarioId(capability),
    title: `Capability replay: ${title}`,
    summary: `Run the seeded ${interactionModel} handler for ${qualifiedName} and record its exact request, response, timing, and visible changes.`,
    routes: [replayRoute],
    prompts: {
      human: String(capability.examplePrompt || `Run ${title} with seeded data.`),
      voice: String(capability.voicePrompt || `Run ${title} with seeded data and read back the result.`),
      advanced: String(capability.advancedPrompt || `Invoke ${qualifiedName} through the shared local replay runtime and return its structured trace.`),
    },
    expectedResult: {
      summary: String(capability.expectedResult || "One bounded local result and a replay trace for human inspection."),
      checks: ["The exact declared handler runs once.", "The trace shows request, response, timing, and bounded changes.", "Final submission remains under human control."],
    },
    mocked: true,
    mockDisclosure: DISCLOSURE,
    recoveryScenarioIds: [],
    capabilityIds: [capabilityId],
    steps: [step],
  });
}
