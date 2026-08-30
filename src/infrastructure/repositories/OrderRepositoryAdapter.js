import { toOrderDto } from "../../domain/dto";

export class OrderRepositoryAdapter {
  constructor(api) { this.api = api; }
  list() { return this.api.listOrders().map(toOrderDto); }
  findById(id) { return this.list().find((item) => item.id === id) ?? null; }
  forCustomer(customerId) { return this.list().filter((item) => item.customerId === customerId); }

  place({ customer, cart, address, prescriptionMethod, paymentMethod, subtotal, shipping, total }) {
    return toOrderDto(this.api.placeOrder({ customer, cart, address, prescriptionMethod, paymentMethod, subtotal, shipping, total }));
  }
}
