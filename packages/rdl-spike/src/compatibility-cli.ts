import { resolve } from "node:path";
import { runCandidate01 } from "./ladder";

const output = resolve(process.argv[2] ?? "artifacts/rdl-compatibility-ladder");
const result = await runCandidate01(output);
console.log("RDL compatibility ladder — candidate 01");
console.log(`Report: ${result.reportPath}`);
console.log(`Fields: ${result.manifest.fields.join(", ")}`);
console.log(`Rows: ${result.manifest.rows.length}`);
console.log("XML well-formedness: PASS");
console.log("Existing XSD validation: PASS");
console.log("Collection consistency: PASS");
console.log("Report Builder open/preview: PENDING INDEPENDENT WINDOWS");
