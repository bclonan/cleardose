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
    drugClass: String(record.drugClass ?? ""),
    comparisonGroup: String(record.comparisonGroup ?? ""),
    description: String(record.description ?? ""),
    popular: Boolean(record.popular),
    identifiers: {
      udi: String(record.identifiers?.udi ?? ""),
      rxCui: record.identifiers?.rxCui ? String(record.identifiers.rxCui) : null,
      ndc: record.identifiers?.ndc ? String(record.identifiers.ndc) : null,
    },
    variants: clone(record.variants ?? []).map((variant) => ({
      id: String(variant.id),
      form: String(variant.form),
      strength: String(variant.strength),
      quantity: Number(variant.quantity),
      price: Number(variant.price),
      retail: Number(variant.retail),
      offers: clone(variant.offers ?? []).map((offer) => ({
        id: String(offer.id),
        channelId: String(offer.channelId),
        channel: String(offer.channel),
        packagePrice: Number(offer.packagePrice),
        shipping: Number(offer.shipping),
        total: Number(offer.total),
        unitPrice: Number(offer.unitPrice),
        availability: String(offer.availability),
        etaDays: Number(offer.etaDays),
      })),
    })),
  });
}
