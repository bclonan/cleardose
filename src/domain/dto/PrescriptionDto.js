import { deepFreeze } from "../shared/clone";

export function toPrescriptionDto(record) {
  return deepFreeze({
    id: String(record.id),
    customerId: String(record.customerId),
    medicationId: String(record.medicationId),
    strength: String(record.strength),
    quantity: Number(record.quantity),
    refills: Number(record.refills),
    status: String(record.status),
    updatedAt: String(record.updatedAt),
  });
}
