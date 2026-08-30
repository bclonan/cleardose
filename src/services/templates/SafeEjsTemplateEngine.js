const blockedSegments = new Set(["__proto__", "prototype", "constructor"]);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function resolvePath(path, data) {
  const segments = String(path).trim().split(".");
  if (!segments.length || segments.some((segment) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(segment) || blockedSegments.has(segment))) {
    throw new TypeError(`Unsupported template path: ${path}.`);
  }
  return segments.reduce((value, segment) => value?.[segment], data);
}

export class SafeEjsTemplateEngine {
  validate(template) {
    const source = String(template ?? "");
    if (!source.trim()) throw new TypeError("A non-empty template is required.");
    if (source.length > 12000) throw new TypeError("Templates must be 12,000 characters or fewer.");
    if (/<%-/.test(source)) throw new TypeError("Raw EJS output tags are disabled. Use <%= path %>.");
    const controlTags = [...source.matchAll(/<%\s*(if\s+([A-Za-z][A-Za-z0-9_.]*)|endif)\s*%>/g)];
    let conditionalDepth = 0;
    for (const match of controlTags) {
      if (match[1].startsWith("if ")) {
        conditionalDepth += 1;
        if (conditionalDepth > 1) throw new TypeError("Nested template conditionals are disabled.");
        resolvePath(match[2], {});
      } else {
        conditionalDepth -= 1;
        if (conditionalDepth < 0) throw new TypeError("Template conditionals must have a matching if tag.");
      }
    }
    if (conditionalDepth !== 0) throw new TypeError("Template conditionals must end with <% endif %>.");
    for (const match of source.matchAll(/<%=\s*([A-Za-z][A-Za-z0-9_.]*)\s*%>/g)) resolvePath(match[1], {});
    const stripped = source
      .replace(/<%#([\s\S]*?)%>/g, "")
      .replace(/<%\s*if\s+([A-Za-z][A-Za-z0-9_.]*)\s*%>/g, "")
      .replace(/<%\s*endif\s*%>/g, "")
      .replace(/<%=\s*([A-Za-z][A-Za-z0-9_.]*)\s*%>/g, "");
    if (/<%[\s\S]*?%>/.test(stripped)) throw new TypeError("Only escaped path interpolation, comments, and bounded if/endif blocks are supported.");
    return true;
  }

  render(template, data = {}) {
    this.validate(template);
    return String(template)
      .replace(/<%#([\s\S]*?)%>/g, "")
      .replace(/<%\s*if\s+([A-Za-z][A-Za-z0-9_.]*)\s*%>([\s\S]*?)<%\s*endif\s*%>/g, (_, path, body) => resolvePath(path, data) ? body : "")
      .replace(/<%=\s*([A-Za-z][A-Za-z0-9_.]*)\s*%>/g, (_, path) => escapeHtml(resolvePath(path, data)));
  }
}
