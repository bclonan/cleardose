import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createDefaultTools } from "../src/infrastructure/webmcp/tools/createDefaultTools.js";
import { SectionHighlightService } from "../src/services/ui/SectionHighlightService.js";

const destination = fileURLToPath(new URL("../evals/schema.json", import.meta.url));
const tools = createDefaultTools({
  store: {},
  highlightService: {
    listTargets: () => new SectionHighlightService({ documentRef: null }).listTargets(),
  },
}).map(({ name, title, description, inputSchema, outputSchema, annotations }) => ({
  name: `cleardose_${name}`,
  title,
  description,
  inputSchema,
  outputSchema,
  annotations,
}));

await writeFile(destination, `${JSON.stringify({ tools }, null, 2)}\n`, "utf8");
console.log(`Exported ${tools.length} WebMCP tool contracts to evals/schema.json.`);
