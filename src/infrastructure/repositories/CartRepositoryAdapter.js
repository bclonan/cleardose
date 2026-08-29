import { toCartItemDto } from "../../domain/dto";

export class CartRepositoryAdapter {
  constructor(dao) { this.dao = dao; }
  list() { return this.dao.read().cart.map(toCartItemDto); }

  add(medication, variant) {
    return this.dao.mutate((state) => {
      const existing = state.cart.find((item) => item.variantId === variant.id);
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

  remove(variantId) {
    this.dao.mutate((state) => { state.cart = state.cart.filter((item) => item.variantId !== variantId); });
  }

  setUnits(variantId, units) {
    const next = Math.max(0, Math.min(3, Number(units) || 0));
    this.dao.mutate((state) => {
      if (!next) state.cart = state.cart.filter((item) => item.variantId !== variantId);
      else {
        const item = state.cart.find((entry) => entry.variantId === variantId);
        if (item) item.units = next;
      }
    });
  }

  clear() { this.dao.mutate((state) => { state.cart = []; }); }
}
