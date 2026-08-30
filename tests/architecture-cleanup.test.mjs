import assert from "node:assert/strict";
import test from "node:test";

import { normalizeDemoRoute } from "../src/domain/shared/demoRoute.js";
import { VoicePreferenceService } from "../src/services/accessibility/VoicePreferenceService.js";
import { observeDeclarativeForms } from "../src/services/ui/DeclarativeFormObserver.js";

test("demo routes share medication, order, confirmation, query, and hash normalization", () => {
  const cases = [
    ["/medications/lisinopril", "/medications"],
    ["/medications/lisinopril?source=demo", "/medications"],
    ["/medications?q=lisinopril", "/medications"],
    ["#/account/orders/order_demo?tab=summary", "/account/orders"],
    ["http://localhost:4173/#/checkout/confirmation/order_demo?receipt=1", "/checkout/confirmation"],
    ["/demo#explorer", "/demo"],
    ["http://localhost:4173/#/compare?demo=1", "/compare"],
  ];
  for (const [input, expected] of cases) assert.equal(normalizeDemoRoute(input), expected, input);
});

test("voice preference falls back to session memory when storage is denied", () => {
  const deniedStorage = {
    getItem() { throw new Error("denied"); },
    setItem() { throw new Error("denied"); },
  };
  const preference = new VoicePreferenceService({ storage: deniedStorage });
  assert.equal(preference.load(), false);
  assert.equal(preference.save(true), true);
  assert.equal(preference.load(), true);
  assert.equal(preference.save(false), false);
});

test("declarative form observation is removed on app teardown and reinstalls once", async () => {
  const listeners = new Set();
  const documentRef = {
    addEventListener(type, listener) { if (type === "submit") listeners.add(listener); },
    removeEventListener(type, listener) { if (type === "submit") listeners.delete(listener); },
    submit(target) { for (const listener of [...listeners]) listener({ target }); },
  };
  const records = [];
  const FormDataCtor = class {
    constructor(form) { this.form = form; }
    keys() { return this.form.fieldNames.values(); }
  };
  const mount = () => {
    const disposers = [];
    const app = { onUnmount(dispose) { disposers.push(dispose); } };
    observeDeclarativeForms(app, {
      documentRef,
      FormDataCtor,
      recordForm: (record) => records.push(record),
    });
    return () => disposers.forEach((dispose) => dispose());
  };
  const form = {
    dataset: {},
    fieldNames: ["query", "locationId"],
    getAttribute(name) { return name === "toolname" ? "cleardose_search_drug_index" : null; },
  };

  const unmountFirst = mount();
  assert.equal(listeners.size, 1);
  documentRef.submit(form);
  assert.equal(records.length, 1);
  unmountFirst();
  assert.equal(listeners.size, 0);
  await Promise.resolve();

  const unmountSecond = mount();
  assert.equal(listeners.size, 1);
  documentRef.submit(form);
  assert.equal(records.length, 2);
  unmountSecond();
  assert.equal(listeners.size, 0);
});
