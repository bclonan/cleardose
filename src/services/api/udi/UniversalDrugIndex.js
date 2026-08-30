import { clone } from "../../../domain/shared/clone";
import { activeIngredientFor, clinicalSampleFor } from "./clinicalSampleFacts";
import { buildBaseProviderOffers, DEMO_CLOCK, demoLocations, demoProviders, resolveDemoLocation, resolveVariantOffers } from "./availabilityFixtures";
import { ComparisonCompatibilityIndex, comparisonRelationships } from "./comparisonCompatibility";
import { ClearDoseDomainError } from "./ClearDoseDomainError";

const FICTIONAL_MANUFACTURERS = Object.freeze([
  Object.freeze({ id: "maker_north_harbor", name: "North Harbor Generics", fictional: true }),
  Object.freeze({ id: "maker_blue_marsh", name: "Blue Marsh Laboratories", fictional: true }),
  Object.freeze({ id: "maker_cedar_demo", name: "Cedar Demo Therapeutics", fictional: true }),
  Object.freeze({ id: "maker_union_sample", name: "Union Sample Medicines", fictional: true }),
]);

function roundMoney(value) { return Number(value.toFixed(2)); }

function stableHash(value) {
  return [...String(value)].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function compactEntry(entry) {
  return {
    id: entry.id,
    udi: entry.identifiers.udi,
    name: entry.name,
    genericFor: entry.genericFor,
    category: entry.category,
    drugClass: entry.drugClass,
    activeIngredient: clone(entry.activeIngredient),
    manufacturer: clone(entry.manufacturer),
    fromPrice: Math.min(...entry.variants.map((variant) => variant.price)),
    variantCount: entry.variants.length,
    clinicalCoverage: entry.clinicalSample.coverage,
  };
}

function buildMedication(concept, conceptIndex) {
  const id = `med_${concept.key}`;
  const quantities = concept.quantities ?? [30, 60, 90];
  const variants = concept.strengths.map((strength, variantIndex) => {
    const quantity = quantities[variantIndex] ?? quantities.at(-1) ?? 30;
    const seed = stableHash(`${concept.key}:${strength}:${quantity}:${variantIndex}`);
    const packageScale = Math.max(1, Math.pow(quantity / 30, 0.72));
    const ingredientCost = 4.25 + ((seed % 1450) / 100);
    const basePrice = roundMoney((ingredientCost + (variantIndex * 1.17)) * packageScale);
    const retail = roundMoney(basePrice * (2.8 + ((seed % 210) / 100)));
    const variant = {
      id: `${concept.key}-${slugify(strength)}-${quantity}`,
      form: concept.form,
      strength,
      quantity,
      retail,
      offers: [],
    };
    variant.offers = buildBaseProviderOffers({ variantId: variant.id, basePrice, retail, quantity });
    variant.offers = resolveVariantOffers(variant, { locationId: "demo-baltimore" });
    const pricedOffers = variant.offers.filter((offer) => offer.total != null);
    variant.price = pricedOffers.length ? Math.min(...pricedOffers.map((offer) => offer.total)) : retail;
    return variant;
  });

  const clinicalSample = clinicalSampleFor(concept);

  return {
    id,
    slug: slugify(concept.name),
    name: concept.name,
    genericFor: concept.genericFor,
    category: concept.category,
    drugClass: concept.drugClass,
    comparisonGroup: concept.comparisonGroup,
    activeIngredient: activeIngredientFor(concept),
    manufacturer: clone(FICTIONAL_MANUFACTURERS[conceptIndex % FICTIONAL_MANUFACTURERS.length]),
    brandGenericRelationship: {
      kind: concept.genericFor ? "generic-name-with-brand-reference" : "unspecified",
      brandedName: concept.genericFor ?? "",
      relatedDrugIds: [],
      clinicallyEquivalent: false,
    },
    commonUses: clone(clinicalSample.commonUses),
    commonSideEffects: clone(clinicalSample.commonSideEffects),
    importantWarnings: clone(clinicalSample.importantWarnings),
    discussionPoints: clone(clinicalSample.discussionPoints),
    clinicalSample,
    description: concept.description,
    popular: conceptIndex < 12,
    identifiers: {
      udi: `udi:cleardose:${concept.key}`,
      rxCui: null,
      ndc: null,
    },
    comparableDrugIds: [],
    alternativeDrugIds: [],
    variants,
  };
}

function normalizeLimit(value, fallback = 20, maximum = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(maximum, Math.trunc(parsed)));
}

function pairKey(left, right) { return [left, right].sort().join("|"); }

function exactVariant(entry, { variantId = "", strength = "", quantity } = {}) {
  const normalizedVariantId = String(variantId || "");
  const hasQuantity = quantity != null && quantity !== "";
  const match = normalizedVariantId
    ? entry.variants.find((variant) => variant.id === normalizedVariantId)
    : strength || hasQuantity
      ? entry.variants.find((variant) => (!strength || variant.strength === strength) && (!hasQuantity || variant.quantity === Number(quantity)))
      : entry.variants[0];
  if (match) return match;
  throw new ClearDoseDomainError("PACKAGE_NOT_FOUND", `No exact indexed package matched ${entry.name}.`, {
    retryable: true,
    recommendedTool: "cleardose_get_drug_index_entry",
    recoveryInput: { drugId: entry.id },
    details: {
      drugId: entry.id,
      variantId: normalizedVariantId || null,
      strength: strength || null,
      quantity: hasQuantity ? Number(quantity) : null,
      availablePackages: entry.variants.map((variant) => ({ id: variant.id, form: variant.form, strength: variant.strength, quantity: variant.quantity })),
    },
  });
}

function requireDrug(byId, drugId) {
  const entry = byId.get(String(drugId));
  if (entry) return entry;
  throw new ClearDoseDomainError("UNKNOWN_DRUG", `Unknown UDI drug id: ${drugId}.`, {
    recommendedTool: "cleardose_search_drug_index",
    recoveryInput: { query: String(drugId || "") },
    details: { field: "drugId", drugId: String(drugId || "") },
  });
}

function moneyDifference(values) {
  if (values.length < 2) return 0;
  return roundMoney(Math.max(...values) - Math.min(...values));
}

export class UniversalDrugIndex {
  constructor({ concepts, interactionRules, relationships = comparisonRelationships, version = "demo-2026.09" }) {
    this.version = version;
    this.entries = concepts.map(buildMedication);
    this.byId = new Map(this.entries.map((entry) => [entry.id, entry]));
    this.compatibility = new ComparisonCompatibilityIndex({ entries: this.entries, relationships });
    this.entries.forEach((entry) => {
      const compatibility = this.compatibility.list(entry.id, { purpose: "facts" });
      entry.comparableDrugIds = compatibility.options.filter((option) => option.relationship.kind !== "discussion_only_alternative").map((option) => option.drugId);
      entry.alternativeDrugIds = compatibility.discussionOnly.map((option) => option.drugId);
    });
    this.interactionRules = new Map(interactionRules.map((rule) => [pairKey(...rule.drugIds), rule]));
    this.categories = ["All medications", ...new Set(this.entries.map((entry) => entry.category))];
    this.drugClasses = [...new Set(this.entries.map((entry) => entry.drugClass))].sort();
  }

  summary() {
    const variants = this.entries.reduce((count, entry) => count + entry.variants.length, 0);
    const offers = this.entries.reduce((count, entry) => count + entry.variants.reduce((total, variant) => total + variant.offers.length, 0), 0);
    return Object.freeze({
      name: "ClearDose Universal Drug Index",
      version: this.version,
      generated: true,
      localOnly: true,
      drugCount: this.entries.length,
      variantCount: variants,
      offerCount: offers,
      providerCount: demoProviders.length,
      demoLocationCount: demoLocations.length,
      demoLocations: clone(demoLocations),
      availabilityClock: DEMO_CLOCK,
      availabilityCoverage: "deterministic-fictional",
      comparisonCoverage: "explicit-seeded-only",
      interactionCoverage: "synthetic-and-incomplete",
      priceStatus: "fictional",
    });
  }

  listEntries() { return clone(this.entries); }
  listCategories() { return [...this.categories]; }
  listDrugClasses() { return [...this.drugClasses]; }
  getById(id) { return clone(this.byId.get(String(id)) ?? null); }
  getBySlug(slug) { return clone(this.entries.find((entry) => entry.slug === String(slug)) ?? null); }

  search({ query = "", category = "All medications", drugClass = "", sort = "name", limit = 100 } = {}) {
    const term = String(query).trim().toLowerCase();
    const selectedCategory = String(category || "All medications");
    const selectedClass = String(drugClass || "");
    const matches = this.entries.filter((entry) => {
      const haystack = `${entry.name} ${entry.genericFor} ${entry.category} ${entry.drugClass} ${entry.activeIngredient.name} ${entry.manufacturer.name} ${entry.commonUses.join(" ")} ${entry.identifiers.udi}`.toLowerCase();
      return (!term || haystack.includes(term))
        && (selectedCategory === "All medications" || entry.category === selectedCategory)
        && (!selectedClass || entry.drugClass === selectedClass);
    });
    matches.sort((left, right) => {
      if (sort === "price") return left.variants[0].price - right.variants[0].price;
      if (sort === "savings") return (right.variants[0].retail - right.variants[0].price) - (left.variants[0].retail - left.variants[0].price);
      return left.name.localeCompare(right.name);
    });
    return clone(matches.slice(0, normalizeLimit(limit)));
  }

  searchCompact(input = {}) { return this.search(input).map(compactEntry); }

  comparePrices({ drugIds, strength = "", quantity, locationId = "", postalCode = "" } = {}) {
    if (!Array.isArray(drugIds) || drugIds.length < 1 || drugIds.length > 4) {
      throw new TypeError("drugIds must contain between one and four exact UDI drug ids.");
    }
    const normalizedIds = drugIds.map(String);
    for (let leftIndex = 0; leftIndex < normalizedIds.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < normalizedIds.length; rightIndex += 1) {
        this.compatibility.assertAllowed(normalizedIds[leftIndex], normalizedIds[rightIndex], { purpose: "price" });
      }
    }
    const location = resolveDemoLocation({ locationId, postalCode });
    const selections = drugIds.map((drugId) => {
      const entry = requireDrug(this.byId, drugId);
      const variant = exactVariant(entry, { strength, quantity });
      const offers = resolveVariantOffers(variant, location);
      const bestOffer = offers.find((offer) => offer.total != null);
      if (!bestOffer) {
        throw new ClearDoseDomainError("PACKAGE_UNAVAILABLE", `${entry.name} ${variant.strength} is unavailable from every seeded provider at this demo location.`, {
          retryable: true,
          recommendedTool: "cleardose_get_drug_availability",
          recoveryInput: { drugId: entry.id, variantId: variant.id, locationId: location.id },
          details: { drugId: entry.id, variantId: variant.id, locationId: location.id },
        });
      }
      return {
        drug: compactEntry(entry),
        variant: { ...clone(variant), offers },
        bestOffer: clone(bestOffer),
      };
    });
    return {
      selections,
      lowestTotal: Math.min(...selections.map((selection) => selection.bestOffer.total)),
      currency: "USD",
      location: clone(selections[0].bestOffer.location),
      compatibilityEnforced: true,
      disclaimer: "Fictional package prices only. ClearDose ranks only explicitly eligible comparison records and never recommends a medication substitution.",
    };
  }

  findRelated({ drugId, limit = 6 } = {}) {
    const entry = requireDrug(this.byId, drugId);
    const compatibility = this.compatibility.list(entry.id, { purpose: "doctor_discussion" });
    const matches = compatibility.options.slice(0, normalizeLimit(limit, 6, 12)).map((option) => ({
      ...compactEntry(requireDrug(this.byId, option.drugId)),
      relationship: option.relationship,
    }));
    return {
      source: compactEntry(entry),
      relationship: "Explicit seeded clinician-discussion relationship",
      related: matches,
      coverage: "explicit-seeded-only",
      disclaimer: "Related index entries are explicit discussion prompts, not therapeutic equivalents or substitution recommendations.",
    };
  }

  listCompatibleOptions({ drugId, purpose = "facts" } = {}) {
    const source = requireDrug(this.byId, drugId);
    const compatibility = this.compatibility.list(source.id, { purpose });
    const enrich = (option) => ({
      ...option,
      drug: compactEntry(requireDrug(this.byId, option.drugId)),
    });
    return {
      source: compactEntry(source),
      purpose,
      sameDrugProviderComparison: enrich(compatibility.sameDrugProviderComparison),
      options: compatibility.options.map(enrich),
      eligible: compatibility.eligible.map(enrich),
      discussionOnly: compatibility.discussionOnly.map(enrich),
      coverage: compatibility.coverage,
      disclaimer: compatibility.disclaimer,
    };
  }

  compareMedicationOptions(input = {}) {
    const usingSides = input.leftDrugId || input.rightDrugId;
    const drugIds = usingSides ? [input.leftDrugId, input.rightDrugId] : input.drugIds;
    if (!Array.isArray(drugIds) || drugIds.length < 1 || drugIds.length > 4 || drugIds.some((id) => !id)) {
      throw new TypeError("Provide one to four exact drug ids, or both leftDrugId and rightDrugId.");
    }
    const purpose = String(input.purpose || "facts");
    const normalizedIds = drugIds.map(String);
    const relationships = [];
    if (normalizedIds.length === 1) {
      relationships.push({
        leftDrugId: normalizedIds[0],
        rightDrugId: normalizedIds[0],
        ...this.compatibility.assertAllowed(normalizedIds[0], normalizedIds[0], { purpose }),
      });
    }
    for (let leftIndex = 0; leftIndex < normalizedIds.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < normalizedIds.length; rightIndex += 1) {
        relationships.push({
          leftDrugId: normalizedIds[leftIndex],
          rightDrugId: normalizedIds[rightIndex],
          ...this.compatibility.assertAllowed(normalizedIds[leftIndex], normalizedIds[rightIndex], { purpose }),
        });
      }
    }
    const location = resolveDemoLocation({ locationId: input.locationId, postalCode: input.postalCode });
    const selections = normalizedIds.map((drugId, index) => {
      const entry = requireDrug(this.byId, drugId);
      const variantId = usingSides
        ? (index === 0 ? input.leftVariantId : input.rightVariantId)
        : input.variantIds?.[drugId];
      const variant = exactVariant(entry, { variantId });
      const offers = resolveVariantOffers(variant, location);
      const bestOffer = offers.find((offer) => offer.total != null) ?? null;
      return {
        drug: compactEntry(entry),
        variant: { id: variant.id, form: variant.form, strength: variant.strength, quantity: variant.quantity, retail: variant.retail },
        bestOffer,
        offers,
        clinicalSample: clone(entry.clinicalSample),
        commonUses: clone(entry.commonUses),
        commonSideEffects: clone(entry.commonSideEffects),
        importantWarnings: clone(entry.importantWarnings),
        discussionPoints: clone(entry.discussionPoints),
      };
    });
    const allPriceRankable = relationships.every((relationship) => relationship.eligibility.priceRanking);
    const totals = selections.length === 1
      ? selections[0].offers.map((offer) => offer.total).filter(Number.isFinite)
      : selections.map((selection) => selection.bestOffer?.total).filter(Number.isFinite);
    return {
      purpose,
      selections,
      relationships,
      location: selections[0]?.bestOffer?.location ?? { id: location.id, label: location.label, postalCode: location.postalCode, fictional: true },
      rankable: allPriceRankable,
      priceDifference: allPriceRankable && totals.length >= selections.length ? moneyDifference(totals) : null,
      currency: "USD",
      compatibilityCoverage: "explicit-seeded-only",
      clinicalCoverage: "sample-and-incomplete",
      disclaimer: "Structured facts and fictional prices only. Discussion-only records are never ranked as equivalents, and medication decisions require a licensed clinician or pharmacist.",
    };
  }

  getDrugAvailability({ drugId, variantId = "", strength = "", quantity, locationId = "", postalCode = "" } = {}) {
    const entry = requireDrug(this.byId, drugId);
    const variant = exactVariant(entry, { variantId, strength, quantity });
    const location = resolveDemoLocation({ locationId, postalCode });
    const offers = resolveVariantOffers(variant, location);
    const counts = offers.reduce((result, offer) => {
      result[offer.inventory.status] += 1;
      return result;
    }, { in_stock: 0, low_stock: 0, unavailable: 0 });
    return {
      drug: compactEntry(entry),
      variant: { id: variant.id, form: variant.form, strength: variant.strength, quantity: variant.quantity, retail: variant.retail },
      location: offers[0]?.location ?? { id: location.id, label: location.label, postalCode: location.postalCode, fictional: true },
      offers,
      counts,
      checkedAt: DEMO_CLOCK,
      fictional: true,
      recovery: counts.in_stock + counts.low_stock ? null : {
        code: "PACKAGE_UNAVAILABLE",
        recommendedTool: location.id === "demo-baltimore" ? "cleardose_find_compatible_options" : "cleardose_get_drug_availability",
        input: location.id === "demo-baltimore"
          ? { drugId: entry.id, purpose: "fulfillment" }
          : { drugId: entry.id, variantId: variant.id, locationId: "demo-baltimore" },
      },
      disclaimer: "Fictional inventory and fulfillment estimates only. No inventory was reserved and no provider was contacted.",
    };
  }

  compareDrugAvailability({
    drugId,
    variantId = "",
    compatibleDrugIds = [],
    locationId = "",
    postalCode = "",
    fulfillmentMode = "shipping",
    maxDeliveryDays,
  } = {}) {
    if (!Array.isArray(compatibleDrugIds) || compatibleDrugIds.length > 3) throw new TypeError("compatibleDrugIds must contain zero to three exact drug ids.");
    if (!["shipping", "pickup", "either"].includes(fulfillmentMode)) throw new TypeError("fulfillmentMode must be shipping, pickup, or either.");
    const source = requireDrug(this.byId, drugId);
    const sourceVariant = exactVariant(source, { variantId });
    const candidateIds = [...new Set([source.id, ...compatibleDrugIds.map(String)])];
    candidateIds.slice(1).forEach((candidateId) => this.compatibility.assertAllowed(source.id, candidateId, { purpose: "fulfillment" }));
    const location = resolveDemoLocation({ locationId, postalCode });
    const deadline = maxDeliveryDays == null ? null : Math.max(1, Math.min(30, Number(maxDeliveryDays) || 1));
    const options = [];
    const excluded = [];
    candidateIds.forEach((candidateId) => {
      const entry = requireDrug(this.byId, candidateId);
      let variant;
      try {
        variant = candidateId === source.id
          ? sourceVariant
          : exactVariant(entry, { strength: sourceVariant.strength, quantity: sourceVariant.quantity });
      } catch (error) {
        excluded.push({ drugId: candidateId, code: error.code ?? "PACKAGE_NOT_FOUND", message: error.message });
        return;
      }
      resolveVariantOffers(variant, location).forEach((offer) => {
        const pickupEligible = offer.fulfillment.pickup.available;
        const shippingEligible = offer.fulfillment.shipping.available;
        const pickupWithinWindow = pickupEligible;
        const shippingWithinWindow = shippingEligible
          && (deadline == null || offer.fulfillment.shipping.deliveryWindow.maxDays <= deadline);
        const modeEligible = fulfillmentMode === "pickup"
          ? pickupWithinWindow
          : fulfillmentMode === "shipping"
            ? shippingEligible
            : pickupEligible || shippingEligible;
        const deliveryEligible = fulfillmentMode === "pickup"
          ? pickupWithinWindow
          : fulfillmentMode === "shipping"
            ? shippingWithinWindow
            : pickupWithinWindow || shippingWithinWindow;
        if (!modeEligible) {
          excluded.push({ drugId: entry.id, variantId: variant.id, offerId: offer.id, providerId: offer.providerId, code: "PROVIDER_UNAVAILABLE" });
          return;
        }
        if (!deliveryEligible) {
          excluded.push({ drugId: entry.id, variantId: variant.id, offerId: offer.id, providerId: offer.providerId, code: "DELIVERY_WINDOW_MISSED", deliveryWindow: offer.fulfillment.shipping.deliveryWindow });
          return;
        }
        const selectedMode = fulfillmentMode === "either"
          ? pickupWithinWindow && shippingWithinWindow
            ? (offer.pickupCashTotal <= offer.deliveredCashTotal ? "pickup" : "shipping")
            : pickupWithinWindow
              ? "pickup"
              : "shipping"
          : fulfillmentMode;
        options.push({
          drug: compactEntry(entry),
          variant: { id: variant.id, form: variant.form, strength: variant.strength, quantity: variant.quantity },
          offer,
          fulfillmentMode: selectedMode,
          estimatedTotal: selectedMode === "pickup" ? offer.pickupCashTotal : offer.deliveredCashTotal,
          arrivalDays: selectedMode === "pickup" ? 0 : offer.fulfillment.shipping.deliveryWindow.maxDays,
        });
      });
    });
    options.sort((left, right) => left.estimatedTotal - right.estimatedTotal || left.arrivalDays - right.arrivalDays || left.offer.providerName.localeCompare(right.offer.providerName));
    if (!options.length) {
      const missedWindow = excluded.some((item) => item.code === "DELIVERY_WINDOW_MISSED");
      const code = missedWindow ? "DELIVERY_WINDOW_MISSED" : "PACKAGE_UNAVAILABLE";
      throw new ClearDoseDomainError(code, missedWindow ? "No compatible seeded option can arrive within the requested window." : "No compatible seeded option is available for the requested fulfillment mode.", {
        retryable: true,
        recommendedTool: "cleardose_get_drug_availability",
        recoveryInput: { drugId: source.id, variantId: sourceVariant.id, locationId: location.id },
        details: { fulfillmentMode, maxDeliveryDays: deadline, excluded },
      });
    }
    return {
      source: compactEntry(source),
      sourceVariant: { id: sourceVariant.id, form: sourceVariant.form, strength: sourceVariant.strength, quantity: sourceVariant.quantity },
      location: options[0].offer.location,
      purpose: "fulfillment",
      fulfillmentMode,
      maxDeliveryDays: deadline,
      options,
      excluded,
      bestOption: options[0],
      fictional: true,
      disclaimer: "The ranking uses explicit compatibility, fictional prices, and deterministic demo availability. It does not recommend a medication change or reserve inventory.",
    };
  }

  estimateDelivery({ drugId, variantId = "", offerId = "", providerId = "", locationId = "", postalCode = "", fulfillmentMode = "shipping" } = {}) {
    if (!["shipping", "pickup"].includes(fulfillmentMode)) throw new TypeError("fulfillmentMode must be shipping or pickup.");
    const availability = this.getDrugAvailability({ drugId, variantId, locationId, postalCode });
    const offer = offerId
      ? availability.offers.find((item) => item.id === String(offerId))
      : providerId
        ? availability.offers.find((item) => item.providerId === String(providerId))
        : [...availability.offers]
          .filter((item) => item.fulfillment[fulfillmentMode].available)
          .sort((left, right) => {
            const leftTotal = fulfillmentMode === "pickup" ? left.pickupCashTotal : left.deliveredCashTotal;
            const rightTotal = fulfillmentMode === "pickup" ? right.pickupCashTotal : right.deliveredCashTotal;
            return leftTotal - rightTotal || left.providerName.localeCompare(right.providerName);
          })[0];
    if (!offer) {
      throw new ClearDoseDomainError("PROVIDER_NOT_FOUND", "No seeded provider offer matched that exact package request.", {
        retryable: true,
        recommendedTool: "cleardose_get_drug_availability",
        recoveryInput: { drugId: availability.drug.id, variantId: availability.variant.id, locationId: availability.location.id },
        details: { offerId: offerId || null, providerId: providerId || null },
      });
    }
    const estimate = offer.fulfillment[fulfillmentMode];
    if (!estimate.available) {
      throw new ClearDoseDomainError("PROVIDER_UNAVAILABLE", `${offer.providerName} cannot provide ${fulfillmentMode} for this seeded package and location.`, {
        retryable: true,
        recommendedTool: "cleardose_get_drug_availability",
        recoveryInput: { drugId: availability.drug.id, variantId: availability.variant.id, locationId: availability.location.id },
        details: { offerId: offer.id, providerId: offer.providerId, fulfillmentMode, inventory: offer.inventory },
      });
    }
    return {
      drug: availability.drug,
      variant: availability.variant,
      offer,
      location: availability.location,
      fulfillmentMode,
      estimate,
      estimatedTotal: fulfillmentMode === "pickup" ? offer.pickupCashTotal : offer.deliveredCashTotal,
      fictional: true,
      disclaimer: "Deterministic demo estimate only. ClearDose did not contact a provider, reserve inventory, or promise delivery.",
    };
  }

  reviewInteractionFlags({ drugIds } = {}) {
    if (!Array.isArray(drugIds) || drugIds.length < 2 || drugIds.length > 10) {
      throw new TypeError("drugIds must contain between two and ten exact UDI drug ids.");
    }
    const uniqueIds = [...new Set(drugIds.map(String))];
    uniqueIds.forEach((id) => {
      if (!this.byId.has(id)) throw new TypeError(`Unknown UDI drug id: ${id}.`);
    });
    const flags = [];
    const uncoveredPairs = [];
    for (let leftIndex = 0; leftIndex < uniqueIds.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < uniqueIds.length; rightIndex += 1) {
        const left = uniqueIds[leftIndex];
        const right = uniqueIds[rightIndex];
        const rule = this.interactionRules.get(pairKey(left, right));
        if (rule) flags.push({ ...clone(rule), drugs: [this.byId.get(left).name, this.byId.get(right).name] });
        else uncoveredPairs.push([left, right]);
      }
    }
    const duplicateIds = drugIds.filter((id, index) => drugIds.indexOf(id) !== index);
    if (duplicateIds.length) {
      flags.unshift({
        severity: "duplicate-entry",
        drugIds: [...new Set(duplicateIds)],
        message: "The same UDI entry appears more than once. Verify whether the medication list was duplicated.",
      });
    }
    return {
      checkedDrugIds: drugIds.map(String),
      flags,
      uncoveredPairCount: uncoveredPairs.length,
      coverage: "synthetic-and-incomplete",
      requiresProfessionalReview: true,
      disclaimer: "This demo cannot determine that a combination is safe. Verify every medication list with a licensed pharmacist using current authoritative sources.",
    };
  }

  buildProcurementPlan({ items, strategy = "lowest_total", locationId = "", postalCode = "", maxDeliveryDays } = {}) {
    if (!Array.isArray(items) || items.length < 1 || items.length > 12) {
      throw new TypeError("items must contain between one and twelve requested medications.");
    }
    if (!["lowest_total", "fewest_shipments", "balanced"].includes(strategy)) {
      throw new TypeError("strategy must be lowest_total, fewest_shipments, or balanced.");
    }
    const location = resolveDemoLocation({ locationId, postalCode });
    const deadline = maxDeliveryDays == null ? null : Math.max(1, Math.min(30, Number(maxDeliveryDays) || 1));
    const planItems = items.map((request) => {
      const entry = requireDrug(this.byId, request.drugId);
      const variant = exactVariant(entry, { variantId: request.variantId, strength: request.strength, quantity: request.quantity });
      const offers = resolveVariantOffers(variant, location)
        .filter((offer) => offer.inventory.status !== "unavailable" && offer.fulfillment.shipping.available)
        .filter((offer) => deadline == null || offer.fulfillment.shipping.deliveryWindow.maxDays <= deadline)
        .map((offer) => ({ ...offer, total: offer.deliveredCashTotal }))
        .sort((left, right) => left.total - right.total || left.providerName.localeCompare(right.providerName));
      if (!offers.length) {
        throw new ClearDoseDomainError(deadline == null ? "PACKAGE_UNAVAILABLE" : "DELIVERY_WINDOW_MISSED", deadline == null ? `${entry.name} has no available seeded shipping offer.` : `${entry.name} has no seeded shipping offer within ${deadline} days.`, {
          retryable: true,
          recommendedTool: "cleardose_get_drug_availability",
          recoveryInput: { drugId: entry.id, variantId: variant.id, locationId: location.id },
          details: { drugId: entry.id, variantId: variant.id, maxDeliveryDays: deadline },
        });
      }
      let selected = offers[0];
      if (strategy === "fewest_shipments") selected = offers.find((offer) => offer.providerId === "harbor-demo-pharmacy") ?? offers[0];
      if (strategy === "balanced") selected = [...offers].sort((left, right) => (left.total + left.fulfillment.shipping.deliveryWindow.maxDays) - (right.total + right.fulfillment.shipping.deliveryWindow.maxDays))[0];
      return {
        drugId: entry.id,
        name: entry.name,
        variantId: variant.id,
        strength: variant.strength,
        quantity: variant.quantity,
        selectedOffer: clone(selected),
      };
    });
    return {
      strategy,
      items: planItems,
      estimatedTotal: roundMoney(planItems.reduce((total, item) => total + item.selectedOffer.total, 0)),
      channels: [...new Set(planItems.map((item) => item.selectedOffer.channel))],
      location: planItems[0]?.selectedOffer.location ?? null,
      maxDeliveryDays: deadline,
      placedOrder: false,
      localOnly: true,
      disclaimer: "Planning result only. ClearDose did not reserve inventory, validate a prescription, or place an order.",
    };
  }
}
