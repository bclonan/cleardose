import { toOrderDto } from "../../domain/dto";
import { clone } from "../../domain/shared/clone";

export class OrderRepositoryAdapter {
  constructor(dao) { this.dao = dao; }
  list() { return this.dao.read().orders.map(toOrderDto); }
  findById(id) { return this.list().find((item) => item.id === id) ?? null; }
  forCustomer(customerId) { return this.list().filter((item) => item.customerId === customerId); }

  place({ customer, cart, address, prescriptionMethod, paymentMethod, subtotal, shipping, total }) {
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
      return toOrderDto(order);
    });
  }
}
