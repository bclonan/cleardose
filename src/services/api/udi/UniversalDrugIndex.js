import { clone } from "../../../domain/shared/clone";

const OFFER_CHANNELS = Object.freeze([
  { id: "cleardose-local", name: "ClearDose Local", multiplier: 1, shipping: 5, etaDays: 3 },
  { id: "community-demo", name: "Community Demo Pharmacy", multiplier: 1.14, shipping: 0, etaDays: 1 },
  { id: "mail-order-mock", name: "Mail-order Mock", multiplier: 0.91, shipping: 7, etaDays: 5 },
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
    fromPrice: Math.min(...entry.variants.map((variant) => variant.price)),
    variantCount: entry.variants.length,
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
    const offers = OFFER_CHANNELS.map((channel, channelIndex) => {
      const price = roundMoney(basePrice * channel.multiplier + channelIndex * 0.37);
      const shipping = channel.id === "cleardose-local" && price >= 12 ? 0 : channel.shipping;
      const total = roundMoney(price + shipping);
      return {
        id: `${concept.key}-${slugify(strength)}-${quantity}-${channel.id}`,
        channelId: channel.id,
        channel: channel.name,
        packagePrice: price,
        shipping,
        total,
        unitPrice: roundMoney(total / Math.max(1, quantity)),
        availability: (seed + channelIndex) % 7 === 0 ? "limited-demo-stock" : "available-demo-stock",
        etaDays: channel.etaDays,
      };
    }).sort((left, right) => left.total - right.total);
    const retail = roundMoney(basePrice * (2.8 + ((seed % 210) / 100)));
    return {
      id: `${concept.key}-${slugify(strength)}-${quantity}`,
      form: concept.form,
      strength,
      quantity,
      price: offers[0].total,
      retail,
      offers,
    };
  });

  return {
    id,
    slug: slugify(concept.name),
    name: concept.name,
    genericFor: concept.genericFor,
    category: concept.category,
    drugClass: concept.drugClass,
    comparisonGroup: concept.comparisonGroup,
    description: concept.description,
    popular: conceptIndex < 12,
    identifiers: {
      udi: `udi:cleardose:${concept.key}`,
      rxCui: null,
      ndc: null,
    },
    variants,
  };
}

function normalizeLimit(value, fallback = 20, maximum = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(maximum, Math.trunc(parsed)));
}

function pairKey(left, right) { return [left, right].sort().join("|"); }

export class UniversalDrugIndex {
  constructor({ concepts, interactionRules, version = "demo-2026.08" }) {
    this.version = version;
    this.entries = concepts.map(buildMedication);
    this.byId = new Map(this.entries.map((entry) => [entry.id, entry]));
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
      const haystack = `${entry.name} ${entry.genericFor} ${entry.category} ${entry.drugClass} ${entry.identifiers.udi}`.toLowerCase();
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

  comparePrices({ drugIds, strength = "", quantity } = {}) {
    if (!Array.isArray(drugIds) || drugIds.length < 1 || drugIds.length > 4) {
      throw new TypeError("drugIds must contain between one and four exact UDI drug ids.");
    }
    const selections = drugIds.map((drugId) => {
      const entry = this.byId.get(String(drugId));
      if (!entry) throw new TypeError(`Unknown UDI drug id: ${drugId}.`);
      const variant = entry.variants.find((item) => (!strength || item.strength === strength) && (!quantity || item.quantity === Number(quantity)))
        ?? entry.variants.find((item) => !strength || item.strength === strength)
        ?? entry.variants[0];
      return {
        drug: compactEntry(entry),
        variant: clone(variant),
        bestOffer: clone(variant.offers[0]),
      };
    });
    return {
      selections,
      lowestTotal: Math.min(...selections.map((selection) => selection.bestOffer.total)),
      currency: "USD",
      disclaimer: "Fictional package prices only. Different drugs are not presented as clinical substitutes.",
    };
  }

  findRelated({ drugId, limit = 6 } = {}) {
    const entry = this.byId.get(String(drugId));
    if (!entry) throw new TypeError(`Unknown UDI drug id: ${drugId}.`);
    const matches = this.entries
      .filter((candidate) => candidate.id !== entry.id && candidate.comparisonGroup === entry.comparisonGroup)
      .slice(0, normalizeLimit(limit, 6, 12))
      .map(compactEntry);
    return {
      source: compactEntry(entry),
      relationship: `Shared broad demo group: ${entry.comparisonGroup}`,
      related: matches,
      disclaimer: "Related index entries are discussion prompts, not therapeutic equivalents or substitution recommendations.",
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

  buildProcurementPlan({ items, strategy = "lowest_total" } = {}) {
    if (!Array.isArray(items) || items.length < 1 || items.length > 12) {
      throw new TypeError("items must contain between one and twelve requested medications.");
    }
    if (!["lowest_total", "fewest_shipments", "balanced"].includes(strategy)) {
      throw new TypeError("strategy must be lowest_total, fewest_shipments, or balanced.");
    }
    const planItems = items.map((request) => {
      const entry = this.byId.get(String(request.drugId));
      if (!entry) throw new TypeError(`Unknown UDI drug id: ${request.drugId}.`);
      const variant = entry.variants.find((item) => (!request.strength || item.strength === request.strength)
        && (!request.quantity || item.quantity === Number(request.quantity))) ?? entry.variants[0];
      const offers = [...variant.offers];
      let selected = offers[0];
      if (strategy === "fewest_shipments") selected = offers.find((offer) => offer.channelId === "cleardose-local") ?? offers[0];
      if (strategy === "balanced") selected = [...offers].sort((left, right) => (left.total + left.etaDays) - (right.total + right.etaDays))[0];
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
      placedOrder: false,
      localOnly: true,
      disclaimer: "Planning result only. ClearDose did not reserve inventory, validate a prescription, or place an order.",
    };
  }
}

