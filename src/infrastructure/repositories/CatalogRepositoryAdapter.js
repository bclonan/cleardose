import { toMedicationDto } from "../../domain/dto";
import { clone, deepFreeze } from "../../domain/shared/clone";
import {
  toCompatibilityOptionsDto,
  toDeliveryEstimateDto,
  toDrugAvailabilityComparisonDto,
  toDrugAvailabilityDto,
  toMedicationComparisonDto,
} from "../../domain/dto/DrugOptionDto";

export class CatalogRepositoryAdapter {
  constructor(api) { this.api = api; }

  list({ query = "", category = "All medications", sort = "name" } = {}) {
    return this.api.listMedications({ query, category, sort }).map(toMedicationDto);
  }

  findById(id) {
    const record = this.api.getMedicationById(id);
    return record ? toMedicationDto(record) : null;
  }
  findBySlug(slug) {
    const record = this.api.getMedicationBySlug(slug);
    return record ? toMedicationDto(record) : null;
  }
  listCategories() { return Object.freeze(this.api.listCategories()); }
  searchDrugIndex(input) { return deepFreeze(clone(this.api.searchDrugIndex(input))); }
  drugIndexEntry(drugId) {
    const record = this.api.getDrugIndexEntry(drugId);
    return record ? toMedicationDto(record) : null;
  }
  compareDrugPrices(input) { return deepFreeze(clone(this.api.compareDrugPrices(input))); }
  findRelatedDrugs(input) { return deepFreeze(clone(this.api.findRelatedDrugs(input))); }
  listCompatibleOptions(input) { return toCompatibilityOptionsDto(this.api.listCompatibleOptions(input)); }
  compareMedicationOptions(input) { return toMedicationComparisonDto(this.api.compareMedicationOptions(input)); }
  getDrugAvailability(input) { return toDrugAvailabilityDto(this.api.getDrugAvailability(input)); }
  compareDrugAvailability(input) { return toDrugAvailabilityComparisonDto(this.api.compareDrugAvailability(input)); }
  estimateDelivery(input) { return toDeliveryEstimateDto(this.api.estimateDelivery(input)); }
  reviewInteractionFlags(input) { return deepFreeze(clone(this.api.reviewInteractionFlags(input))); }
  buildProcurementPlan(input) { return deepFreeze(clone(this.api.buildProcurementPlan(input))); }
}
