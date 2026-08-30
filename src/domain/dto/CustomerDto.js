import { deepFreeze } from "../shared/clone";

export function toCustomerDto(record) {
  if (!record) return null;
  return deepFreeze({
    id: String(record.id),
    firstName: String(record.firstName ?? ""),
    lastName: String(record.lastName ?? ""),
    email: String(record.email ?? ""),
    phone: String(record.phone ?? ""),
    dateOfBirth: String(record.dateOfBirth ?? ""),
    address: {
      line1: String(record.address?.line1 ?? ""),
      line2: String(record.address?.line2 ?? ""),
      city: String(record.address?.city ?? ""),
      state: String(record.address?.state ?? ""),
      zip: String(record.address?.zip ?? ""),
    },
  });
}
