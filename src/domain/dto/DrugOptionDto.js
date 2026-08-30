import { deepFreeze } from "../shared/clone";
import { toMedicationOfferDto } from "./MedicationDto";

function compactDrug(drug) {
  if (!drug) return null;
  return {
    id: String(drug.id),
    udi: String(drug.udi ?? ""),
    name: String(drug.name ?? ""),
    genericFor: String(drug.genericFor ?? ""),
    category: String(drug.category ?? ""),
    drugClass: String(drug.drugClass ?? ""),
    activeIngredient: {
      id: String(drug.activeIngredient?.id ?? ""),
      name: String(drug.activeIngredient?.name ?? ""),
    },
    manufacturer: {
      id: String(drug.manufacturer?.id ?? ""),
      name: String(drug.manufacturer?.name ?? ""),
      fictional: drug.manufacturer?.fictional !== false,
    },
    fromPrice: Number(drug.fromPrice ?? 0),
    variantCount: Number(drug.variantCount ?? 0),
    clinicalCoverage: String(drug.clinicalCoverage ?? "not-seeded"),
  };
}

function relationship(value) {
  if (!value) return null;
  return {
    kind: String(value.kind ?? ""),
    reasonCode: String(value.reasonCode ?? ""),
    explanation: String(value.explanation ?? ""),
    eligibility: {
      factComparison: Boolean(value.eligibility?.factComparison),
      priceRanking: Boolean(value.eligibility?.priceRanking),
      fulfillmentRanking: Boolean(value.eligibility?.fulfillmentRanking),
      doctorDiscussion: Boolean(value.eligibility?.doctorDiscussion),
    },
    requiresProfessionalReview: Boolean(value.requiresProfessionalReview),
    clinicallyEquivalent: false,
  };
}

function option(value) {
  return {
    drugId: String(value.drugId ?? value.drug?.id ?? ""),
    drug: compactDrug(value.drug),
    relationship: relationship(value.relationship),
    eligibleForPurpose: Boolean(value.eligibleForPurpose),
  };
}

function variant(value) {
  return {
    id: String(value.id ?? ""),
    form: String(value.form ?? ""),
    strength: String(value.strength ?? ""),
    quantity: Number(value.quantity ?? 0),
    retail: value.retail == null ? null : Number(value.retail),
  };
}

function location(value) {
  if (!value) return null;
  return {
    id: String(value.id ?? ""),
    label: String(value.label ?? ""),
    postalCode: String(value.postalCode ?? ""),
    fictional: value.fictional !== false,
  };
}

function strings(values) { return Array.isArray(values) ? values.map(String) : []; }

export function toCompatibilityOptionsDto(value) {
  return deepFreeze({
    source: compactDrug(value.source),
    purpose: String(value.purpose ?? "facts"),
    sameDrugProviderComparison: option(value.sameDrugProviderComparison),
    options: (value.options ?? []).map(option),
    eligible: (value.eligible ?? []).map(option),
    discussionOnly: (value.discussionOnly ?? []).map(option),
    coverage: String(value.coverage ?? "explicit-seeded-only"),
    disclaimer: String(value.disclaimer ?? ""),
  });
}

export function toMedicationComparisonDto(value) {
  return deepFreeze({
    purpose: String(value.purpose ?? "facts"),
    selections: (value.selections ?? []).map((selection) => ({
      drug: compactDrug(selection.drug),
      variant: variant(selection.variant),
      bestOffer: selection.bestOffer ? toMedicationOfferDto(selection.bestOffer) : null,
      offers: (selection.offers ?? []).map(toMedicationOfferDto),
      clinicalSample: {
        coverage: String(selection.clinicalSample?.coverage ?? "not-seeded"),
        informationalOnly: selection.clinicalSample?.informationalOnly !== false,
        requiresProfessionalReview: selection.clinicalSample?.requiresProfessionalReview !== false,
        disclaimer: String(selection.clinicalSample?.disclaimer ?? ""),
        source: selection.clinicalSample?.source ? {
          label: String(selection.clinicalSample.source.label ?? ""),
          url: String(selection.clinicalSample.source.url ?? ""),
          reviewedAt: String(selection.clinicalSample.source.reviewedAt ?? ""),
        } : null,
      },
      commonUses: strings(selection.commonUses),
      commonSideEffects: strings(selection.commonSideEffects),
      importantWarnings: strings(selection.importantWarnings),
      discussionPoints: strings(selection.discussionPoints),
    })),
    relationships: (value.relationships ?? []).map((item) => ({
      leftDrugId: String(item.leftDrugId ?? ""),
      rightDrugId: String(item.rightDrugId ?? ""),
      ...relationship(item),
    })),
    location: location(value.location),
    rankable: Boolean(value.rankable),
    priceDifference: value.priceDifference == null ? null : Number(value.priceDifference),
    currency: String(value.currency ?? "USD"),
    compatibilityCoverage: String(value.compatibilityCoverage ?? "explicit-seeded-only"),
    clinicalCoverage: String(value.clinicalCoverage ?? "sample-and-incomplete"),
    disclaimer: String(value.disclaimer ?? ""),
  });
}

export function toDrugAvailabilityDto(value) {
  return deepFreeze({
    drug: compactDrug(value.drug),
    variant: variant(value.variant),
    location: location(value.location),
    offers: (value.offers ?? []).map(toMedicationOfferDto),
    counts: {
      in_stock: Number(value.counts?.in_stock ?? 0),
      low_stock: Number(value.counts?.low_stock ?? 0),
      unavailable: Number(value.counts?.unavailable ?? 0),
    },
    checkedAt: String(value.checkedAt ?? ""),
    fictional: value.fictional !== false,
    recovery: value.recovery ? {
      code: String(value.recovery.code ?? ""),
      recommendedTool: String(value.recovery.recommendedTool ?? ""),
      input: { ...value.recovery.input },
    } : null,
    disclaimer: String(value.disclaimer ?? ""),
  });
}

function rankedAvailabilityOption(value) {
  return {
    drug: compactDrug(value.drug),
    variant: variant(value.variant),
    offer: toMedicationOfferDto(value.offer),
    fulfillmentMode: String(value.fulfillmentMode ?? ""),
    estimatedTotal: Number(value.estimatedTotal ?? 0),
    arrivalDays: Number(value.arrivalDays ?? 0),
  };
}

export function toDrugAvailabilityComparisonDto(value) {
  return deepFreeze({
    source: compactDrug(value.source),
    sourceVariant: variant(value.sourceVariant),
    location: location(value.location),
    purpose: "fulfillment",
    fulfillmentMode: String(value.fulfillmentMode ?? ""),
    maxDeliveryDays: value.maxDeliveryDays == null ? null : Number(value.maxDeliveryDays),
    options: (value.options ?? []).map(rankedAvailabilityOption),
    excluded: structuredClone(value.excluded ?? []),
    bestOption: rankedAvailabilityOption(value.bestOption),
    fictional: value.fictional !== false,
    disclaimer: String(value.disclaimer ?? ""),
  });
}

export function toDeliveryEstimateDto(value) {
  return deepFreeze({
    drug: compactDrug(value.drug),
    variant: variant(value.variant),
    offer: toMedicationOfferDto(value.offer),
    location: location(value.location),
    fulfillmentMode: String(value.fulfillmentMode ?? ""),
    estimate: structuredClone(value.estimate ?? {}),
    estimatedTotal: Number(value.estimatedTotal ?? 0),
    fictional: value.fictional !== false,
    disclaimer: String(value.disclaimer ?? ""),
  });
}
