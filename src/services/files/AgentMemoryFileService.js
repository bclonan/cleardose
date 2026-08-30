export class AgentMemoryFileService {
  constructor({ windowRef = globalThis.window, documentRef = globalThis.document } = {}) {
    this.windowRef = windowRef;
    this.documentRef = documentRef;
  }

  async copy(markdown) {
    await this.windowRef?.navigator?.clipboard?.writeText(String(markdown || ""));
    return { method: "clipboard" };
  }

  async save(packet) {
    const filename = `${String(packet?.label || "cleardose-memory").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cleardose-memory"}.md`;
    if (typeof this.windowRef?.showSaveFilePicker === "function" && this.windowRef?.isSecureContext) {
      const handle = await this.windowRef.showSaveFilePicker({ suggestedName: filename, types: [{ description: "Markdown", accept: { "text/markdown": [".md"] } }] });
      const writable = await handle.createWritable();
      await writable.write(String(packet?.markdown || ""));
      await writable.close();
      return { method: "file-system-access", filename: handle.name || filename };
    }
    const url = URL.createObjectURL(new Blob([String(packet?.markdown || "")], { type: "text/markdown" }));
    const link = this.documentRef.createElement("a");
    link.href = url; link.download = filename; link.click();
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
    return { method: "download", filename };
  }
}

