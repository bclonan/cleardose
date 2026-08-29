import { clone, deepFreeze } from "../shared/clone";
import { toCartItemDto } from "./CartItemDto";

export function toOrderDto(record) {
  return deepFreeze({
    id: String(record.id),
    customerId: String(record.customerId),
    placedAt: String(record.placedAt),
    status: String(record.status),
    deliveredAt: record.deliveredAt ? String(record.deliveredAt) : null,
    tracking: record.tracking ? String(record.tracking) : null,
    subtotal: Number(record.subtotal),
    shipping: Number(record.shipping),
    tax: Number(record.tax ?? 0),
    total: Number(record.total),
    address: clone(record.address),
    prescriptionMethod: record.prescriptionMethod ? String(record.prescriptionMethod) : null,
    paymentMethod: record.paymentMethod ? String(record.paymentMethod) : null,
    items: (record.items ?? []).map(toCartItemDto),
  });
}
