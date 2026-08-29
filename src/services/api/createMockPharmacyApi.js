import { MockPharmacyApi } from "./mock/MockPharmacyApi";
import { categories, medications } from "./mock/seedData";

export function createMockPharmacyApi({ dao }) {
  return new MockPharmacyApi({ dao, medications, categories });
}
