export function toolResponse(data, summary = "ClearDose tool completed.") {
  return {
    content: [{ type: "text", text: summary }],
    structuredContent: data,
  };
}

export function toolError(message, details = {}) {
  return {
    content: [{ type: "text", text: message }],
    structuredContent: { ok: false, message, ...details },
    isError: true,
  };
}
