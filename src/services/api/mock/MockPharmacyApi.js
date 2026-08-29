import { clone } from "../../../domain/shared/clone";

/**
 * In-browser stand-in for a future HTTP service. It owns mock request behavior
 * and returns raw records; repositories remain responsible for DTO mapping.
 */
export class MockPharmacyApi {
  constructor({ dao, medications, categories }) {
    this.dao = dao;
    this.medications = clone(medications);
    this.categories = [...categories];
  }

  listMedications({ query = "", category = "All medications", sort = "name" } = {}) {
    const term = String(query).trim().toLowerCase();
    const results = this.medications.filter((medication) => {
      const haystack = `${medication.name} ${medication.genericFor} ${medication.category}`.toLowerCase();
      return (!term || haystack.includes(term))
        && (category === "All medications" || medication.category === category);
    });
    return clone(results).sort((a, b) => {
      if (sort === "price") return a.variants[0].price - b.variants[0].price;
      if (sort === "savings") return (b.variants[0].retail - b.variants[0].price) - (a.variants[0].retail - a.variants[0].price);
      return a.name.localeCompare(b.name);
    });
  }

  getMedicationById(id) { return clone(this.medications.find((item) => item.id === id) ?? null); }
  getMedicationBySlug(slug) { return clone(this.medications.find((item) => item.slug === slug) ?? null); }
  listCategories() { return [...this.categories]; }

  getCurrentCustomer() {
    const state = this.dao.read();
    return clone(state.customers.find((item) => item.id === state.currentCustomerId) ?? null);
  }

  authenticateCustomer(email, password) {
    return this.dao.mutate((state) => {
      const customer = state.customers.find(
        (item) => item.email.toLowerCase() === String(email).trim().toLowerCase() && item.password === password,
      );
      if (!customer) return { ok: false, message: "We couldn't match that demo email and password." };
      state.currentCustomerId = customer.id;
      return { ok: true, customer: clone(customer) };
    });
  }

  createCustomer(input) {
    return this.dao.mutate((state) => {
      const email = String(input.email).trim().toLowerCase();
      if (state.customers.some((item) => item.email.toLowerCase() === email)) {
        return { ok: false, message: "An account with that email already exists." };
      }
      const customer = {
        id: `cust_${Date.now()}`,
        firstName: String(input.firstName).trim(),
        lastName: String(input.lastName).trim(),
        email,
        password: String(input.password),
        phone: String(input.phone).trim(),
        dateOfBirth: String(input.dateOfBirth),
        address: { line1: "", line2: "", city: "", state: "", zip: "" },
      };
      state.customers.push(customer);
      state.currentCustomerId = customer.id;
      return { ok: true, customer: clone(customer) };
    });
  }

  updateCurrentCustomer(changes) {
    return this.dao.mutate((state) => {
      const customer = state.customers.find((item) => item.id === state.currentCustomerId);
      if (!customer) return false;
      Object.assign(customer, clone(changes));
      return true;
    });
  }

  logoutCustomer() { this.dao.mutate((state) => { state.currentCustomerId = null; }); }
  listCart() { return clone(this.dao.read().cart); }

  addCartItem(medicationId, variantId) {
    const medication = this.medications.find((item) => item.id === medicationId);
    const variant = medication?.variants.find((item) => item.id === variantId);
    if (!medication || !variant) return false;
    return this.dao.mutate((state) => {
      const existing = state.cart.find((item) => item.variantId === variantId);
      if (existing) existing.units = Math.min(3, existing.units + 1);
      else state.cart.push({
        medicationId: medication.id,
        variantId: variant.id,
        name: medication.name,
        genericFor: medication.genericFor,
        form: variant.form,
        strength: variant.strength,
        quantity: variant.quantity,
        price: variant.price,
        retail: variant.retail,
        units: 1,
      });
      return true;
    });
  }

  removeCartItem(variantId) {
    this.dao.mutate((state) => { state.cart = state.cart.filter((item) => item.variantId !== variantId); });
  }

  setCartItemUnits(variantId, units) {
    const next = Math.max(0, Math.min(3, Number(units) || 0));
    this.dao.mutate((state) => {
      if (!next) state.cart = state.cart.filter((item) => item.variantId !== variantId);
      else {
        const item = state.cart.find((entry) => entry.variantId === variantId);
        if (item) item.units = next;
      }
    });
  }

  clearCart() { this.dao.mutate((state) => { state.cart = []; }); }
  listOrders() { return clone(this.dao.read().orders); }
  listPrescriptions() { return clone(this.dao.read().prescriptions); }

  placeOrder({ customer, cart, address, prescriptionMethod, paymentMethod, subtotal, shipping, total }) {
    return this.dao.mutate((state) => {
      const id = `CLR-${String(Date.now()).slice(-5)}`;
      const order = {
        id,
        customerId: customer.id,
        placedAt: new Date().toISOString().slice(0, 10),
        status: prescriptionMethod === "on-file" ? "processing" : "waiting-for-prescription",
        tracking: null,
        subtotal: Number(subtotal.toFixed(2)),
        shipping,
        tax: 0,
        total: Number(total.toFixed(2)),
        address: clone(address),
        prescriptionMethod,
        paymentMethod,
        items: clone(cart),
      };
      state.orders.unshift(order);
      state.cart = [];
      const storedCustomer = state.customers.find((item) => item.id === customer.id);
      if (storedCustomer) storedCustomer.address = clone(address);
      return clone(order);
    });
  }

  reset() { return this.dao.reset(); }
}
