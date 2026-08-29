export const medicationCardAdapter = Object.freeze({
  selectDisplayVariant(medication) { return medication.variants[0]; },
  routeFor(medication) { return `/medications/${medication.slug}`; },
});

export const statusBadgeAdapter = Object.freeze({
  label(status) {
    return ({
      ready: "Ready to order",
      processing: "Pharmacy review",
      "needs-renewal": "Renewal needed",
      delivered: "Delivered",
      shipped: "Shipped",
      "waiting-for-prescription": "Waiting for prescription",
    })[status] ?? status;
  },
});

export const accountNavAdapter = Object.freeze({
  items() {
    return [
      { to: "/account", icon: "user", label: "Overview" },
      { to: "/account/prescriptions", icon: "prescriptions", label: "Prescriptions" },
      { to: "/account/orders", icon: "orders", label: "Orders" },
      { href: "#profile", icon: "settings", label: "Profile & delivery" },
    ];
  },
});

export const agentReadyHostAdapter = Object.freeze({
  resolve(component) { return component; },
});

export const webMcpStatusAdapter = Object.freeze({
  label(runtime) {
    if (runtime.status === "ready") return `${runtime.registered} agent tools ready`;
    if (runtime.status === "unsupported") return `${runtime.available} agent tools available`;
    if (runtime.status === "error") return "Agent tools need attention";
    return "Preparing agent tools";
  },
});
