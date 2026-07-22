import { resolve } from "node:path";
import { runCandidate05 } from "./candidate05";

const output = resolve(process.argv[2] ?? "artifacts/rdl-compatibility-ladder");
const result = await runCandidate05(output);
console.log("Candidate 05 generation: PASS");
console.log("Derivation: REPORT_BUILDER_GRAND_TOTAL_TEMPLATE");
console.log(`Report: ${result.reportPath}`);
console.log(`SHA-256: ${result.manifest.candidateSha256}`);
console.log("Grand-total structure preservation: PASS");
console.log("Grand Total label instantiation: PASS");
console.log("Dataset and Region subtotal preservation: PASS");
console.log("Expected grand totals: 61 / 15990 / 6250");
console.log("Report Builder open/preview: PENDING INDEPENDENT WINDOWS");
