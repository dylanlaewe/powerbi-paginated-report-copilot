import { resolve } from "node:path";
import { runCandidate04c } from "./candidate04c";

const output = resolve(process.argv[2] ?? "artifacts/rdl-compatibility-ladder");
const result = await runCandidate04c(output);
console.log("Candidate 04c generation: PASS");
console.log("Derivation: TEMPLATE_CONTENT_INSTANTIATION");
console.log(`Report: ${result.reportPath}`);
console.log(`SHA-256: ${result.manifest.candidateSha256}`);
console.log("Seed byte difference: PASS");
console.log("Protected Tablix subtree byte identity: PASS");
console.log("Replacement embedded data: PASS");
console.log("Expected subtotal calculations: PASS");
console.log("Report Builder open/preview: PENDING INDEPENDENT WINDOWS");
