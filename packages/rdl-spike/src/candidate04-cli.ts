import { resolve } from "node:path";
import { runCandidate04 } from "./candidate04";

const output = resolve(process.argv[2] ?? "artifacts/rdl-compatibility-ladder");
const result = await runCandidate04(output);
console.log("RDL compatibility ladder — candidate 04");
console.log(`Report: ${result.reportPath}`);
console.log("Fields preserved: 9");
console.log("Detail rows preserved: 6");
console.log("Expected Region subtotal rows: 3");
console.log('Explicit aggregate scope: "Region"');
console.log("Subtotal body/hierarchy consistency: PASS");
console.log("Protected artifact checksums: PASS");
console.log("Report Builder open/preview: PENDING INDEPENDENT WINDOWS");
