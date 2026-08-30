import { toCustomerDto } from "../../domain/dto";

export class CustomerRepositoryAdapter {
  constructor(api) { this.api = api; }

  current() {
    return toCustomerDto(this.api.getCurrentCustomer());
  }

  authenticate(email, password) {
    const result = this.api.authenticateCustomer(email, password);
    return result.ok ? { ...result, customer: toCustomerDto(result.customer) } : result;
  }

  create(input) {
    const result = this.api.createCustomer(input);
    return result.ok ? { ...result, customer: toCustomerDto(result.customer) } : result;
  }

  updateCurrent(changes) {
    return this.api.updateCurrentCustomer(changes);
  }

  logout() { this.api.logoutCustomer(); }
}
