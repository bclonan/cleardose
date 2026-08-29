import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { createClearDosePlugin } from "./app/createClearDosePlugin";
import "./styles/main.css";

const pinia = createPinia();
const clearDose = createClearDosePlugin({
  pinia,
  webMcp: { enabled: true, namespace: "cleardose" },
});

createApp(App)
  .use(pinia)
  .use(clearDose)
  .use(router)
  .mount("#app");
