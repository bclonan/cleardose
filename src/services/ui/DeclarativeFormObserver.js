function nextMicrotask(callback) {
  if (typeof globalThis.queueMicrotask === "function") globalThis.queueMicrotask(callback);
  else void Promise.resolve().then(callback);
}

export class DeclarativeFormObserver {
  constructor({
    documentRef = globalThis.document,
    FormDataCtor = globalThis.FormData,
    recordForm,
    queueTask = nextMicrotask,
  } = {}) {
    this.documentRef = documentRef;
    this.FormDataCtor = FormDataCtor;
    this.recordForm = recordForm;
    this.queueTask = queueTask;
    this.started = false;
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  start() {
    if (!this.started && typeof this.documentRef?.addEventListener === "function") {
      this.documentRef.addEventListener("submit", this.handleSubmit, true);
      this.started = true;
    }
    return () => this.dispose();
  }

  dispose() {
    if (!this.started) return;
    this.documentRef?.removeEventListener?.("submit", this.handleSubmit, true);
    this.started = false;
  }

  handleSubmit(event) {
    const form = event?.target;
    const toolName = form?.getAttribute?.("toolname");
    if (!toolName || !form.dataset || form.dataset.cleardoseObserved === "true") return;
    form.dataset.cleardoseObserved = "true";
    this.queueTask(() => { delete form.dataset.cleardoseObserved; });
    const fieldNames = this.FormDataCtor ? [...new this.FormDataCtor(form).keys()] : [];
    try {
      const result = this.recordForm?.({ name: toolName, fieldNames });
      if (typeof result?.catch === "function") void result.catch(() => {});
    } catch { /* Observation must not interrupt the visible form submission. */ }
  }
}

export function observeDeclarativeForms(app, options = {}) {
  const observer = new DeclarativeFormObserver(options);
  const dispose = observer.start();
  app.onUnmount(dispose);
  return observer;
}
