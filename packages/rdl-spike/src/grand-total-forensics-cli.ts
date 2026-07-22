import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { compareGrandTotalStructures } from "./grand-total-forensics";

const paths = {
  candidate04c: resolve(
    "artifacts/rdl-compatibility-ladder/04c-template-instantiated-subtotal.rdl",
  ),
  grandTotalSeed: resolve(
    "samples/report-builder-seeds/KnownGoodGrandTotal.rdl",
  ),
};
const [candidate04c, seed] = await Promise.all(
  Object.values(paths).map((path) => readFile(path, "utf8")),
);
const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
const outputPath = resolve(
  process.argv[2] ?? "artifacts/rdl-compatibility-ladder/05-FORENSICS.json",
);
const evidence = {
  command:
    "pnpm spike:rdl-grand-total-forensics artifacts/rdl-compatibility-ladder/05-FORENSICS.json",
  files: {
    candidate04c: { path: paths.candidate04c, sha256: sha256(candidate04c!) },
    grandTotalSeed: { path: paths.grandTotalSeed, sha256: sha256(seed!) },
  },
  comparison: compareGrandTotalStructures(candidate04c!, seed!),
};
await mkdir(dirname(outputPath), { recursive: true });
const temporary = `${outputPath}.${process.pid}.tmp`;
await writeFile(temporary, `${JSON.stringify(evidence, null, 2)}\n`, {
  flag: "wx",
});
await rename(temporary, outputPath);
console.log("Grand-total structure forensics: PASS");
console.log(`Accepted Candidate 04c: ${paths.candidate04c}`);
console.log(`Report Builder grand-total seed: ${paths.grandTotalSeed}`);
console.log(`Output: ${outputPath}`);
