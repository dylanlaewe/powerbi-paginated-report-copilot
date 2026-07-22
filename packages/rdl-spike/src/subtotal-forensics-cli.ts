import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { compareSubtotalStructures } from "./subtotal-forensics";

const paths = {
  candidate03b: resolve(
    "artifacts/rdl-compatibility-ladder/03b-region-group-from-seed.rdl",
  ),
  candidate04: resolve(
    "artifacts/rdl-compatibility-ladder/04-region-subtotal.rdl",
  ),
  subtotalSeed: resolve(
    "samples/report-builder-seeds/KnownGoodRegionSubtotal.rdl",
  ),
};
const [candidate03b, candidate04, subtotalSeed] = await Promise.all(
  Object.values(paths).map((path) => readFile(path, "utf8")),
);
const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
const outputPath = resolve(
  process.argv[2] ??
    "artifacts/rdl-compatibility-ladder/04-THREE_WAY_FORENSICS.json",
);
const evidence = {
  command:
    "pnpm spike:rdl-subtotal-forensics artifacts/rdl-compatibility-ladder/04-THREE_WAY_FORENSICS.json",
  files: Object.fromEntries(
    Object.entries(paths).map(([key, path], index) => [
      key,
      {
        path,
        sha256: sha256([candidate03b, candidate04, subtotalSeed][index]!),
      },
    ]),
  ),
  comparison: compareSubtotalStructures(
    candidate03b!,
    candidate04!,
    subtotalSeed!,
  ),
};
await mkdir(dirname(outputPath), { recursive: true });
const temporary = `${outputPath}.${process.pid}.tmp`;
await writeFile(temporary, `${JSON.stringify(evidence, null, 2)}\n`, {
  flag: "wx",
});
await rename(temporary, outputPath);
console.log("Three-way subtotal structure forensics: PASS");
console.log(`Accepted Candidate 03b: ${paths.candidate03b}`);
console.log(`Rejected Candidate 04: ${paths.candidate04}`);
console.log(`Accepted subtotal seed: ${paths.subtotalSeed}`);
console.log(`Output: ${outputPath}`);
