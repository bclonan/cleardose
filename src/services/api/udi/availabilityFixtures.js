import { ClearDoseDomainError } from "./ClearDoseDomainError";

export const DEMO_CLOCK = "2026-08-29T12:00:00.000Z";

export const demoLocations = Object.freeze([
  Object.freeze({
    id: "demo-baltimore",
    label: "Baltimore demo area",
    postalCode: "21201",
    fictional: true,
    shippingAdjustmentDays: 0,
    shippingSurcharge: 0,
    providerDistances: Object.freeze({
      "harbor-demo-pharmacy": 1.6,
      "community-demo-pharmacy": 4.2,
      "clearplus-cost-demo": null,
      "metro-demo-pharmacy": 8.7,
    }),
  }),
  Object.freeze({
    id: "demo-chicago",
    label: "Chicago demo area",
    postalCode: "60601",
    fictional: true,
    shippingAdjustmentDays: 1,
    shippingSurcharge: 1.5,
    providerDistances: Object.freeze({
      "harbor-demo-pharmacy": 7.4,
      "community-demo-pharmacy": 2.3,
      "clearplus-cost-demo": null,
      "metro-demo-pharmacy": 5.9,
    }),
  }),
  Object.freeze({
    id: "demo-remote",
    label: "Remote demo area",
    postalCode: "59001",
    fictional: true,
    shippingAdjustmentDays: 3,
    shippingSurcharge: 4,
    providerDistances: Object.freeze({
      "harbor-demo-pharmacy": 121.8,
      "community-demo-pharmacy": 147.3,
      "clearplus-cost-demo": null,
      "metro-demo-pharmacy": 93.6,
    }),
  }),
]);

export const demoProviders = Object.freeze([
  Object.freeze({
    id: "harbor-demo-pharmacy",
    name: "Harbor Demo Pharmacy",
    type: "fictional-community-pharmacy",
    pricingModel: "retail-cash-demo",
    multiplier: 1.02,
    providerFee: 1.75,
    baseShippingCost: 4,
    shippingDays: Object.freeze([1, 2]),
    supportsPickup: true,
    supportsShipping: true,
    fictional: true,
  }),
  Object.freeze({
    id: "community-demo-pharmacy",
    name: "Community Demo Pharmacy",
    type: "fictional-community-pharmacy",
    pricingModel: "retail-cash-demo",
    multiplier: 1.12,
    providerFee: 2.25,
    baseShippingCost: 2.5,
    shippingDays: Object.freeze([2, 3]),
    supportsPickup: true,
    supportsShipping: true,
    fictional: true,
  }),
  Object.freeze({
    id: "clearplus-cost-demo",
    name: "ClearPlus Cost Demo",
    type: "fictional-mail-provider",
    pricingModel: "cost-plus-style-demo",
    multiplier: 1,
    providerFee: 3,
    baseShippingCost: 5,
    shippingDays: Object.freeze([2, 3]),
    supportsPickup: false,
    supportsShipping: true,
    fictional: true,
  }),
  Object.freeze({
    id: "metro-demo-pharmacy",
    name: "Metro Demo Pharmacy",
    type: "fictional-regional-pharmacy",
    pricingModel: "retail-cash-demo",
    multiplier: 1.08,
    providerFee: 1.5,
    baseShippingCost: 3,
    shippingDays: Object.freeze([1, 3]),
    supportsPickup: true,
    supportsShipping: true,
    fictional: true,
  }),
]);

const providerById = new Map(demoProviders.map((provider) => [provider.id, provider]));
const locationById = new Map(demoLocations.map((location) => [location.id, location]));
const locationByPostalCode = new Map(demoLocations.map((location) => [location.postalCode, location]));

const availabilityOverrides = Object.freeze({
  "demo-baltimore|lisinopril-10mg-60|harbor-demo-pharmacy": Object.freeze({ status: "in_stock", shippingDays: [1, 2], pickupAvailable: true, shippingAvailable: true }),
  "demo-baltimore|lisinopril-10mg-60|community-demo-pharmacy": Object.freeze({ status: "low_stock", shippingDays: [2, 3], pickupAvailable: true, shippingAvailable: true }),
  "demo-baltimore|lisinopril-10mg-60|clearplus-cost-demo": Object.freeze({ status: "in_stock", shippingDays: [2, 3], pickupAvailable: false, shippingAvailable: true }),
  "demo-baltimore|lisinopril-10mg-60|metro-demo-pharmacy": Object.freeze({ status: "unavailable", restockDays: 5, pickupAvailable: false, shippingAvailable: false }),
  "demo-remote|atorvastatin-40mg-90|harbor-demo-pharmacy": Object.freeze({ status: "unavailable", restockDays: 7, pickupAvailable: false, shippingAvailable: false }),
  "demo-remote|atorvastatin-40mg-90|community-demo-pharmacy": Object.freeze({ status: "unavailable", restockDays: 8, pickupAvailable: false, shippingAvailable: false }),
  "demo-remote|atorvastatin-40mg-90|clearplus-cost-demo": Object.freeze({ status: "in_stock", shippingDays: [5, 6], pickupAvailable: false, shippingAvailable: true }),
  "demo-remote|atorvastatin-40mg-90|metro-demo-pharmacy": Object.freeze({ status: "low_stock", shippingDays: [4, 6], pickupAvailable: false, shippingAvailable: true }),
  "demo-chicago|azithromycin-500mg-60|harbor-demo-pharmacy": Object.freeze({ status: "unavailable", restockDays: 2, pickupAvailable: false, shippingAvailable: false }),
  "demo-chicago|azithromycin-500mg-60|community-demo-pharmacy": Object.freeze({ status: "unavailable", restockDays: 3, pickupAvailable: false, shippingAvailable: false }),
  "demo-chicago|azithromycin-500mg-60|clearplus-cost-demo": Object.freeze({ status: "unavailable", restockDays: 4, pickupAvailable: false, shippingAvailable: false }),
  "demo-chicago|azithromycin-500mg-60|metro-demo-pharmacy": Object.freeze({ status: "unavailable", restockDays: 6, pickupAvailable: false, shippingAvailable: false }),
  "demo-baltimore|azithromycin-500mg-60|harbor-demo-pharmacy": Object.freeze({ status: "in_stock", shippingDays: [1, 2], pickupAvailable: true, shippingAvailable: true }),
});

export const availabilitySeedCases = Object.freeze({
  mixedInventory: Object.freeze({
    request: Object.freeze({ drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", locationId: "demo-baltimore" }),
    expectedCounts: Object.freeze({ in_stock: 2, low_stock: 1, unavailable: 1 }),
  }),
  packageUnavailable: Object.freeze({
    request: Object.freeze({ drugId: "med_azithromycin", variantId: "azithromycin-500mg-60", locationId: "demo-chicago" }),
    recoveryRequest: Object.freeze({ drugId: "med_azithromycin", variantId: "azithromycin-500mg-60", locationId: "demo-baltimore" }),
    expectedCode: "PACKAGE_UNAVAILABLE",
  }),
  deliveryWindowMissed: Object.freeze({
    request: Object.freeze({ drugId: "med_atorvastatin", variantId: "atorvastatin-40mg-90", locationId: "demo-remote", fulfillmentMode: "shipping", maxDeliveryDays: 3 }),
    expectedCode: "DELIVERY_WINDOW_MISSED",
  }),
  providerUnavailable: Object.freeze({
    request: Object.freeze({ drugId: "med_lisinopril", variantId: "lisinopril-10mg-60", providerId: "metro-demo-pharmacy", locationId: "demo-baltimore", fulfillmentMode: "shipping" }),
    expectedCode: "PROVIDER_UNAVAILABLE",
  }),
});

function roundMoney(value) { return Number(Number(value).toFixed(2)); }

function stableHash(value) {
  return [...String(value)].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
}

function dateAfterDays(days) {
  return new Date(Date.parse(DEMO_CLOCK) + (Number(days) * 86_400_000)).toISOString().slice(0, 10);
}

function timestampAfterMinutes(minutes) {
  return new Date(Date.parse(DEMO_CLOCK) + (Number(minutes) * 60_000)).toISOString();
}

function publicLocation(location) {
  return {
    id: location.id,
    label: location.label,
    postalCode: location.postalCode,
    fictional: true,
  };
}

export function resolveDemoLocation({ locationId = "", postalCode = "" } = {}) {
  const normalizedId = String(locationId || "").trim();
  const normalizedPostalCode = String(postalCode || "").trim();
  const locationFromId = normalizedId ? locationById.get(normalizedId) : null;
  const locationFromPostalCode = normalizedPostalCode ? locationByPostalCode.get(normalizedPostalCode) : null;
  if (locationFromId && locationFromPostalCode && locationFromId.id !== locationFromPostalCode.id) {
    throw new ClearDoseDomainError("LOCATION_MISMATCH", "The seeded location id and postal code identify different demo locations.", {
      retryable: true,
      recommendedTool: "cleardose_get_drug_availability",
      recoveryInput: { locationId: locationFromId.id, postalCode: locationFromId.postalCode },
      details: {
        locationId: normalizedId,
        postalCode: normalizedPostalCode,
        locationIdMatch: publicLocation(locationFromId),
        postalCodeMatch: publicLocation(locationFromPostalCode),
      },
    });
  }
  const hasInvalidId = Boolean(normalizedId && !locationFromId);
  const hasInvalidPostalCode = Boolean(normalizedPostalCode && !locationFromPostalCode);
  const location = hasInvalidId || hasInvalidPostalCode
    ? null
    : locationFromId ?? locationFromPostalCode ?? locationById.get("demo-baltimore");
  if (location) return structuredClone(location);
  throw new ClearDoseDomainError("LOCATION_UNAVAILABLE", "That location is not part of the seeded ClearDose demo service area.", {
    retryable: true,
    recommendedTool: "cleardose_get_drug_availability",
    recoveryInput: { locationId: "demo-baltimore" },
    details: {
      field: hasInvalidId ? "locationId" : "postalCode",
      supportedLocations: demoLocations.map(publicLocation),
    },
  });
}

function pricingForProvider({ provider, basePrice, retail, quantity }) {
  const ingredientCost = roundMoney(Math.max(1, Number(basePrice) - 2.25));
  const percentageMarkup = provider.pricingModel === "cost-plus-style-demo" ? roundMoney(ingredientCost * 0.15) : roundMoney(ingredientCost * Math.max(0, provider.multiplier - 1));
  const cashPrice = provider.pricingModel === "cost-plus-style-demo"
    ? roundMoney(ingredientCost + percentageMarkup + provider.providerFee)
    : roundMoney((Number(basePrice) * provider.multiplier) + provider.providerFee);
  const estimatedInsurancePrice = provider.pricingModel === "cost-plus-style-demo"
    ? null
    : roundMoney(Math.min(cashPrice, Math.max(4, cashPrice * (0.56 + ((stableHash(provider.id) % 12) / 100)))));
  return {
    cashPrice,
    estimatedInsurancePrice,
    costPlusStylePrice: provider.pricingModel === "cost-plus-style-demo" ? cashPrice : null,
    typicalRetailPrice: roundMoney(retail),
    potentialCashSavings: roundMoney(Math.max(0, Number(retail) - cashPrice)),
    unitCashPrice: roundMoney(cashPrice / Math.max(1, Number(quantity))),
    priceBreakdown: {
      ingredientCost,
      percentageMarkup,
      providerFee: provider.providerFee,
      model: provider.pricingModel,
    },
  };
}

export function buildBaseProviderOffers({ variantId, basePrice, retail, quantity }) {
  return demoProviders.map((provider) => {
    const pricing = pricingForProvider({ provider, basePrice, retail, quantity });
    return {
      id: `${variantId}-${provider.id}`,
      providerId: provider.id,
      providerName: provider.name,
      providerType: provider.type,
      channelId: provider.id,
      channel: provider.name,
      pricingModel: provider.pricingModel,
      ...pricing,
      packagePrice: pricing.cashPrice,
      baseShippingCost: provider.baseShippingCost,
      quoteVersion: `quote-demo-v1-${stableHash(`${variantId}|${provider.id}`) % 10_000}`,
      currency: "USD",
      fictional: true,
    };
  });
}

function generatedStatus(seed) {
  const bucket = seed % 11;
  if (bucket < 2) return "unavailable";
  if (bucket < 4) return "low_stock";
  return "in_stock";
}

function legacyAvailability(status) {
  return ({
    in_stock: "available-demo-stock",
    low_stock: "limited-demo-stock",
    unavailable: "unavailable-demo-stock",
  })[status];
}

export function resolveOfferAtLocation(offer, variant, locationInput = {}) {
  const location = locationInput.id ? structuredClone(locationInput) : resolveDemoLocation(locationInput);
  const provider = providerById.get(String(offer.providerId ?? offer.channelId));
  if (!provider) throw new TypeError(`Unknown demo provider: ${offer.providerId ?? offer.channelId}.`);
  const variantId = String(variant.id);
  const seed = stableHash(`${variantId}|${provider.id}|${location.id}`);
  const override = availabilityOverrides[`${location.id}|${variantId}|${provider.id}`] ?? {};
  const status = override.status ?? generatedStatus(seed);
  const distanceMiles = location.providerDistances[provider.id];
  const withinPickupRange = Number.isFinite(distanceMiles) && distanceMiles <= 25;
  const pickupAvailable = status !== "unavailable" && provider.supportsPickup && withinPickupRange && override.pickupAvailable !== false;
  const shippingAvailable = status !== "unavailable" && provider.supportsShipping && override.shippingAvailable !== false;
  const shippingDays = override.shippingDays ?? provider.shippingDays.map((days) => days + location.shippingAdjustmentDays);
  const pickupMinutes = 45 + (seed % 136);
  const restockDays = override.restockDays ?? (2 + (seed % 7));
  const shippingCost = shippingAvailable ? roundMoney(provider.baseShippingCost + location.shippingSurcharge) : null;
  const deliveredCashTotal = shippingAvailable ? roundMoney(offer.cashPrice + shippingCost) : null;
  const pickupCashTotal = pickupAvailable ? roundMoney(offer.cashPrice) : null;
  const bestTotal = [deliveredCashTotal, pickupCashTotal].filter(Number.isFinite).sort((left, right) => left - right)[0] ?? null;
  return {
    ...structuredClone(offer),
    shipping: shippingCost ?? 0,
    shippingCost,
    total: bestTotal,
    deliveredCashTotal,
    pickupCashTotal,
    unitPrice: bestTotal == null ? null : roundMoney(bestTotal / Math.max(1, Number(variant.quantity))),
    availability: legacyAvailability(status),
    etaDays: shippingAvailable ? shippingDays[1] : null,
    location: publicLocation(location),
    inventory: {
      status,
      estimatedRestockOn: status === "unavailable" ? dateAfterDays(restockDays) : null,
      inventoryVersion: `inventory-demo-v1-${seed % 10_000}`,
      checkedAt: DEMO_CLOCK,
    },
    fulfillment: {
      pickup: {
        available: pickupAvailable,
        estimatedFulfillmentMinutes: pickupAvailable ? pickupMinutes : null,
        window: pickupAvailable ? { start: timestampAfterMinutes(pickupMinutes), end: timestampAfterMinutes(pickupMinutes + 120) } : null,
        distanceMiles: pickupAvailable ? distanceMiles : null,
      },
      shipping: {
        available: shippingAvailable,
        estimatedFulfillmentMinutes: shippingAvailable ? 180 + (seed % 360) : null,
        deliveryWindow: shippingAvailable ? { minDays: shippingDays[0], maxDays: shippingDays[1] } : null,
        earliestArrivalOn: shippingAvailable ? dateAfterDays(shippingDays[0]) : null,
        latestArrivalOn: shippingAvailable ? dateAfterDays(shippingDays[1]) : null,
      },
    },
  };
}

export function resolveVariantOffers(variant, locationInput = {}) {
  const location = locationInput.id ? structuredClone(locationInput) : resolveDemoLocation(locationInput);
  return variant.offers
    .map((offer) => resolveOfferAtLocation(offer, variant, location))
    .sort((left, right) => {
      if (left.total == null) return 1;
      if (right.total == null) return -1;
      return left.total - right.total;
    });
}

export function getDemoProvider(providerId) {
  const provider = providerById.get(String(providerId));
  return provider ? structuredClone(provider) : null;
}
