const prescriptionMethods = new Set(["on-file", "provider", "transfer"]);
const paymentMethods = new Set(["demo-card", "benefit"]);

function requiredText(value, field, maxLength) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new TypeError(`${field} is required.`);
  if (normalized.length > maxLength) throw new TypeError(`${field} must be ${maxLength} characters or fewer.`);
  return normalized;
}

export function toCheckoutOrderInput(record) {
  const prescriptionMethod = String(record?.prescriptionMethod ?? "");
  const paymentMethod = String(record?.paymentMethod ?? "");
  if (!prescriptionMethods.has(prescriptionMethod)) throw new TypeError("Choose a supported prescription method.");
  if (!paymentMethods.has(paymentMethod)) throw new TypeError("Choose a supported mock payment method.");
  return Object.freeze({
    address: Object.freeze({
      line1: requiredText(record?.address?.line1, "Street address", 120),
      line2: String(record?.address?.line2 ?? "").trim().slice(0, 120),
      city: requiredText(record?.address?.city, "City", 80),
      state: requiredText(record?.address?.state, "State", 2).toUpperCase(),
      zip: requiredText(record?.address?.zip, "ZIP code", 12),
    }),
    prescriptionMethod,
    paymentMethod,
  });
}
