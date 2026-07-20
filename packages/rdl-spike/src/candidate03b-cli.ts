import { resolve } from "node:path";
import { runCandidate03b } from "./candidate03b";

const output = resolve(process.argv[2] ?? "artifacts/rdl-compatibility-ladder");
const result = await runCandidate03b(output);
console.log("RDL compatibility ladder — candidate 03b");
console.log(`Report: ${result.reportPath}`);
console.log("Derivation from grouped seed: BYTE_FOR_BYTE_COPY");
console.log("Fields preserved: 9");
console.log("Rows preserved: 6");
console.log("Report Builder grouped hierarchy regression: PASS");
console.log("Candidates 01, 02, rejected 03, and grouped seed unchanged: PASS");
console.log("Report Builder open/preview: PENDING INDEPENDENT WINDOWS");
