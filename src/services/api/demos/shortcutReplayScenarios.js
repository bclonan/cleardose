import { hackathonShortcuts } from "../shortcuts/hackathonShortcuts.js";

const MOCK_DISCLOSURE = Object.freeze({
  label: "Seeded local mock",
  detail: "This replay uses fictional records and local handlers. It does not place an order, send payment, contact a clinician or pharmacy, or export a memory packet.",
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function reference(path, fallback) {
  return fallback === undefined ? { $from: path } : { $from: path, $default: fallback };
}

const inputPlans = Object.freeze({
  "full-judge-tour": Object.freeze({
    search: { query: "lisinopril", limit: 5 },
    inspect: { drugId: reference("steps.search.response.structuredContent.drugs.0.id") },
    compare: { drugIds: [reference("steps.search.response.structuredContent.drugs.0.id")] },
    related: { drugId: reference("steps.search.response.structuredContent.drugs.0.id"), limit: 5 },
    flags: { drugIds: ["med_sildenafil", "med_isosorbide_mononitrate"] },
    plan: {
      items: [{
        drugId: reference("steps.search.response.structuredContent.drugs.0.id"),
        strength: reference("steps.inspect.response.structuredContent.drug.variants.0.strength"),
        quantity: reference("steps.inspect.response.structuredContent.drug.variants.0.quantity"),
      }],
      strategy: "balanced",
    },
    add: {
      drugId: reference("steps.search.response.structuredContent.drugs.0.id"),
      variantId: reference("steps.inspect.response.structuredContent.drug.variants.0.id"),
    },
    cart: {},
    rx: {
      drugId: reference("steps.search.response.structuredContent.drugs.0.id"),
      preferredPath: "undecided",
      questions: ["What administrative prescription steps should I review with my prescriber?"],
    },
    "card-prepare": {
      drugId: reference("steps.search.response.structuredContent.drugs.0.id"),
      concerns: ["What benefits, risks, and monitoring should I ask about?", "Which fictional cost facts should I verify?"],
    },
    "card-submit": {
      exchangeId: reference("steps.card-prepare.response.structuredContent.exchangeId"),
      title: "Questions for my fictional ClearDose review",
      questions: ["What benefits, risks, and monitoring needs should we discuss?", "Which cost facts should I verify before making any decision?"],
    },
    focus: { target: "workflow-runtime" },
    memory: {
      label: "ClearDose judge tour memory",
      goal: "Review the fictional demo decisions and next steps.",
      facts: ["All medications, providers, prices, and workflows are fictional.", "The replay stopped before checkout and external contact."],
      decisions: ["Keep all clinician-facing content in human review."],
      nextSteps: ["Inspect the bounded workflow history.", "Copy or save this packet only after review."],
      flowIds: [reference("steps.card-prepare.response.structuredContent.flowId")],
    },
    runtime: { limit: 40 },
  }),
  "price-comparison": Object.freeze({
    search: { query: "lisinopril", limit: 5 },
    compare: { drugIds: [reference("steps.search.response.structuredContent.drugs.0.id")] },
    highlight: { target: "shortcut-observatory" },
  }),
  "prescription-recovery": Object.freeze({
    rx: { drugId: "med_lisinopril", preferredPath: "undecided", questions: ["What should I confirm before choosing a follow-up path?"] },
    memory: {
      label: "Prescription follow-up review",
      facts: ["The prescription follow-up is a fictional local draft."],
      decisions: ["No prescriber contact or transfer was started."],
      nextSteps: ["Review the editable follow-up before any external action."],
      flowIds: [reference("steps.rx.response.structuredContent.followUp.flowId")],
    },
  }),
  "doctor-question-card": Object.freeze({
    prepare: { drugId: "med_lisinopril", concerns: ["What benefits and risks should I discuss?", "What monitoring should I ask about?"] },
    submit: {
      exchangeId: reference("steps.prepare.response.structuredContent.exchangeId"),
      title: "Questions for my visit",
      questions: ["What benefits and risks should we discuss?", "What monitoring should I ask about?"],
    },
  }),
  "negative-recovery-lab": Object.freeze({
    invalid: { limit: 30 },
    stock: { items: [{ drugId: "med_lisinopril", strength: "5mg", quantity: 30 }], strategy: "balanced" },
    price: { drugIds: ["med_lisinopril"] },
    rx: { drugId: "med_lisinopril", preferredPath: "undecided" },
  }),
  "single-runtime-inspection": Object.freeze({ inspect: { limit: 40 } }),
  "declarative-form-tour": Object.freeze({
    filter: {
      action: "invoke-declarative-webmcp",
      requiredRoute: "/udi",
      arguments: { query: "lisinopril" },
    },
    note: {
      action: "invoke-declarative-webmcp",
      requiredRoute: "/contact-doctor",
      arguments: {
        "patient-name": "Jamie Demo",
        "patient-email": "jamie@demo.invalid",
        "provider-name": "Dr. Sample",
        "provider-phone": "410-555-0100",
        medication: "Lisinopril 10mg",
      },
    },
  }),
});

function replayStep(shortcutStep, input) {
  const declarative = input?.action === "invoke-declarative-webmcp";
  const baseToolName = shortcutStep.capabilityId.split(".").at(-1);
  const invokedToolName = declarative ? `cleardose_${baseToolName}` : baseToolName;
  return {
    id: shortcutStep.id,
    title: shortcutStep.title,
    kind: declarative ? "action" : "tool",
    ...(declarative ? { action: input.action } : {}),
    capabilityId: shortcutStep.capabilityId,
    toolName: invokedToolName,
    input: declarative
      ? { toolName: invokedToolName, requiredRoute: input.requiredRoute, arguments: input.arguments }
      : input,
    ...(declarative ? { recovery: { label: `Open ${input.requiredRoute} and run the visible form capability there.`, route: input.requiredRoute } } : {}),
    mocked: true,
    pauseAfterMs: 250,
    observe: ["workflow.current", "workflow.history"],
  };
}

function replayScenario(shortcut) {
  const inputs = inputPlans[shortcut.id];
  if (!inputs) throw new TypeError(`Missing replay inputs for shortcut: ${shortcut.id}.`);
  const steps = shortcut.steps.map((shortcutStep) => {
    if (!Object.hasOwn(inputs, shortcutStep.id)) throw new TypeError(`Missing replay input for ${shortcut.id}.${shortcutStep.id}.`);
    return replayStep(shortcutStep, inputs[shortcutStep.id]);
  });
  const declarative = steps.some((item) => item.kind === "action");
  return deepFreeze({
    id: `shortcut-${shortcut.id}`,
    sourceShortcutId: shortcut.id,
    title: `${shortcut.title} replay`,
    summary: `Invoke the ${steps.length} capabilities listed on the ${shortcut.title} card in the same order.`,
    routes: ["/shortcuts"],
    prompts: {
      human: shortcut.prompt,
      voice: `${shortcut.prompt} Read each local result aloud and stop before any action that needs my control.`,
      advanced: `${shortcut.prompt} Invoke the exact listed capability for each step, use structured results for later ids, and stop on the first blocked or failed call.`,
    },
    expectedResult: {
      summary: declarative
        ? "Each visible-form capability runs only when its named form is present. Otherwise the trace stops with the required route and does not claim completion."
        : `All ${steps.length} listed capabilities return deterministic local results in order. Human-only actions remain pending.`,
      checks: ["Every trace name matches its listed capability.", "A blocked or failed step stops the run.", "No order, payment, provider contact, transfer, clipboard write, or file write occurs."],
    },
    capabilityIds: [...new Set(steps.map((item) => item.capabilityId))],
    mocked: true,
    mockDisclosure: MOCK_DISCLOSURE,
    recoveryScenarioIds: [],
    steps,
  });
}

export const shortcutReplayScenarios = Object.freeze(hackathonShortcuts.map(replayScenario));
const replayByShortcutId = new Map(shortcutReplayScenarios.map((item) => [item.sourceShortcutId, item]));

export function getShortcutReplayScenario(shortcutId) {
  return replayByShortcutId.get(String(shortcutId)) ?? null;
}
