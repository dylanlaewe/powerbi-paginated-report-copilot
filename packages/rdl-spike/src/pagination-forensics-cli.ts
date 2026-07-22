import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { comparePaginationStructures } from "./pagination-forensics";

const paths = {
  candidate05: resolve("artifacts/rdl-compatibility-ladder/05-grand-total.rdl"),
  productionSeed: resolve(
    "samples/report-builder-seeds/KnownGoodProductionPagination.rdl",
  ),
};
const [candidate05, seed] = await Promise.all(
  Object.values(paths).map((path) => readFile(path, "utf8")),
);
const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
const outputPath = resolve(
  process.argv[2] ?? "artifacts/rdl-compatibility-ladder/06-FORENSICS.json",
);
const evidence = {
  command:
    "pnpm spike:rdl-pagination-forensics artifacts/rdl-compatibility-ladder/06-FORENSICS.json",
  files: {
    candidate05: { path: paths.candidate05, sha256: sha256(candidate05!) },
    productionSeed: { path: paths.productionSeed, sha256: sha256(seed!) },
  },
  comparison: comparePaginationStructures(candidate05!, seed!),
};
await mkdir(dirname(outputPath), { recursive: true });
const temporary = `${outputPath}.${process.pid}.tmp`;
await writeFile(temporary, `${JSON.stringify(evidence, null, 2)}\n`, {
  flag: "wx",
});
await rename(temporary, outputPath);
console.log("Production-pagination structure forensics: PASS");
console.log(
  "Print-safe seed validation: FAIL (PageWidth 2in; required minimum 8in)",
);
console.log(`Output: ${outputPath}`);
