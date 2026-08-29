import { toCustomerDto } from "../../domain/dto";

export class CustomerRepositoryAdapter {
  constructor(dao) { this.dao = dao; }

  current() {
    const state = this.dao.read();
    return toCustomerDto(state.customers.find((item) => item.id === state.currentCustomerId));
  }

  authenticate(email, password) {
    return this.dao.mutate((state) => {
      const customer = state.customers.find(
        (item) => item.email.toLowerCase() === String(email).trim().toLowerCase() && item.password === password,
      );
      if (!customer) return { ok: false, message: "We couldn't match that demo email and password." };
      state.currentCustomerId = customer.id;
      return { ok: true, customer: toCustomerDto(customer) };
    });
  }

  create(input) {
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
      return { ok: true, customer: toCustomerDto(customer) };
    });
  }

  updateCurrent(changes) {
    return this.dao.mutate((state) => {
      const customer = state.customers.find((item) => item.id === state.currentCustomerId);
      if (!customer) return false;
      Object.assign(customer, changes);
      return true;
    });
  }

  logout() { this.dao.mutate((state) => { state.currentCustomerId = null; }); }
}
