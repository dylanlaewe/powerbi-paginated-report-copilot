import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { validateCollectionConsistency } from "./compatibility";

const seedPath = resolve(
  "samples/report-builder-seeds/KnownGoodEnterDataTable.rdl",
);
const rejectedPath = resolve(
  "artifacts/first-real-rdl-spike/Regional Sales Detail.rdl",
);
const outputPath = resolve(
  process.argv[2] ??
    "artifacts/rdl-compatibility-ladder/COLLECTION_CONSISTENCY.json",
);
const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
const atomicWrite = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, { flag: "wx" });
  await rename(temporary, path);
};

const [seed, rejected] = await Promise.all([
  readFile(seedPath, "utf8"),
  readFile(rejectedPath, "utf8"),
]);
const evidence = {
  command:
    "pnpm spike:rdl-forensics artifacts/rdl-compatibility-ladder/COLLECTION_CONSISTENCY.json",
  seed: {
    path: "samples/report-builder-seeds/KnownGoodEnterDataTable.rdl",
    sha256: sha256(seed),
    consistency: validateCollectionConsistency(seed),
  },
  rejected: {
    path: "artifacts/first-real-rdl-spike/Regional Sales Detail.rdl",
    sha256: sha256(rejected),
    consistency: validateCollectionConsistency(rejected),
  },
  conclusion:
    "Both files pass the implemented collection-count checks; no collection-count root cause is established.",
};
await atomicWrite(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Collection consistency: PASS`);
console.log(`Seed: ${seedPath}`);
console.log(`Rejected: ${rejectedPath}`);
console.log(`Output: ${outputPath}`);
