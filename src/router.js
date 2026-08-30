import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "./views/HomeView.vue";
import MedicationsView from "./views/MedicationsView.vue";
import MedicationDetailView from "./views/MedicationDetailView.vue";
import CartView from "./views/CartView.vue";
import AuthView from "./views/AuthView.vue";
import AccountView from "./views/AccountView.vue";
import PrescriptionsView from "./views/PrescriptionsView.vue";
import OrdersView from "./views/OrdersView.vue";
import OrderDetailView from "./views/OrderDetailView.vue";
import CheckoutView from "./views/CheckoutView.vue";
import OrderConfirmationView from "./views/OrderConfirmationView.vue";
import ContactDoctorView from "./views/ContactDoctorView.vue";
import CompareView from "./views/CompareView.vue";
import DemoView from "./views/DemoView.vue";
import DrugIndexView from "./views/DrugIndexView.vue";
import FlowLabView from "./views/FlowLabView.vue";
import HackathonShortcutsView from "./views/HackathonShortcutsView.vue";

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: "/", name: "home", component: HomeView, meta: { title: "ClearDose — Transparent prescriptions, agent-ready." } },
    { path: "/medications", name: "medications", component: MedicationsView, meta: { title: "Medication catalog — ClearDose" } },
    { path: "/medications/:slug", name: "medication", component: MedicationDetailView, meta: { title: "Medication details — ClearDose" } },
    { path: "/cart", name: "cart", component: CartView, meta: { title: "Mock cart — ClearDose" } },
    { path: "/login", name: "login", component: AuthView, props: { mode: "login" }, meta: { title: "Sign in — ClearDose" } },
    { path: "/create-account", name: "create-account", component: AuthView, props: { mode: "create" }, meta: { title: "Create a mock account — ClearDose" } },
    { path: "/account", name: "account", component: AccountView, meta: { title: "Patient account — ClearDose" } },
    { path: "/account/prescriptions", name: "prescriptions", component: PrescriptionsView, meta: { title: "Prescriptions — ClearDose" } },
    { path: "/account/orders", name: "orders", component: OrdersView, meta: { title: "Orders — ClearDose" } },
    { path: "/account/orders/:id", name: "order-detail", component: OrderDetailView, meta: { title: "Order details — ClearDose" } },
    { path: "/checkout", name: "checkout", component: CheckoutView, meta: { title: "Mock checkout — ClearDose" } },
    { path: "/checkout/confirmation/:id", name: "confirmation", component: OrderConfirmationView, meta: { title: "Order confirmation — ClearDose" } },
    { path: "/contact-doctor", name: "contact-doctor", component: ContactDoctorView, meta: { title: "Provider handoff — ClearDose" } },
    { path: "/compare", name: "compare", component: CompareView, meta: { title: "Compare mock medication prices — ClearDose" } },
    { path: "/demo", name: "demo", component: DemoView, meta: { title: "WebMCP hackathon demo — ClearDose" } },
    { path: "/udi", name: "udi", component: DrugIndexView, meta: { title: "Universal Drug Index — ClearDose" } },
    { path: "/flow-lab", name: "flow-lab", component: FlowLabView, meta: { title: "Live workflow observatory — ClearDose" } },
    { path: "/shortcuts", name: "shortcuts", component: HackathonShortcutsView, meta: { title: "Hackathon prompt shortcuts — ClearDose" } },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

router.afterEach((to) => {
  globalThis.document.title = to.meta.title ?? "ClearDose";
});

export default router;
