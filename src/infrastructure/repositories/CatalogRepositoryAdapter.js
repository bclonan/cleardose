import { toMedicationDto } from "../../domain/dto";

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
}
