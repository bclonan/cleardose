import { assertClearDoseDataAdapter } from "../../domain/ports/ClearDoseDataAdapter";
import { toCheckoutOrderInput } from "../../domain/dto/CheckoutOrderInputDto";

export class ClearDoseFacade {
  constructor(adapter) {
    this.adapter = assertClearDoseDataAdapter(adapter);
  }

  getSnapshot() {
    const currentCustomer = this.adapter.customers.current();
    return {
      state: {
        currentCustomerId: currentCustomer?.id ?? null,
        currentCustomer,
        medications: this.adapter.catalog.list(),
        categories: this.adapter.catalog.listCategories(),
        drugClasses: this.adapter.api.listDrugClasses(),
        drugIndexSummary: this.adapter.api.getDrugIndexSummary(),
        cart: this.adapter.cart.list(),
        orders: this.adapter.orders.list(),
        prescriptions: this.adapter.prescriptions.list(),
      },
    };
  }

  searchMedications(filters) { return this.adapter.catalog.list(filters); }
  medicationById(id) { return this.adapter.catalog.findById(id); }
  medicationBySlug(slug) { return this.adapter.catalog.findBySlug(slug); }
  searchDrugIndex(input) { return this.adapter.catalog.searchDrugIndex(input); }
  drugIndexEntry(drugId) { return this.adapter.catalog.drugIndexEntry(drugId); }
  compareDrugPrices(input) { return this.adapter.catalog.compareDrugPrices(input); }
  findRelatedDrugs(input) { return this.adapter.catalog.findRelatedDrugs(input); }
  listCompatibleOptions(input) { return this.adapter.catalog.listCompatibleOptions(input); }
  compareMedicationOptions(input) { return this.adapter.catalog.compareMedicationOptions(input); }
  getDrugAvailability(input) { return this.adapter.catalog.getDrugAvailability(input); }
  compareDrugAvailability(input) { return this.adapter.catalog.compareDrugAvailability(input); }
  estimateDelivery(input) { return this.adapter.catalog.estimateDelivery(input); }
  reviewInteractionFlags(input) { return this.adapter.catalog.reviewInteractionFlags(input); }
  buildProcurementPlan(input) { return this.adapter.catalog.buildProcurementPlan(input); }

  compareMedications({ leftMedicationId, rightMedicationId, leftVariantId, rightVariantId }) {
    let semanticComparison;
    try {
      semanticComparison = this.compareMedicationOptions({
        leftDrugId: leftMedicationId,
        rightDrugId: rightMedicationId,
        leftVariantId,
        rightVariantId,
        purpose: "facts",
      });
    } catch (error) {
      if (error?.code === "INCOMPATIBLE_COMPARISON") return null;
      throw error;
    }
    const buildSide = (medicationId, variantId) => {
      const medication = this.medicationById(medicationId);
      if (!medication) return null;
      const variant = medication.variants.find((item) => item.id === variantId) ?? medication.variants[0];
      const savings = Number((variant.retail - variant.price).toFixed(2));
      return {
        medication,
        variant,
        savings,
        savingsPercent: Math.round((1 - variant.price / variant.retail) * 100),
      };
    };
    const left = buildSide(leftMedicationId, leftVariantId);
    const right = buildSide(rightMedicationId, rightVariantId);
    if (!left || !right) return null;
    return Object.freeze({
      left,
      right,
      relationship: semanticComparison.relationships[0] ?? null,
      rankable: semanticComparison.rankable,
      priceDifference: semanticComparison.rankable ? Number(Math.abs(left.variant.price - right.variant.price).toFixed(2)) : null,
      disclaimer: semanticComparison.disclaimer,
    });
  }

  addToCart(medicationId, variantId) {
    const medication = this.medicationById(medicationId);
    const variant = medication?.variants.find((item) => item.id === variantId);
    if (!medication || !variant) return false;
    return this.adapter.cart.add(medication, variant);
  }

  removeFromCart(variantId) { this.adapter.cart.remove(variantId); }
  setCartUnits(variantId, units) { this.adapter.cart.setUnits(variantId, units); }
  authenticate(email, password) { return this.adapter.customers.authenticate(email, password); }
  createCustomer(input) { return this.adapter.customers.create(input); }
  updateCurrentCustomer(changes) { return this.adapter.customers.updateCurrent(changes); }
  logout() { this.adapter.customers.logout(); }
  resetDemo() { this.adapter.api.reset(); }

  placeOrder(input) {
    const customer = this.adapter.customers.current();
    const cart = this.adapter.cart.list();
    if (!customer || !cart.length) return null;
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.units, 0);
    const shipping = cart.length ? 5 : 0;
    return this.adapter.orders.place({ ...toCheckoutOrderInput(input), customer, cart, subtotal, shipping, total: subtotal + shipping });
  }
}
