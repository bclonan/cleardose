import { assertClearDoseDataAdapter } from "../../domain/ports/ClearDoseDataAdapter";

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
        cart: this.adapter.cart.list(),
        orders: this.adapter.orders.list(),
        prescriptions: this.adapter.prescriptions.list(),
      },
    };
  }

  searchMedications(filters) { return this.adapter.catalog.list(filters); }
  medicationById(id) { return this.adapter.catalog.findById(id); }
  medicationBySlug(slug) { return this.adapter.catalog.findBySlug(slug); }

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
  resetDemo() { this.adapter.dao.reset(); }

  placeOrder(input) {
    const customer = this.adapter.customers.current();
    const cart = this.adapter.cart.list();
    if (!customer || !cart.length) return null;
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.units, 0);
    const shipping = cart.length ? 5 : 0;
    return this.adapter.orders.place({ ...input, customer, cart, subtotal, shipping, total: subtotal + shipping });
  }
}
