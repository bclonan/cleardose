const guidance = Object.freeze({
  PRESCRIPTION_REQUIRED: Object.freeze({
    code: "PRESCRIPTION_REQUIRED",
    title: "Prescription required",
    summary: "Your prescriber must send a valid prescription before fulfillment.",
    steps: Object.freeze(["Confirm the medication and package shown in ClearDose.", "Choose whether your prescriber will send a new prescription or an existing prescription will be transferred.", "Review and edit the generated note before sharing it with a clinician."]),
    recommendedTool: "cleardose_prepare_prescription_follow_up",
    requiresHumanReview: true,
  }),
  OUT_OF_STOCK: Object.freeze({ code: "OUT_OF_STOCK", title: "Package unavailable", summary: "The fictional package is out of stock.", steps: Object.freeze(["Refresh indexed packages.", "Review a different package with the same exact drug identity.", "Reconfirm price and quantity before continuing."]), recommendedTool: "cleardose_get_drug_index_entry", requiresHumanReview: true }),
  PRICE_UPDATED: Object.freeze({ code: "PRICE_UPDATED", title: "Price updated", summary: "The fictional quote changed before review.", steps: Object.freeze(["Read the updated offer.", "Compare the delivered total again.", "Continue only after the patient reconfirms."]), recommendedTool: "cleardose_compare_drug_prices", requiresHumanReview: true }),
  INVALID_FORM: Object.freeze({ code: "INVALID_FORM", title: "Form needs attention", summary: "One or more fields did not satisfy the declared form contract.", steps: Object.freeze(["Review field-level errors.", "Edit only the rejected values.", "Submit the visible form again."]), recommendedTool: "cleardose_inspect_workflow_runtime", requiresHumanReview: true }),
});

export function getRecoveryGuidance(code) {
  return guidance[String(code || "").toUpperCase()] ?? null;
}

export function buildPrescriptionFollowUp({ drug, preferredPath = "undecided", questions = [] }) {
  if (!drug?.id) throw new TypeError("A valid indexed drug is required.");
  const base = getRecoveryGuidance("PRESCRIPTION_REQUIRED");
  const pathLabels = { prescriber_send: "ask my prescriber to send a new prescription", transfer: "ask about transferring an existing prescription", on_file: "verify whether a valid prescription is already on file", undecided: "help me choose the appropriate prescription path" };
  const editablePrompt = `I am using the fictional ClearDose demo. ${base.title}: ${base.summary}\n\nMedication: ${drug.name} (${drug.id})\nPreferred path: Please ${pathLabels[preferredPath] ?? pathLabels.undecided}.\nQuestions to preserve: ${questions.length ? questions.join("; ") : "None yet."}\n\nReturn a concise checklist and a draft note for my review. Do not diagnose, recommend a medication change, contact a clinician, or claim fulfillment is complete.`;
  return { ...base, drug: { id: drug.id, name: drug.name, udi: drug.identifiers?.udi ?? "" }, preferredPath, questions, editablePrompt, form: { fields: ["preferredPath", "questions", "editablePrompt"], submitLabel: "Review follow-up packet" } };
}

