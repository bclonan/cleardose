export class BrowserWebMcpAdapter {
  constructor({ documentRef = globalThis.document, exposedTo } = {}) {
    this.documentRef = documentRef;
    this.exposedTo = exposedTo;
  }

  isSupported() {
    return typeof this.documentRef?.modelContext?.registerTool === "function";
  }

  async register(tool) {
    if (!this.isSupported()) {
      return { name: tool.name, status: "unsupported", unregister() {} };
    }

    const controller = new AbortController();
    const options = { signal: controller.signal };
    if (this.exposedTo?.length) options.exposedTo = this.exposedTo;

    try {
      await this.documentRef.modelContext.registerTool(tool, options);
      return { name: tool.name, status: "registered", unregister: () => controller.abort() };
    } catch (error) {
      controller.abort();
      return {
        name: tool.name,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        unregister() {},
      };
    }
  }
}
