import { MockPharmacyApi } from "./mock/MockPharmacyApi";
import { UniversalDrugIndex } from "./udi/UniversalDrugIndex";
import { demoInteractionRules } from "./udi/demoInteractionRules";
import { drugConcepts } from "./udi/drugConcepts";

export function createMockPharmacyApi({ dao }) {
  const udi = new UniversalDrugIndex({ concepts: drugConcepts, interactionRules: demoInteractionRules });
  return new MockPharmacyApi({ dao, udi });
}
