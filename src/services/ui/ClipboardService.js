export class ClipboardService {
  constructor({ navigatorRef = globalThis.navigator, documentRef = globalThis.document, timeoutMs = 800 } = {}) {
    this.navigatorRef = navigatorRef; this.documentRef = documentRef; this.timeoutMs = timeoutMs;
  }

  async copy(text) {
    const value = String(text ?? "");
    if (!value) throw new TypeError("There is no text to copy.");
    try {
      if (typeof this.navigatorRef?.clipboard?.writeText === "function") {
        await Promise.race([
          this.navigatorRef.clipboard.writeText(value),
          new Promise((_, reject) => globalThis.setTimeout(() => reject(new Error("Clipboard permission timed out.")), this.timeoutMs)),
        ]);
        return { ok: true, method: "clipboard" };
      }
    } catch { /* Continue to the visible-selection-compatible fallback. */ }
    if (!this.documentRef?.body || typeof this.documentRef.execCommand !== "function") throw new Error("Clipboard access is unavailable. Select the visible prompt and copy it manually.");
    const input = this.documentRef.createElement("textarea");
    input.value = value; input.setAttribute("readonly", ""); input.style.position = "fixed"; input.style.opacity = "0";
    this.documentRef.body.appendChild(input); input.select();
    const copied = this.documentRef.execCommand("copy"); input.remove();
    if (!copied) throw new Error("Copy was blocked. Select the visible prompt and copy it manually.");
    return { ok: true, method: "selection-fallback" };
  }
}
