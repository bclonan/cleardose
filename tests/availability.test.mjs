import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  configFile: false,
  root,
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
});
after(async () => vite.close());

async function createFacade(storageKey) {
  const { createClearDoseBrowserAdapter } = await vite.ssrLoadModule("/src/infrastructure/adapters/createClearDoseBrowserAdapter.js");
  const { MemoryStorageAdapter } = await vite.ssrLoadModule("/src/infrastructure/persistence/BrowserStateDao.js");
  const { ClearDoseFacade } = await vite.ssrLoadModule("/src/application/facades/ClearDoseFacade.js");
  return new ClearDoseFacade(createClearDoseBrowserAdapter({ storage: new MemoryStorageAdapter(), storageKey }));
}

test("comparison rejects unrelated medications with a structured recovery path", async () => {
  const facade = await createFacade("availability-incompatible");

  assert.throws(
    () => facade.compareDrugPrices({ drugIds: ["med_atorvastatin", "med_lisinopril"] }),
    (error) => {
      assert.equal(error.name, "ClearDoseDomainError");
      assert.equal(error.code, "INCOMPATIBLE_COMPARISON");
      assert.equal(error.retryable, true);
      assert.equal(error.recommendedTool, "cleardose_find_compatible_options");
      assert.deepEqual(error.recoveryInput, { drugId: "med_atorvastatin", purpose: "price" });
      assert.equal(error.details.sameDrugProviderComparisonAvailable, true);
      return true;
    },
  );
});

test("exact package requests never fall back to a different indexed package", async () => {
  const facade = await createFacade("availability-exact-package");

  assert.throws(
    () => facade.getDrugAvailability({
      drugId: "med_lisinopril",
      variantId: "lisinopril-10mg-999",
      locationId: "demo-baltimore",
    }),
    (error) => {
      assert.equal(error.code, "PACKAGE_NOT_FOUND");
      assert.equal(error.recommendedTool, "cleardose_get_drug_index_entry");
      assert.ok(error.details.availablePackages.some((item) => item.id === "lisinopril-10mg-60"));
      return true;
    },
  );

  assert.throws(
    () => facade.getDrugAvailability({
      drugId: "med_lisinopril",
      variantId: "lisinopril-10mg-60",
      locationId: "demo-baltimore",
      postalCode: "60601",
    }),
    (error) => {
      assert.equal(error.code, "LOCATION_MISMATCH");
      assert.equal(error.recommendedTool, "cleardose_get_drug_availability");
      assert.deepEqual(error.recoveryInput, { locationId: "demo-baltimore", postalCode: "21201" });
      assert.equal(error.details.locationIdMatch.id, "demo-baltimore");
      assert.equal(error.details.postalCodeMatch.id, "demo-chicago");
      return true;
    },
  );
});

test("compatible options distinguish provider comparison from clinician discussion records", async () => {
  const facade = await createFacade("availability-compatible-options");
  const result = facade.listCompatibleOptions({ drugId: "med_lisinopril", purpose: "fulfillment" });
  const losartan = result.options.find((item) => item.drugId === "med_losartan");

  assert.equal(result.sameDrugProviderComparison.drugId, "med_lisinopril");
  assert.equal(result.sameDrugProviderComparison.eligibleForPurpose, true);
  assert.equal(result.sameDrugProviderComparison.relationship.kind, "same_drug");
  assert.equal(losartan.relationship.kind, "discussion_only_alternative");
  assert.equal(losartan.eligibleForPurpose, false);
  assert.equal(losartan.relationship.clinicallyEquivalent, false);
  assert.match(result.disclaimer, /not therapeutic equivalents/i);
});

test("semantic comparison exposes bounded clinical samples without ranking alternatives", async () => {
  const facade = await createFacade("availability-clinical-sample");
  const result = facade.compareMedicationOptions({
    leftDrugId: "med_lisinopril",
    rightDrugId: "med_losartan",
    purpose: "facts",
    locationId: "demo-baltimore",
  });

  assert.equal(result.relationships[0].kind, "discussion_only_alternative");
  assert.equal(result.rankable, false);
  assert.equal(result.priceDifference, null);
  assert.equal(result.selections[0].clinicalSample.coverage, "sample-and-incomplete");
  assert.equal(result.selections[0].clinicalSample.requiresProfessionalReview, true);
  assert.match(result.selections[0].clinicalSample.source.url, /^https:\/\/dailymed\.nlm\.nih\.gov\//);
  assert.ok(result.selections[0].importantWarnings.length > 0);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.selections[0].clinicalSample));

  assert.throws(
    () => facade.compareMedicationOptions({
      leftDrugId: "med_lisinopril",
      rightDrugId: "med_losartan",
      purpose: "price",
    }),
    (error) => error.code === "INCOMPATIBLE_COMPARISON",
  );

  const providerComparison = facade.compareMedicationOptions({
    drugIds: ["med_lisinopril"],
    variantIds: { med_lisinopril: "lisinopril-10mg-60" },
    purpose: "price",
    locationId: "demo-baltimore",
  });
  assert.equal(providerComparison.relationships[0].kind, "same_drug");
  assert.equal(providerComparison.rankable, true);
  assert.equal(providerComparison.selections[0].offers.length, 4);
  assert.ok(providerComparison.priceDifference > 0);
});

test("seeded availability is deterministic and includes provider fulfillment details", async () => {
  const facade = await createFacade("availability-deterministic");
  const input = {
    drugId: "med_lisinopril",
    variantId: "lisinopril-10mg-60",
    locationId: "demo-baltimore",
  };
  const first = facade.getDrugAvailability(input);
  const second = facade.getDrugAvailability(input);
  const metro = first.offers.find((offer) => offer.providerId === "metro-demo-pharmacy");
  const harbor = first.offers.find((offer) => offer.providerId === "harbor-demo-pharmacy");

  assert.deepEqual(first, second);
  assert.deepEqual(first.counts, { in_stock: 2, low_stock: 1, unavailable: 1 });
  assert.equal(first.offers.length, 4);
  assert.equal(first.checkedAt, "2026-08-29T12:00:00.000Z");
  assert.equal(metro.inventory.status, "unavailable");
  assert.equal(metro.inventory.estimatedRestockOn, "2026-09-03");
  assert.equal(metro.fulfillment.pickup.available, false);
  assert.equal(metro.fulfillment.shipping.available, false);
  assert.equal(harbor.fulfillment.pickup.available, true);
  assert.deepEqual(harbor.fulfillment.shipping.deliveryWindow, { minDays: 1, maxDays: 2 });
  assert.equal(harbor.location.postalCode, "21201");
  assert.equal(harbor.fictional, true);
  assert.ok(Object.isFrozen(first.offers[0].inventory));
});

test("availability ranking uses only the exact medication and providers inside the delivery window", async () => {
  const facade = await createFacade("availability-three-days");
  const result = facade.compareDrugAvailability({
    drugId: "med_lisinopril",
    variantId: "lisinopril-10mg-60",
    locationId: "demo-baltimore",
    fulfillmentMode: "shipping",
    maxDeliveryDays: 3,
  });

  assert.equal(result.source.id, "med_lisinopril");
  assert.equal(result.sourceVariant.id, "lisinopril-10mg-60");
  assert.ok(result.options.length >= 1);
  assert.ok(result.options.every((option) => option.drug.id === "med_lisinopril"));
  assert.ok(result.options.every((option) => option.offer.fulfillment.shipping.deliveryWindow.maxDays <= 3));
  assert.ok(result.options.every((option) => option.offer.inventory.status !== "unavailable"));
  assert.equal(result.bestOption.estimatedTotal, Math.min(...result.options.map((option) => option.estimatedTotal)));
  assert.ok(result.excluded.some((item) => item.providerId === "metro-demo-pharmacy" && item.code === "PROVIDER_UNAVAILABLE"));

  const pickupFallback = facade.compareDrugAvailability({
    drugId: "med_lisinopril",
    variantId: "lisinopril-10mg-60",
    locationId: "demo-baltimore",
    fulfillmentMode: "either",
    maxDeliveryDays: 1,
  });
  assert.ok(pickupFallback.options.length >= 1);
  assert.ok(pickupFallback.options.every((option) => option.fulfillmentMode === "pickup"));
  assert.ok(pickupFallback.options.every((option) => option.arrivalDays === 0));
});

test("delivery deadline and provider failures return typed recovery metadata", async () => {
  const facade = await createFacade("availability-recovery");

  const unavailable = facade.getDrugAvailability({
    drugId: "med_azithromycin",
    variantId: "azithromycin-500mg-60",
    locationId: "demo-chicago",
  });
  assert.deepEqual(unavailable.counts, { in_stock: 0, low_stock: 0, unavailable: 4 });
  assert.deepEqual(unavailable.recovery, {
    code: "PACKAGE_UNAVAILABLE",
    recommendedTool: "cleardose_get_drug_availability",
    input: {
      drugId: "med_azithromycin",
      variantId: "azithromycin-500mg-60",
      locationId: "demo-baltimore",
    },
  });
  const recovered = facade.getDrugAvailability(unavailable.recovery.input);
  assert.ok(recovered.counts.in_stock >= 1);

  assert.throws(
    () => facade.compareDrugAvailability({
      ...unavailable.recovery.input,
      locationId: "demo-chicago",
      fulfillmentMode: "shipping",
    }),
    (error) => error.code === "PACKAGE_UNAVAILABLE",
  );

  assert.throws(
    () => facade.compareDrugAvailability({
      drugId: "med_atorvastatin",
      variantId: "atorvastatin-40mg-90",
      locationId: "demo-remote",
      fulfillmentMode: "shipping",
      maxDeliveryDays: 3,
    }),
    (error) => {
      assert.equal(error.code, "DELIVERY_WINDOW_MISSED");
      assert.equal(error.retryable, true);
      assert.equal(error.recommendedTool, "cleardose_get_drug_availability");
      assert.ok(error.details.excluded.some((item) => item.code === "DELIVERY_WINDOW_MISSED"));
      return true;
    },
  );

  assert.throws(
    () => facade.estimateDelivery({
      drugId: "med_lisinopril",
      variantId: "lisinopril-10mg-60",
      providerId: "metro-demo-pharmacy",
      locationId: "demo-baltimore",
      fulfillmentMode: "shipping",
    }),
    (error) => {
      assert.equal(error.code, "PROVIDER_UNAVAILABLE");
      assert.equal(error.details.providerId, "metro-demo-pharmacy");
      assert.deepEqual(error.recoveryInput, {
        drugId: "med_lisinopril",
        variantId: "lisinopril-10mg-60",
        locationId: "demo-baltimore",
      });
      return true;
    },
  );

  assert.throws(
    () => facade.getDrugAvailability({
      drugId: "med_lisinopril",
      variantId: "lisinopril-10mg-60",
      postalCode: "00000",
    }),
    (error) => {
      assert.equal(error.code, "LOCATION_UNAVAILABLE");
      assert.equal(error.recoveryInput.locationId, "demo-baltimore");
      assert.equal(error.details.supportedLocations.length, 3);
      return true;
    },
  );
});

test("procurement planning keeps exact packages and excludes late or unavailable offers", async () => {
  const facade = await createFacade("availability-procurement");
  const availability = facade.getDrugAvailability({
    drugId: "med_lisinopril",
    variantId: "lisinopril-10mg-60",
    locationId: "demo-baltimore",
  });
  const plan = facade.buildProcurementPlan({
    items: [{ drugId: "med_lisinopril", variantId: "lisinopril-10mg-60" }],
    locationId: "demo-baltimore",
    maxDeliveryDays: 3,
  });

  assert.equal(plan.items[0].variantId, "lisinopril-10mg-60");
  assert.notEqual(plan.items[0].selectedOffer.inventory.status, "unavailable");
  assert.ok(plan.items[0].selectedOffer.fulfillment.shipping.deliveryWindow.maxDays <= 3);
  assert.equal(
    plan.items[0].selectedOffer.total,
    Math.min(...availability.offers.filter((offer) => offer.fulfillment.shipping.available).map((offer) => offer.deliveredCashTotal)),
  );
  assert.equal(plan.placedOrder, false);
  assert.match(plan.disclaimer, /did not reserve inventory/i);
});
