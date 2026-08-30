export function createStructuredExchangeToolPair({
  id,
  prepareTitle,
  prepareDescription,
  prepareSchema,
  responseTitle,
  responseDescription,
  responseSchema,
  prepare,
  submit,
  prepareAnnotations,
  submitAnnotations,
}) {
  if (!id || typeof prepare !== "function" || typeof submit !== "function") {
    throw new TypeError("A structured exchange needs an id, prepare handler, and submit handler.");
  }
  return [
    {
      name: `prepare_${id}_request`,
      title: prepareTitle,
      description: prepareDescription,
      inputSchema: prepareSchema,
      annotations: prepareAnnotations,
      execute: prepare,
    },
    {
      name: `submit_${id}_draft`,
      title: responseTitle,
      description: responseDescription,
      inputSchema: responseSchema,
      annotations: submitAnnotations,
      execute: submit,
    },
  ];
}

