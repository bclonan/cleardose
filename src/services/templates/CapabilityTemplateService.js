import { normalizeCapabilityTemplate, validateTemplateInput } from "../api/templates/capabilityTemplateSchema";
import { capabilityReplayScenarioId } from "../api/demos/capabilityReplayScenario";
import { SafeEjsTemplateEngine } from "./SafeEjsTemplateEngine";
import { toolResponse } from "../../infrastructure/webmcp/toolResponse";

function copy(value) { return value == null ? value : structuredClone(value); }

const fixedTemplatePaths = new Set(["context.role", "context.situation", "context.step", "site.name", "site.tagline"]);

function validateDeclaredTemplatePaths(template) {
  const declaredInputs = new Set(template.inputFields.map((field) => `input.${field.name}`));
  const paths = [
    ...String(template.body).matchAll(/<%=\s*([A-Za-z][A-Za-z0-9_.]*)\s*%>/g),
    ...String(template.body).matchAll(/<%\s*if\s+([A-Za-z][A-Za-z0-9_.]*)\s*%>/g),
  ].map((match) => match[1]);
  const unknown = paths.find((path) => !declaredInputs.has(path) && !fixedTemplatePaths.has(path));
  if (unknown) throw new TypeError(`Template path ${unknown} is not a declared input or supported local context field.`);
}

const starters = Object.freeze([
  Object.freeze({ kind: "tool", name: "visit_question_sheet", title: "Generate a visit question sheet", description: "Create a local, reviewable question sheet from user-provided medication and visit goals.", examplePrompt: "I'm getting ready for an appointment about lisinopril. Please make me a short question sheet focused on cost and monitoring, and leave it for me to review.", voiceGuide: "Name the medication, say what you want to understand, then review the generated sheet before copying it.", scope: { role: "patient", situation: "visit-preparation", step: "question-sheet" }, inputFields: [{ name: "drug_name", label: "Medication name", type: "string", required: true, description: "Fictional medication name." }, { name: "visit_goal", label: "Visit goal", type: "string", required: true, description: "What the patient wants to discuss." }], body: "# Questions about <%= input.drug_name %>\n\nVisit goal: <%= input.visit_goal %>\n\n- What should I understand before making any change?\n- Which cost, monitoring, and safety questions should we discuss?\n\nGenerated in ClearDose for human review. Not medical advice.", autoRegister: false }),
  Object.freeze({ kind: "workflow", name: "prescription_review_loop", title: "Prescription review loop", description: "A reusable human-reviewed workflow for gathering context before an administrative prescription follow-up.", examplePrompt: "ClearDose says my fictional order needs a prescription. Please start a review workflow, help me gather the context, and stop before anyone is contacted.", voiceGuide: "Collect the fictional medication context, prepare the editable handoff, and stop for human review before completion.", scope: { role: "patient", situation: "prescription-required", step: "review-loop" }, inputFields: [{ name: "drug_name", label: "Medication name", type: "string", required: true, description: "Fictional indexed medication." }], states: ["ready", "collecting_context", "preparing_handoff", "human_review", "complete"], body: "Review workflow for <%= input.drug_name %>. Current role: <%= context.role %>. Stop at human review before any external action.", autoRegister: false }),
]);

export class CapabilityTemplateService {
  constructor({ dao, toolRegistry, workflowRuntime, engine = new SafeEjsTemplateEngine() }) {
    this.dao = dao; this.toolRegistry = toolRegistry; this.workflowRuntime = workflowRuntime; this.engine = engine;
    this.templates = new Map(); this.status = new Map(); this.listeners = new Set(); this.initialized = false;
  }

  snapshot() { return Object.freeze({ initialized: this.initialized, templates: copy([...this.templates.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))), statuses: Object.fromEntries(this.status) }); }
  subscribe(listener) { this.listeners.add(listener); listener(this.snapshot()); return () => this.listeners.delete(listener); }
  notify() { const snapshot = this.snapshot(); this.listeners.forEach((listener) => listener(snapshot)); }
  persist() { this.dao.saveAll([...this.templates.values()]); }

  async initialize() {
    const saved = this.dao.load();
    const source = saved.length ? saved : starters;
    for (const record of source) {
      try { const template = normalizeCapabilityTemplate(record); this.validate(template); this.templates.set(template.id, template); }
      catch { /* Ignore malformed local records instead of registering them. */ }
    }
    if (!saved.length) this.persist();
    this.initialized = true;
    for (const template of this.templates.values()) if (template.autoRegister) await this.register(template.id);
    this.notify(); return this.snapshot();
  }

  get(id) { return this.templates.get(String(id)) ?? null; }

  validate(template) {
    this.engine.validate(template.body);
    validateDeclaredTemplatePaths(template);
    return template;
  }

  save(record) {
    const prior = record?.id ? this.get(record.id) : null;
    if (prior?.autoRegister) throw new TypeError("Unload the registered capability before saving it as a draft.");
    const template = normalizeCapabilityTemplate({ ...prior, ...record, autoRegister: false, createdAt: prior?.createdAt });
    this.validate(template);
    this.templates.set(template.id, template); this.status.set(template.id, "draft"); this.persist(); this.notify();
    return copy(template);
  }

  import(record) { return this.save({ ...record, id: undefined, autoRegister: false }); }

  async remove(id) {
    await this.unregister(id); this.templates.delete(String(id)); this.status.delete(String(id)); this.persist(); this.notify();
  }

  render(idOrTemplate, input = {}) {
    const template = typeof idOrTemplate === "string" ? this.get(idOrTemplate) : normalizeCapabilityTemplate(idOrTemplate);
    if (!template) throw new TypeError(`Unknown capability template: ${idOrTemplate}.`);
    this.validate(template);
    const safeInput = validateTemplateInput(template, input);
    return this.engine.render(template.body, { input: safeInput, context: template.scope, site: { name: "ClearDose", tagline: "Transparent prescriptions, agent-ready." } });
  }

  toolDefinition(template) {
    const exampleInput = Object.fromEntries(template.inputFields.map((field) => [field.name,
      field.type === "boolean" ? true : ["number", "integer"].includes(field.type) ? 1 : field.example || `Example ${field.label}`,
    ]));
    const outputSchema = {
      type: "object",
      maxProperties: 4,
      properties: {
        ok: { type: "boolean" },
        artifact: {
          type: "object",
          maxProperties: 6,
          properties: {
            id: { type: "string", maxLength: 120 },
            artifactType: { type: "string", enum: ["dynamic-document"] },
            flowId: { type: "string", maxLength: 120 },
            status: { type: "string", enum: ["human_review"] },
            title: { type: "string", maxLength: 100 },
            contentStored: { type: "boolean" },
          },
          required: ["id", "artifactType", "flowId", "status", "title", "contentStored"],
          additionalProperties: false,
        },
        content: { type: "string", maxLength: 20000 },
        visibleState: { type: "string", enum: ["human_review"] },
      },
      required: ["ok", "artifact", "content", "visibleState"],
      additionalProperties: false,
    };
    return {
      name: template.name, title: template.title, description: template.description, inputSchema: template.inputSchema, outputSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      capabilityId: `cleardose.user-generated.${template.name}`, category: "user-generated", interactionModel: "imperative", registration: "imperative",
      machine: { id: `machine.dynamic.user-tool-${template.name.replaceAll("_", "-")}.v1`, kind: "dynamic", role: template.scope.role, scope: template.scope, states: ["queued", "running", "complete", "error"] },
      examplePrompt: template.examplePrompt || `Create ${template.title.toLowerCase()} with fictional data and leave it for review.`,
      voicePrompt: template.voiceGuide || `Run ${template.title.toLowerCase()} with fictional data, then read the review status aloud.`,
      advancedPrompt: `Invoke cleardose_user_${template.name} with the closed input schema. Return the bounded local artifact and stop at human review.`,
      expectedResult: `A bounded ${template.title.toLowerCase()} draft that remains local and in human review.`,
      routes: ["*"],
      permissions: ["local-document-draft", "human-review"],
      exampleRequests: [exampleInput],
      exampleResponse: { ok: true, artifact: { id: "artifact_demo", artifactType: "dynamic-document", flowId: "flow_demo", status: "human_review", title: template.title, contentStored: false }, content: "Generated local review content.", visibleState: "human_review" },
      deterministicErrors: [{ code: "INVALID_INPUT", recovery: "Use only the declared bounded input fields and exact JSON types." }],
      relatedTools: ["inspect_workflow_runtime"],
      scenarioIds: [capabilityReplayScenarioId({ toolName: `cleardose_user_${template.name}` })],
      execute: (input) => this.executeTool(template, input),
    };
  }

  async executeTool(template, input) {
    const safeInput = validateTemplateInput(template, input);
    return this.workflowRuntime.runTool(`user_${template.name}`, safeInput, async ({ flowId }) => {
      const content = this.engine.render(template.body, { input: safeInput, context: template.scope, site: { name: "ClearDose", tagline: "Transparent prescriptions, agent-ready." } }).slice(0, 20000);
      const artifact = await this.workflowRuntime.createTemplateArtifact({ flowId, template, input: safeInput, content });
      const artifactSummary = {
        id: artifact.id,
        artifactType: artifact.artifactType || "dynamic-document",
        flowId: artifact.flowId || flowId,
        status: artifact.status,
        title: artifact.title || template.title,
        contentStored: artifact.contentStored === true,
      };
      return toolResponse({ ok: true, artifact: artifactSummary, content, visibleState: "human_review" }, `Generated ${template.title} locally for human review.`);
    }, { capabilityId: `cleardose.user-generated.${template.name}`, category: "user-generated", interactionModel: "imperative", machine: this.toolDefinition(template).machine });
  }

  async register(id) {
    const template = this.get(id); if (!template) throw new TypeError(`Unknown capability template: ${id}.`);
    this.validate(template);
    if (template.kind === "tool") await this.toolRegistry.registerDefinitions([this.toolDefinition(template)], { namespace: "cleardose_user" });
    else this.workflowRuntime.registerDynamicDefinition({ id: `user-workflow-${template.name}`, title: template.title, description: template.description, states: template.states, scope: template.scope });
    const updated = normalizeCapabilityTemplate({ ...template, autoRegister: true, createdAt: template.createdAt });
    this.templates.set(updated.id, updated); this.status.set(updated.id, template.kind === "tool" ? "registered" : "loaded"); this.persist(); this.notify();
    return copy(updated);
  }

  async unregister(id) {
    const template = this.get(id); if (!template) return;
    if (template.kind === "tool") this.toolRegistry.unregister(`cleardose_user_${template.name}`);
    else this.workflowRuntime.unregisterDynamicDefinition(`user-workflow-${template.name}`);
    const updated = normalizeCapabilityTemplate({ ...template, autoRegister: false, createdAt: template.createdAt });
    this.templates.set(updated.id, updated); this.status.set(updated.id, "draft"); this.persist(); this.notify();
  }

  async run(id, input = {}) {
    const template = this.get(id); if (!template) throw new TypeError(`Unknown capability template: ${id}.`);
    if (template.kind === "tool") return this.executeTool(template, input);
    const safeInput = validateTemplateInput(template, input);
    const guide = this.engine.render(template.body, { input: safeInput, context: template.scope, site: { name: "ClearDose" } });
    return this.workflowRuntime.startDynamicMachine({ id: `user-workflow-${template.name}`, title: template.title, description: template.description, states: template.states, scope: template.scope, context: { templateId: template.id, input: safeInput, guide }, source: "capability-studio" });
  }
}
