import { clone, deepFreeze } from "../shared/clone";

/** @typedef {{id:string, form:string, strength:string, quantity:number, price:number, retail:number}} MedicationVariantDto */

export function toMedicationDto(record) {
  if (!record?.id || !record?.slug || !record?.name) throw new TypeError("Medication records require id, slug, and name.");
  return deepFreeze({
    id: String(record.id),
    slug: String(record.slug),
    name: String(record.name),
    genericFor: String(record.genericFor ?? ""),
    category: String(record.category ?? "Uncategorized"),
    description: String(record.description ?? ""),
    popular: Boolean(record.popular),
    variants: clone(record.variants ?? []).map((variant) => ({
      id: String(variant.id),
      form: String(variant.form),
      strength: String(variant.strength),
      quantity: Number(variant.quantity),
      price: Number(variant.price),
      retail: Number(variant.retail),
    })),
  });
}
