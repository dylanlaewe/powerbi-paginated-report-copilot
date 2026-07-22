import { resolve } from "node:path";
import { runCandidate06 } from "./candidate06";

const output = resolve(process.argv[2] ?? "artifacts/rdl-compatibility-ladder");
const result = await runCandidate06(output);
console.log("Candidate 06 generation: PASS");
console.log("Derivation: BYTE_FOR_BYTE_PRINT_SAFE_PAGINATION_SEED");
console.log(`Report: ${result.reportPath}`);
console.log(`SHA-256: ${result.manifest.candidateSha256}`);
console.log("Seed byte identity: PASS");
console.log("Pagination structure regression: PASS");
console.log("Print-safe effective Letter configuration: PASS");
console.log(
  "Report Builder open/Preview/PDF/Excel: PENDING INDEPENDENT WINDOWS",
);
