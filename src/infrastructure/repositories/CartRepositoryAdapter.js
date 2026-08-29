import { toCartItemDto } from "../../domain/dto";

export class CartRepositoryAdapter {
  constructor(api) { this.api = api; }
  list() { return this.api.listCart().map(toCartItemDto); }

  add(medication, variant) {
    return this.api.addCartItem(medication.id, variant.id);
  }

  remove(variantId) {
    this.api.removeCartItem(variantId);
  }

  setUnits(variantId, units) {
    this.api.setCartItemUnits(variantId, units);
  }

  clear() { this.api.clearCart(); }
}
