import { ClearDoseDomainError } from "./ClearDoseDomainError";

const discussion = (leftDrugId, rightDrugId, reasonCode, explanation) => Object.freeze({
  leftDrugId,
  rightDrugId,
  kind: "discussion_only_alternative",
  reasonCode,
  explanation,
  eligibility: Object.freeze({
    factComparison: true,
    priceRanking: false,
    fulfillmentRanking: false,
    doctorDiscussion: true,
  }),
  requiresProfessionalReview: true,
  clinicallyEquivalent: false,
});

// These are explicit demo relationships. comparisonGroup, drug class, category,
// names, and free text never create a relationship at runtime.
export const comparisonRelationships = Object.freeze([
  discussion("med_atorvastatin", "med_simvastatin", "SEEDED_STATIN_DISCUSSION", "Both records belong to an explicitly seeded statin discussion set. They are not interchangeable."),
  discussion("med_lisinopril", "med_losartan", "SEEDED_BLOOD_PRESSURE_DISCUSSION", "These records are explicitly linked for a clinician discussion about blood-pressure medicines. They are not equivalent."),
  discussion("med_lisinopril", "med_amlodipine", "SEEDED_BLOOD_PRESSURE_DISCUSSION", "These records are explicitly linked for a clinician discussion about blood-pressure medicines. They are not equivalent."),
  discussion("med_metformin", "med_empagliflozin", "SEEDED_GLUCOSE_DISCUSSION", "These records are explicitly linked for a clinician discussion about glucose-management medicines. They are not equivalent."),
  discussion("med_fluoxetine", "med_sertraline", "SEEDED_SSRI_DISCUSSION", "These records are explicitly linked as SSRI discussion prompts. A clinician must decide whether either record is relevant."),
  discussion("med_fluoxetine", "med_escitalopram", "SEEDED_SSRI_DISCUSSION", "These records are explicitly linked as SSRI discussion prompts. A clinician must decide whether either record is relevant."),
  discussion("med_naproxen", "med_ibuprofen", "SEEDED_NSAID_DISCUSSION", "These records are explicitly linked as NSAID discussion prompts. This is not a substitution recommendation."),
  discussion("med_naproxen", "med_meloxicam", "SEEDED_NSAID_DISCUSSION", "These records are explicitly linked as NSAID discussion prompts. This is not a substitution recommendation."),
  discussion("med_azithromycin", "med_clarithromycin", "SEEDED_MACROLIDE_DISCUSSION", "These records are explicitly linked as macrolide discussion prompts. They are not presented as equivalent treatment choices."),
  discussion("med_omeprazole", "med_pantoprazole", "SEEDED_PPI_DISCUSSION", "These records are explicitly linked as proton-pump-inhibitor discussion prompts. They are not interchangeable."),
  discussion("med_sildenafil", "med_tadalafil", "SEEDED_PDE5_DISCUSSION", "These records are explicitly linked as PDE5-inhibitor discussion prompts. They are not interchangeable."),
  discussion("med_levothyroxine", "med_liothyronine", "SEEDED_THYROID_DISCUSSION", "These records are explicitly linked for a thyroid-medicine discussion. They are not equivalent."),
]);

function key(leftDrugId, rightDrugId) {
  return [String(leftDrugId), String(rightDrugId)].sort().join("|");
}

const sameDrugRelationship = Object.freeze({
  kind: "same_drug",
  reasonCode: "SAME_INDEXED_DRUG",
  explanation: "The options use the same indexed medication. Exact package and provider differences remain visible.",
  eligibility: Object.freeze({
    factComparison: true,
    priceRanking: true,
    fulfillmentRanking: true,
    doctorDiscussion: true,
  }),
  requiresProfessionalReview: false,
  clinicallyEquivalent: false,
});

function purposeField(purpose) {
  return ({
    facts: "factComparison",
    price: "priceRanking",
    fulfillment: "fulfillmentRanking",
    doctor_discussion: "doctorDiscussion",
  })[String(purpose || "facts")];
}

export class ComparisonCompatibilityIndex {
  constructor({ entries, relationships = comparisonRelationships }) {
    this.entries = new Map(entries.map((entry) => [entry.id, entry]));
    this.relationships = new Map();
    for (const relationship of relationships) {
      if (!this.entries.has(relationship.leftDrugId) || !this.entries.has(relationship.rightDrugId)) {
        throw new TypeError(`Comparison relationship references an unknown drug: ${relationship.leftDrugId}, ${relationship.rightDrugId}.`);
      }
      if (relationship.leftDrugId === relationship.rightDrugId) throw new TypeError("Explicit comparison relationships cannot reference the same drug twice.");
      const relationshipKey = key(relationship.leftDrugId, relationship.rightDrugId);
      if (this.relationships.has(relationshipKey)) throw new TypeError(`Duplicate comparison relationship: ${relationshipKey}.`);
      this.relationships.set(relationshipKey, relationship);
    }
  }

  get(leftDrugId, rightDrugId) {
    const left = String(leftDrugId);
    const right = String(rightDrugId);
    if (left === right && this.entries.has(left)) return structuredClone(sameDrugRelationship);
    const relationship = this.relationships.get(key(left, right));
    return relationship ? structuredClone(relationship) : null;
  }

  list(drugId, { purpose = "facts" } = {}) {
    const sourceId = String(drugId);
    if (!this.entries.has(sourceId)) {
      throw new ClearDoseDomainError("UNKNOWN_DRUG", `Unknown UDI drug id: ${sourceId}.`, {
        recommendedTool: "cleardose_search_drug_index",
        recoveryInput: { query: sourceId },
        details: { field: "drugId", drugId: sourceId },
      });
    }
    const field = purposeField(purpose);
    if (!field) throw new TypeError("purpose must be facts, price, fulfillment, or doctor_discussion.");
    const options = [...this.relationships.values()]
      .filter((relationship) => relationship.leftDrugId === sourceId || relationship.rightDrugId === sourceId)
      .map((relationship) => {
        const candidateDrugId = relationship.leftDrugId === sourceId ? relationship.rightDrugId : relationship.leftDrugId;
        return {
          drugId: candidateDrugId,
          relationship: structuredClone(relationship),
          eligibleForPurpose: Boolean(relationship.eligibility[field]),
        };
      })
      .sort((left, right) => left.drugId.localeCompare(right.drugId));
    return {
      sourceDrugId: sourceId,
      purpose,
      sameDrugProviderComparison: {
        drugId: sourceId,
        relationship: structuredClone(sameDrugRelationship),
        eligibleForPurpose: true,
      },
      options,
      eligible: options.filter((option) => option.eligibleForPurpose),
      discussionOnly: options.filter((option) => option.relationship.kind === "discussion_only_alternative"),
      coverage: "explicit-seeded-only",
      disclaimer: "Compatibility is limited to explicit ClearDose demo relationships. Discussion-only records are not therapeutic equivalents or substitution recommendations.",
    };
  }

  assertAllowed(leftDrugId, rightDrugId, { purpose = "facts" } = {}) {
    const field = purposeField(purpose);
    if (!field) throw new TypeError("purpose must be facts, price, fulfillment, or doctor_discussion.");
    const relationship = this.get(leftDrugId, rightDrugId);
    if (relationship?.eligibility?.[field]) return relationship;
    const compatibility = this.list(leftDrugId, { purpose });
    throw new ClearDoseDomainError("INCOMPATIBLE_COMPARISON", `The seeded ClearDose model does not allow ${leftDrugId} and ${rightDrugId} to be compared for ${purpose}.`, {
      retryable: true,
      recommendedTool: "cleardose_find_compatible_options",
      recoveryInput: { drugId: String(leftDrugId), purpose },
      details: {
        leftDrugId: String(leftDrugId),
        rightDrugId: String(rightDrugId),
        purpose,
        relationship,
        compatibleDrugIds: compatibility.eligible.map((option) => option.drugId),
        sameDrugProviderComparisonAvailable: true,
      },
    });
  }
}
