import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generateReport } from "./generator";
import { parseNaturalLanguageReportRequest } from "./index";

const valueAfter = (flag: string): string => {
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Missing required ${flag}`);
  return value;
};

const requestPath = resolve(valueAfter("--request"));
const outputPath = resolve(valueAfter("--output"));
const request = await readFile(requestPath, "utf8");
const specification = parseNaturalLanguageReportRequest(request);
const result = await generateReport(specification, outputPath);

console.log(`Generated RDL: ${result.reportPath}`);
console.log(`SHA-256: ${result.manifest.reportSha256}`);
console.log(`Template: ${result.manifest.template}`);
console.log(`ReportSpecification: ${JSON.stringify(specification)}`);
console.log(
  `Expected Region subtotals: ${JSON.stringify(result.manifest.expectedRegionSubtotals)}`,
);
console.log(
  `Expected Grand Total: ${JSON.stringify(result.manifest.expectedGrandTotal)}`,
);
console.log("Validation: PASS");
console.log(`Manifest: ${result.manifestPath}`);
