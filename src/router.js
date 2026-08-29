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

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/medications", name: "medications", component: MedicationsView },
    { path: "/medications/:slug", name: "medication", component: MedicationDetailView },
    { path: "/cart", name: "cart", component: CartView },
    { path: "/login", name: "login", component: AuthView, props: { mode: "login" } },
    { path: "/create-account", name: "create-account", component: AuthView, props: { mode: "create" } },
    { path: "/account", name: "account", component: AccountView },
    { path: "/account/prescriptions", name: "prescriptions", component: PrescriptionsView },
    { path: "/account/orders", name: "orders", component: OrdersView },
    { path: "/account/orders/:id", name: "order-detail", component: OrderDetailView },
    { path: "/checkout", name: "checkout", component: CheckoutView },
    { path: "/checkout/confirmation/:id", name: "confirmation", component: OrderConfirmationView },
    { path: "/contact-doctor", name: "contact-doctor", component: ContactDoctorView },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

export default router;
