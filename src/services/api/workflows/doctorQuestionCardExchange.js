export const doctorQuestionCardResponseSchema = Object.freeze({
  type: "object",
  properties: {
    exchangeId: {
      type: "string",
      maxLength: 100,
      description: "Exact exchange id returned by prepare_doctor_question_card_request.",
    },
    title: {
      type: "string",
      description: "Short neutral title for the patient-owned card.",
      maxLength: 90,
    },
    questions: {
      type: "array",
      description: "Two to eight neutral questions the patient may choose to ask a licensed clinician. Each item must end with a question mark.",
      minItems: 2,
      maxItems: 8,
      items: { type: "string", maxLength: 220 },
    },
  },
  required: ["exchangeId", "title", "questions"],
  additionalProperties: false,
});

export const doctorQuestionCardExchange = Object.freeze({
  id: "doctor_question_card",
  title: "Doctor question card",
  responseSchema: doctorQuestionCardResponseSchema,
  buildInstruction({ exchangeId, primaryDrug, relatedDrugs, concernCount = 0 }) {
    const relatedNames = relatedDrugs.map((drug) => drug.name).join(", ") || "none selected";
    const patientContext = concernCount
      ? `${concernCount} fictional concern prompt${concernCount === 1 ? " was" : "s were"} supplied transiently. ClearDose did not retain the authored text. Draft general discussion questions from the trusted drug facts below.`
      : "No additional concern prompts were supplied.";
    return `Create a neutral patient-to-doctor question card from the bounded ClearDose demo context below.

Primary record: ${primaryDrug.name} (${primaryDrug.id})
Discussion-only related records: ${relatedNames}
Transient concern summary:
${patientContext}

Return the draft by calling cleardose_submit_doctor_question_card_draft with exchangeId "${exchangeId}" and the declared response fields. Phrase every item as a question. Do not diagnose, recommend a switch, claim therapeutic equivalence, or add price facts; ClearDose will attach its own fictional indexed price facts. The visible card remains a draft until the patient reviews it.`;
  },
});
