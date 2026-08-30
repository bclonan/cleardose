export class ClearDoseDomainError extends Error {
  constructor(code, message, {
    retryable = false,
    recommendedTool = "",
    recoveryInput = {},
    details = {},
  } = {}) {
    super(message);
    this.name = "ClearDoseDomainError";
    this.code = String(code || "DOMAIN_ERROR");
    this.retryable = Boolean(retryable);
    this.recommendedTool = String(recommendedTool || "");
    this.recoveryInput = structuredClone(recoveryInput ?? {});
    this.details = structuredClone(details ?? {});
  }

  toStructuredContent() {
    return {
      ok: false,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      recommendedTool: this.recommendedTool || null,
      recoveryInput: structuredClone(this.recoveryInput),
      details: structuredClone(this.details),
    };
  }
}

export function domainError(code, message, options) {
  return new ClearDoseDomainError(code, message, options);
}
