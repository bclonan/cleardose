import { toPrescriptionDto } from "../../domain/dto";

export class PrescriptionRepositoryAdapter {
  constructor(api) { this.api = api; }
  list() { return this.api.listPrescriptions().map(toPrescriptionDto); }
  forCustomer(customerId) { return this.list().filter((item) => item.customerId === customerId); }
}
