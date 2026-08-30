export class LocalDrugIndexApi {
  constructor({ dao }) { this.dao = dao; }
  async search(input = {}) { return this.dao.queryDrugs(input); }
  async get(id) { return this.dao.getDrug(id); }
}

