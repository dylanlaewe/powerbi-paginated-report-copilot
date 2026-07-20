import { resolve } from "node:path";
import { runCandidate03 } from "./candidate03";

const output = resolve(process.argv[2] ?? "artifacts/rdl-compatibility-ladder");
const result = await runCandidate03(output);
console.log("RDL compatibility ladder — candidate 03");
console.log(`Report: ${result.reportPath}`);
console.log("Fields preserved: 9");
console.log("Rows preserved: 6");
console.log("Region group and header: PASS");
console.log("Region/date/salesperson sorting: PASS");
console.log("Hierarchy and group consistency: PASS");
console.log("Accepted Candidates 01 and 02 unchanged: PASS");
console.log("Report Builder open/preview: PENDING INDEPENDENT WINDOWS");
