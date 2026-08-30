import { seededCustomer, seededOrders, seededPrescriptions } from "../../services/api/mock/seedData";
import { createMockPharmacyApi } from "../../services/api/createMockPharmacyApi";
import { BrowserStateDao, MemoryStorageAdapter } from "../persistence/BrowserStateDao";
import { CartRepositoryAdapter } from "../repositories/CartRepositoryAdapter";
import { CatalogRepositoryAdapter } from "../repositories/CatalogRepositoryAdapter";
import { CustomerRepositoryAdapter } from "../repositories/CustomerRepositoryAdapter";
import { OrderRepositoryAdapter } from "../repositories/OrderRepositoryAdapter";
import { PrescriptionRepositoryAdapter } from "../repositories/PrescriptionRepositoryAdapter";

export function createClearDoseBrowserAdapter({ storage, storageKey = "cleardose-demo-v2" } = {}) {
  const resolvedStorage = storage ?? globalThis.localStorage ?? new MemoryStorageAdapter();
  const dao = new BrowserStateDao({
    storage: resolvedStorage,
    storageKey,
    seed: () => ({
      currentCustomerId: null,
      customers: [structuredClone(seededCustomer)],
      cart: [],
      orders: structuredClone(seededOrders),
      prescriptions: structuredClone(seededPrescriptions),
    }),
  });
  const api = createMockPharmacyApi({ dao });

  return Object.freeze({
    api,
    dao,
    catalog: new CatalogRepositoryAdapter(api),
    customers: new CustomerRepositoryAdapter(api),
    cart: new CartRepositoryAdapter(api),
    orders: new OrderRepositoryAdapter(api),
    prescriptions: new PrescriptionRepositoryAdapter(api),
  });
}
