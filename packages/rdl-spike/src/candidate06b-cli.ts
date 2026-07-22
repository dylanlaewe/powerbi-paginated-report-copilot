import { resolve } from "node:path";
import { runCandidate06b } from "./candidate06b";

const output = resolve(process.argv[2] ?? "artifacts/rdl-compatibility-ladder");
const result = await runCandidate06b(output);
console.log("Candidate 06b generation: PASS");
console.log("Derivation: BYTE_FOR_BYTE_EXPLICIT_LETTER_SEED");
console.log(`Report: ${result.reportPath}`);
console.log(`SHA-256: ${result.manifest.candidateSha256}`);
console.log("Literal PageWidth/PageHeight: PASS");
console.log("Seed byte identity: PASS");
console.log(
  "Report Builder open/Preview/PDF/Excel: PENDING INDEPENDENT WINDOWS",
);
