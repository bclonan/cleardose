import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createDefaultTools } from "../src/infrastructure/webmcp/tools/createDefaultTools.js";

const destination = fileURLToPath(new URL("../evals/schema.json", import.meta.url));
const tools = createDefaultTools({
  store: {},
  highlightService: {
    listTargets: () => [
      "medication-search", "comparison-results", "demo-side-by-side", "how-webmcp-works",
      "tool-catalog", "cart-summary", "checkout-flow", "provider-handoff", "primary-price",
      "add-to-cart-action", "agent-tools-control", "udi-search", "udi-results", "udi-lab",
    ],
  },
}).map(({ name, title, description, inputSchema, annotations }) => ({
  name: `cleardose_${name}`,
  title,
  description,
  inputSchema,
  annotations,
}));

await writeFile(destination, `${JSON.stringify({ tools }, null, 2)}\n`, "utf8");
console.log(`Exported ${tools.length} WebMCP tool contracts to evals/schema.json.`);
