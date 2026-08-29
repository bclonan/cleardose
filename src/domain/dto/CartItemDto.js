import { deepFreeze } from "../shared/clone";

export function toCartItemDto(record) {
  return deepFreeze({
    medicationId: String(record.medicationId),
    variantId: String(record.variantId),
    name: String(record.name),
    genericFor: String(record.genericFor ?? ""),
    form: String(record.form),
    strength: String(record.strength),
    quantity: Number(record.quantity),
    price: Number(record.price),
    retail: Number(record.retail ?? record.price ?? 0),
    units: Number(record.units),
  });
}
