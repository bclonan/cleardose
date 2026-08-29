import { toMedicationDto } from "../../domain/dto";

export class CatalogRepositoryAdapter {
  constructor({ medications, categories }) {
    this.medications = medications.map(toMedicationDto);
    this.categories = Object.freeze([...categories]);
  }

  list({ query = "", category = "All medications", sort = "name" } = {}) {
    const term = String(query).trim().toLowerCase();
    const results = this.medications.filter((medication) => {
      const haystack = `${medication.name} ${medication.genericFor} ${medication.category}`.toLowerCase();
      const matchesQuery = !term || haystack.includes(term);
      const matchesCategory = category === "All medications" || medication.category === category;
      return matchesQuery && matchesCategory;
    });
    return [...results].sort((a, b) => {
      if (sort === "price") return a.variants[0].price - b.variants[0].price;
      if (sort === "savings") return (b.variants[0].retail - b.variants[0].price) - (a.variants[0].retail - a.variants[0].price);
      return a.name.localeCompare(b.name);
    });
  }

  findById(id) { return this.medications.find((item) => item.id === id) ?? null; }
  findBySlug(slug) { return this.medications.find((item) => item.slug === slug) ?? null; }
  listCategories() { return this.categories; }
}
