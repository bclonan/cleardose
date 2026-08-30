import { MockPharmacyApi } from "./mock/MockPharmacyApi";
import { UniversalDrugIndex } from "./udi/UniversalDrugIndex";
import { demoInteractionRules } from "./udi/demoInteractionRules";
import { drugConcepts } from "./udi/drugConcepts";
import { comparisonRelationships } from "./udi/comparisonCompatibility";

export function createMockPharmacyApi({ dao }) {
  const udi = new UniversalDrugIndex({ concepts: drugConcepts, interactionRules: demoInteractionRules, relationships: comparisonRelationships });
  return new MockPharmacyApi({ dao, udi });
}
