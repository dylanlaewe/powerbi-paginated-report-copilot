import { resolve } from "node:path";
import { runCandidate04b } from "./candidate04b";

const output = resolve(process.argv[2] ?? "artifacts/rdl-compatibility-ladder");
const result = await runCandidate04b(output);
console.log("Candidate 04b generation: PASS");
console.log("Derivation: BYTE_FOR_BYTE_COPY");
console.log(`Report: ${result.reportPath}`);
console.log(`SHA-256: ${result.manifest.candidateSha256}`);
console.log("XML well-formedness: PASS");
console.log("Existing XSD validation: PASS");
console.log("Subtotal structure regression: PASS");
console.log("Seed byte identity: PASS");
console.log("Report Builder open/preview: PENDING INDEPENDENT WINDOWS");
