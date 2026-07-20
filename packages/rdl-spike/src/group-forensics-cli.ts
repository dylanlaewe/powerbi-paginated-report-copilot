import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { compareGroupHierarchies } from "./group-forensics";

const paths = {
  candidate02: resolve(
    "artifacts/rdl-compatibility-ladder/02-detail-columns.rdl",
  ),
  candidate03: resolve(
    "artifacts/rdl-compatibility-ladder/03-region-group.rdl",
  ),
  groupedSeed: resolve("samples/report-builder-seeds/KnownGoodRegionGroup.rdl"),
};
const [candidate02, candidate03, groupedSeed] = await Promise.all([
  readFile(paths.candidate02, "utf8"),
  readFile(paths.candidate03, "utf8"),
  readFile(paths.groupedSeed, "utf8"),
]);
const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
const outputPath = resolve(
  process.argv[2] ??
    "artifacts/rdl-compatibility-ladder/03-THREE_WAY_FORENSICS.json",
);
const evidence = {
  command:
    "pnpm spike:rdl-group-forensics artifacts/rdl-compatibility-ladder/03-THREE_WAY_FORENSICS.json",
  files: {
    candidate02: { path: paths.candidate02, sha256: sha256(candidate02) },
    candidate03: { path: paths.candidate03, sha256: sha256(candidate03) },
    groupedSeed: { path: paths.groupedSeed, sha256: sha256(groupedSeed) },
  },
  comparison: compareGroupHierarchies(candidate02, candidate03, groupedSeed),
};
await mkdir(dirname(outputPath), { recursive: true });
const temporary = `${outputPath}.${process.pid}.tmp`;
await writeFile(temporary, `${JSON.stringify(evidence, null, 2)}\n`, {
  flag: "wx",
});
await rename(temporary, outputPath);
console.log("Three-way grouped hierarchy forensics: PASS");
console.log(`Candidate 02: ${paths.candidate02}`);
console.log(`Rejected Candidate 03: ${paths.candidate03}`);
console.log(`Accepted grouped seed: ${paths.groupedSeed}`);
console.log(`Output: ${outputPath}`);
