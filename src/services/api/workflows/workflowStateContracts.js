const EMPTY_INPUT_SCHEMA = Object.freeze({
  type: "object",
  properties: Object.freeze({}),
  additionalProperties: false,
});

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function normalizeAction(value, field = "action") {
  const action = String(value || "").trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]*$/.test(action)) throw new TypeError(`${field} must use UPPER_SNAKE_CASE.`);
  return action;
}

function normalizeStates(states) {
  if (!Array.isArray(states) || states.length < 1 || new Set(states).size !== states.length) {
    throw new TypeError("Workflow states must be a non-empty unique array.");
  }
  const normalized = states.map((state) => String(state || "").trim());
  if (normalized.some((state) => !/^[a-z][a-z0-9_]*$/.test(state))) {
    throw new TypeError("Workflow states must use snake_case.");
  }
  return normalized;
}

function normalizeTransition(transition, states) {
  const from = Array.isArray(transition.from) ? transition.from.map(String) : [String(transition.from || "")];
  if (!from.length || from.some((state) => !states.includes(state))) throw new TypeError("Every transition source must name a workflow state.");
  const to = String(transition.to || "");
  if (!states.includes(to)) throw new TypeError(`Transition target ${to || "(empty)"} is not a workflow state.`);
  const action = normalizeAction(transition.action);
  const aliases = [...new Set((transition.aliases ?? []).map((alias) => normalizeAction(alias, "alias")))].filter((alias) => alias !== action);
  const inputSchema = transition.inputSchema ?? EMPTY_INPUT_SCHEMA;
  if (inputSchema.type !== "object" || inputSchema.additionalProperties !== false) {
    throw new TypeError(`Transition ${action} needs a closed object input schema.`);
  }
  return freeze({
    action,
    aliases,
    from,
    to,
    label: String(transition.label || action.toLowerCase().replaceAll("_", " ")),
    description: String(transition.description || "").slice(0, 500),
    trigger: String(transition.trigger || "user-or-agent"),
    inputSchema,
    relatedCapabilityId: String(transition.relatedCapabilityId || ""),
    relatedTool: String(transition.relatedTool || ""),
    humanOnly: Boolean(transition.humanOnly),
    recovery: Boolean(transition.recovery),
  });
}

export function createSequentialTransitions(states, { actionPrefix = "ADVANCE_TO", aliasesFor } = {}) {
  const normalizedStates = normalizeStates(states);
  return normalizedStates.slice(1).map((to, index) => {
    const position = index + 1;
    return {
      action: `${actionPrefix}_${to.toUpperCase()}`,
      aliases: aliasesFor?.({ from: normalizedStates[index], to, index: position }) ?? [`USER_TEMPLATE_STATE_${position + 1}_ENTERED`],
      from: [normalizedStates[index]],
      to,
      label: `Continue to ${to.replaceAll("_", " ")}`,
      description: `Move from ${normalizedStates[index].replaceAll("_", " ")} to ${to.replaceAll("_", " ")}.`,
      trigger: "user-or-agent",
      inputSchema: EMPTY_INPUT_SCHEMA,
    };
  });
}

export function defineWorkflow(definition) {
  const id = String(definition.id || "").trim();
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new TypeError("Workflow ids must use lowercase kebab-case.");
  const states = normalizeStates(definition.states);
  const initialState = String(definition.initialState || states[0]);
  if (!states.includes(initialState)) throw new TypeError(`Initial state ${initialState} is not part of ${id}.`);
  const suppliedMeta = definition.stateMeta ?? {};
  const stateMeta = Object.fromEntries(states.map((state, index) => {
    const value = suppliedMeta[state] ?? {};
    return [state, freeze({
      label: String(value.label || state.replaceAll("_", " ")),
      description: String(value.description || "").slice(0, 500),
      terminal: value.terminal == null ? index === states.length - 1 : Boolean(value.terminal),
      error: Boolean(value.error),
      recovery: Boolean(value.recovery),
    })];
  }));
  const transitions = (definition.transitions ?? []).map((transition) => normalizeTransition(transition, states));
  const keys = new Set();
  transitions.forEach((transition) => {
    transition.from.forEach((from) => {
      for (const action of [transition.action, ...transition.aliases]) {
        const key = `${from}:${action}`;
        if (keys.has(key)) throw new TypeError(`Duplicate transition ${action} from ${from} in ${id}.`);
        keys.add(key);
      }
    });
  });
  return freeze({
    ...definition,
    id,
    title: String(definition.title || id),
    description: String(definition.description || ""),
    initialState,
    states,
    stateMeta,
    transitions,
  });
}

export function transitionAcceptsAction(transition, action) {
  const normalized = String(action || "").trim().toUpperCase();
  return transition.action === normalized || transition.aliases?.includes(normalized);
}

export function stateDetails(definition, state) {
  return definition?.stateMeta?.[state] ?? {
    label: String(state || "").replaceAll("_", " "),
    description: "",
    terminal: definition?.states?.at(-1) === state,
    error: state === "error" || state === "rejected",
    recovery: false,
  };
}

export { EMPTY_INPUT_SCHEMA };
