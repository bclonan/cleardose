import { categories, medications, seededCustomer, seededOrders, seededPrescriptions } from "../../data/mockDb";
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

  return Object.freeze({
    dao,
    catalog: new CatalogRepositoryAdapter({ medications, categories }),
    customers: new CustomerRepositoryAdapter(dao),
    cart: new CartRepositoryAdapter(dao),
    orders: new OrderRepositoryAdapter(dao),
    prescriptions: new PrescriptionRepositoryAdapter(dao),
  });
}
