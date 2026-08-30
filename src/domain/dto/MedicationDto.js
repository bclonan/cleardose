import { deepFreeze } from "../shared/clone";

/** @typedef {{id:string, form:string, strength:string, quantity:number, price:number, retail:number}} MedicationVariantDto */

function optionalNumber(value) {
  return value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
}

function strings(values) {
  return Array.isArray(values) ? values.map((value) => String(value)) : [];
}

function mapLocation(location) {
  if (!location) return null;
  return {
    id: String(location.id ?? ""),
    label: String(location.label ?? ""),
    postalCode: String(location.postalCode ?? ""),
    fictional: Boolean(location.fictional),
  };
}

function mapOffer(offer) {
  return {
    id: String(offer.id),
    providerId: String(offer.providerId ?? offer.channelId ?? ""),
    providerName: String(offer.providerName ?? offer.channel ?? ""),
    providerType: String(offer.providerType ?? ""),
    channelId: String(offer.channelId ?? offer.providerId ?? ""),
    channel: String(offer.channel ?? offer.providerName ?? ""),
    pricingModel: String(offer.pricingModel ?? ""),
    cashPrice: Number(offer.cashPrice ?? offer.packagePrice ?? 0),
    estimatedInsurancePrice: optionalNumber(offer.estimatedInsurancePrice),
    costPlusStylePrice: optionalNumber(offer.costPlusStylePrice),
    typicalRetailPrice: Number(offer.typicalRetailPrice ?? 0),
    potentialCashSavings: Number(offer.potentialCashSavings ?? 0),
    unitCashPrice: Number(offer.unitCashPrice ?? 0),
    packagePrice: Number(offer.packagePrice ?? offer.cashPrice ?? 0),
    baseShippingCost: Number(offer.baseShippingCost ?? 0),
    shipping: Number(offer.shipping ?? offer.shippingCost ?? 0),
    shippingCost: optionalNumber(offer.shippingCost),
    total: optionalNumber(offer.total),
    deliveredCashTotal: optionalNumber(offer.deliveredCashTotal),
    pickupCashTotal: optionalNumber(offer.pickupCashTotal),
    unitPrice: optionalNumber(offer.unitPrice),
    availability: String(offer.availability ?? ""),
    etaDays: optionalNumber(offer.etaDays),
    quoteVersion: String(offer.quoteVersion ?? ""),
    currency: String(offer.currency ?? "USD"),
    fictional: Boolean(offer.fictional),
    priceBreakdown: {
      ingredientCost: Number(offer.priceBreakdown?.ingredientCost ?? 0),
      percentageMarkup: Number(offer.priceBreakdown?.percentageMarkup ?? 0),
      providerFee: Number(offer.priceBreakdown?.providerFee ?? 0),
      model: String(offer.priceBreakdown?.model ?? ""),
    },
    location: mapLocation(offer.location),
    inventory: {
      status: String(offer.inventory?.status ?? "unknown"),
      estimatedRestockOn: offer.inventory?.estimatedRestockOn ? String(offer.inventory.estimatedRestockOn) : null,
      inventoryVersion: String(offer.inventory?.inventoryVersion ?? ""),
      checkedAt: String(offer.inventory?.checkedAt ?? ""),
    },
    fulfillment: {
      pickup: {
        available: Boolean(offer.fulfillment?.pickup?.available),
        estimatedFulfillmentMinutes: optionalNumber(offer.fulfillment?.pickup?.estimatedFulfillmentMinutes),
        window: offer.fulfillment?.pickup?.window ? {
          start: String(offer.fulfillment.pickup.window.start ?? ""),
          end: String(offer.fulfillment.pickup.window.end ?? ""),
        } : null,
        distanceMiles: optionalNumber(offer.fulfillment?.pickup?.distanceMiles),
      },
      shipping: {
        available: Boolean(offer.fulfillment?.shipping?.available),
        estimatedFulfillmentMinutes: optionalNumber(offer.fulfillment?.shipping?.estimatedFulfillmentMinutes),
        deliveryWindow: offer.fulfillment?.shipping?.deliveryWindow ? {
          minDays: Number(offer.fulfillment.shipping.deliveryWindow.minDays),
          maxDays: Number(offer.fulfillment.shipping.deliveryWindow.maxDays),
        } : null,
        earliestArrivalOn: offer.fulfillment?.shipping?.earliestArrivalOn ? String(offer.fulfillment.shipping.earliestArrivalOn) : null,
        latestArrivalOn: offer.fulfillment?.shipping?.latestArrivalOn ? String(offer.fulfillment.shipping.latestArrivalOn) : null,
      },
    },
  };
}

export function toMedicationOfferDto(offer) {
  return deepFreeze(mapOffer(offer));
}

function mapClinicalSample(record) {
  const sample = record.clinicalSample ?? {};
  return {
    informationalOnly: sample.informationalOnly !== false,
    coverage: String(sample.coverage ?? "not-seeded"),
    requiresProfessionalReview: sample.requiresProfessionalReview !== false,
    disclaimer: String(sample.disclaimer ?? "Sample data only. Professional review is required."),
    commonUses: strings(sample.commonUses ?? record.commonUses),
    commonSideEffects: strings(sample.commonSideEffects ?? record.commonSideEffects),
    importantWarnings: strings(sample.importantWarnings ?? record.importantWarnings),
    discussionPoints: strings(sample.discussionPoints ?? record.discussionPoints),
    source: sample.source ? {
      label: String(sample.source.label ?? ""),
      url: String(sample.source.url ?? ""),
      reviewedAt: String(sample.source.reviewedAt ?? ""),
    } : null,
  };
}

export function toMedicationDto(record) {
  if (!record?.id || !record?.slug || !record?.name) throw new TypeError("Medication records require id, slug, and name.");
  const clinicalSample = mapClinicalSample(record);
  return deepFreeze({
    id: String(record.id),
    slug: String(record.slug),
    name: String(record.name),
    genericFor: String(record.genericFor ?? ""),
    category: String(record.category ?? "Uncategorized"),
    drugClass: String(record.drugClass ?? ""),
    comparisonGroup: String(record.comparisonGroup ?? ""),
    activeIngredient: {
      id: String(record.activeIngredient?.id ?? ""),
      name: String(record.activeIngredient?.name ?? record.name),
    },
    manufacturer: {
      id: String(record.manufacturer?.id ?? ""),
      name: String(record.manufacturer?.name ?? ""),
      fictional: record.manufacturer?.fictional !== false,
    },
    brandGenericRelationship: {
      kind: String(record.brandGenericRelationship?.kind ?? "unspecified"),
      brandedName: String(record.brandGenericRelationship?.brandedName ?? record.genericFor ?? ""),
      relatedDrugIds: strings(record.brandGenericRelationship?.relatedDrugIds),
      clinicallyEquivalent: false,
    },
    commonUses: strings(record.commonUses),
    commonSideEffects: strings(record.commonSideEffects),
    importantWarnings: strings(record.importantWarnings),
    discussionPoints: strings(record.discussionPoints),
    clinicalSample,
    comparableDrugIds: strings(record.comparableDrugIds),
    alternativeDrugIds: strings(record.alternativeDrugIds),
    description: String(record.description ?? ""),
    popular: Boolean(record.popular),
    identifiers: {
      udi: String(record.identifiers?.udi ?? ""),
      rxCui: record.identifiers?.rxCui ? String(record.identifiers.rxCui) : null,
      ndc: record.identifiers?.ndc ? String(record.identifiers.ndc) : null,
    },
    variants: (record.variants ?? []).map((variant) => ({
      id: String(variant.id),
      form: String(variant.form),
      strength: String(variant.strength),
      quantity: Number(variant.quantity),
      price: Number(variant.price),
      retail: Number(variant.retail),
      offers: (variant.offers ?? []).map(mapOffer),
    })),
  });
}
