// Fictional state fixtures only. Drug catalog fixtures live in services/api/udi.
export const seededCustomer = {
  id: "cust_demo",
  firstName: "Jamie",
  lastName: "Rivera",
  email: "demo@patient.test",
  password: "demo1234",
  phone: "410-555-0148",
  dateOfBirth: "1987-06-14",
  address: {
    line1: "1400 Demo Avenue",
    line2: "Apt 3B",
    city: "Baltimore",
    state: "MD",
    zip: "21201",
  },
};

export const seededPrescriptions = [
  { id: "rx_1001", customerId: "cust_demo", medicationId: "med_atorvastatin", strength: "20mg", quantity: 30, refills: 2, status: "ready", updatedAt: "2026-08-28" },
  { id: "rx_1002", customerId: "cust_demo", medicationId: "med_metformin", strength: "500mg", quantity: 60, refills: 4, status: "processing", updatedAt: "2026-08-29" },
  { id: "rx_1003", customerId: "cust_demo", medicationId: "med_levothyroxine", strength: "75mcg", quantity: 30, refills: 0, status: "needs-renewal", updatedAt: "2026-08-21" },
];

export const seededOrders = [
  {
    id: "CLR-10482",
    customerId: "cust_demo",
    placedAt: "2026-08-12",
    status: "delivered",
    deliveredAt: "2026-08-17",
    tracking: "DEMO-9400111899",
    subtotal: 12.3,
    shipping: 5,
    tax: 0,
    total: 17.3,
    address: { ...seededCustomer.address },
    items: [
      { medicationId: "med_atorvastatin", variantId: "atorvastatin-20mg-60", name: "Atorvastatin Calcium", form: "Tablet", strength: "20mg", quantity: 60, price: 6.4, units: 1 },
      { medicationId: "med_lisinopril", variantId: "lisinopril-10mg-60", name: "Lisinopril", form: "Tablet", strength: "10mg", quantity: 60, price: 5.9, units: 1 },
    ],
  },
];
