import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../evals/cleardose.evals.json", import.meta.url));
const destination = fileURLToPath(new URL("../evals/cleardose.smoke.json", import.meta.url));
const evals = JSON.parse(await readFile(source, "utf8"));
const smokeCases = evals.filter((evalCase) => Array.isArray(evalCase.expectedCall) && evalCase.expectedCall.length > 0);

await writeFile(destination, `${JSON.stringify(smokeCases, null, 2)}\n`, "utf8");
console.log(`Exported ${smokeCases.length} positive-call smoke journeys to evals/cleardose.smoke.json.`);

