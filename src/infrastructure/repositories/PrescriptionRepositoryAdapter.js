import { toPrescriptionDto } from "../../domain/dto";

export class PrescriptionRepositoryAdapter {
  constructor(dao) { this.dao = dao; }
  list() { return this.dao.read().prescriptions.map(toPrescriptionDto); }
  forCustomer(customerId) { return this.list().filter((item) => item.customerId === customerId); }
}
