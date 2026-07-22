import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCollectionConsistency } from "./compatibility";
import { assertWellFormed } from "./index";
import { sha256 } from "./ladder";
import {
  assertReportBuilderSubtotalStructure,
  fingerprintSubtotal,
} from "./subtotal-forensics";

export const subtotalSeedPath = resolve(
  "samples/report-builder-seeds/KnownGoodRegionSubtotal.rdl",
);
export const subtotalSeedSha256 =
  "5b670cdd46a820ada82386b1d5dff6d1910e5eb54088d36cecb9e5df3a34555a";
export const candidate04bFileName = "04b-region-subtotal-from-seed.rdl";
const protectedHashes = [
  [
    "artifacts/rdl-compatibility-ladder/01-minimal-enter-data-table.rdl",
    "151274f425f20e1bd88a7a8f892fca799f9efe9184b1df42e9cec53ab2e016a7",
    "Candidate 01",
  ],
  [
    "artifacts/rdl-compatibility-ladder/02-detail-columns.rdl",
    "c5c86b7f7f9aa90dbd101f5d8a637c715ae8e3e36d5a6d3a2095f0617a0d5c8b",
    "Candidate 02",
  ],
  [
    "artifacts/rdl-compatibility-ladder/03-region-group.rdl",
    "5dd58b2d5acd39a66bc734e16956a592f1c84afa9ae7080101f7003030661c0b",
    "rejected Candidate 03",
  ],
  [
    "artifacts/rdl-compatibility-ladder/03b-region-group-from-seed.rdl",
    "f85dfd067e037336cb9a7fe7f5245b19a2030b01e2a997f0430a34b1f5090b88",
    "Candidate 03b",
  ],
  [
    "artifacts/rdl-compatibility-ladder/04-region-subtotal.rdl",
    "7621061880e0ee201dd34fd5931c1a86dc44dcb0997fc2b530521b069fbba8fe",
    "rejected Candidate 04",
  ],
  [
    "samples/report-builder-seeds/KnownGoodEnterDataTable.rdl",
    "dc3e3f939d0d5f0eb8242681b17c43aa49dd0455a65f4e8cad10fbe24408ab7f",
    "Enter Data seed",
  ],
  [
    "samples/report-builder-seeds/KnownGoodRegionGroup.rdl",
    "f85dfd067e037336cb9a7fe7f5245b19a2030b01e2a997f0430a34b1f5090b88",
    "grouped seed",
  ],
  [
    "samples/report-builder-seeds/KnownGoodRegionSubtotal.rdl",
    subtotalSeedSha256,
    "subtotal seed",
  ],
] as const;
const requiredFields = [
  "SaleDate",
  "Region",
  "Salesperson",
  "Customer",
  "Product",
  "Category",
  "Quantity",
  "Revenue",
  "GrossProfit",
];

export const deriveCandidate04b = (seed: string): string => {
  if (sha256(seed) !== subtotalSeedSha256)
    throw new Error(
      "Canonical subtotal seed SHA-256 differs from the baseline",
    );
  assertWellFormed(seed);
  assertReportBuilderSubtotalStructure(seed);
  const consistency = validateCollectionConsistency(seed, {
    requirePrintSafe: false,
  });
  if (
    consistency.fields.join("|") !== requiredFields.join("|") ||
    consistency.embeddedRows !== 6
  )
    throw new Error(
      "Canonical subtotal seed does not preserve nine fields and six rows",
    );
  return seed;
};

const atomicWrite = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, { flag: "wx" });
  await rename(temporary, path);
};

export const runCandidate04b = async (outputDirectory: string) => {
  const seed = await readFile(subtotalSeedPath, "utf8");
  const candidate = deriveCandidate04b(seed);
  for (const [path, expected, label] of protectedHashes)
    if (sha256(await readFile(resolve(path))) !== expected)
      throw new Error(`${label} checksum changed`);
  const output = resolve(outputDirectory);
  const reportPath = join(output, candidate04bFileName);
  await atomicWrite(reportPath, candidate);
  const schemaPath = fileURLToPath(
    new URL("../schema/ReportDefinition-2016.xsd", import.meta.url),
  );
  const xsdOutput = execFileSync(
    "xmllint",
    ["--noout", "--schema", schemaPath, reportPath],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const consistency = validateCollectionConsistency(candidate, {
    requirePrintSafe: false,
  });
  const fingerprint = fingerprintSubtotal(candidate);
  const manifest = {
    candidate: candidate04bFileName,
    candidateSha256: sha256(candidate),
    canonicalSubtotalSeed:
      "samples/report-builder-seeds/KnownGoodRegionSubtotal.rdl",
    subtotalSeedSha256,
    derivation: "BYTE_FOR_BYTE_COPY",
    fields: requiredFields,
    rows: 6,
    expectedRuntimeRegionSubtotals: 3,
    validation: {
      xmlWellFormedness: "PASS",
      existingXsd: "PASS",
      xsdOutput: xsdOutput || `${candidate04bFileName} validates`,
      reportBuilderSubtotalRegression: "PASS",
      seedByteIdentity: sha256(candidate) === sha256(seed) ? "PASS" : "FAIL",
      protectedArtifactsAndSeedsUnchanged: "PASS",
      noGrandTotal: "PASS",
      noPageBreaks: "PASS",
      noParameters: "PASS",
      reportBuilderOpen: "PENDING_INDEPENDENT_WINDOWS",
      reportBuilderPreview: "PENDING_INDEPENDENT_WINDOWS",
    },
  };
  await atomicWrite(
    join(output, "04b-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await atomicWrite(
    join(output, "04b-SUBTOTAL_CONSISTENCY.json"),
    `${JSON.stringify(
      {
        command:
          "pnpm spike:rdl-compatibility-04b artifacts/rdl-compatibility-ladder",
        seed: {
          path: "samples/report-builder-seeds/KnownGoodRegionSubtotal.rdl",
          sha256: subtotalSeedSha256,
          unchanged: "PASS",
        },
        candidate: {
          path: `artifacts/rdl-compatibility-ladder/${candidate04bFileName}`,
          sha256: sha256(candidate),
          byteForByteEqualToSeed: "PASS",
        },
        hierarchy: fingerprint,
        consistency,
      },
      null,
      2,
    )}\n`,
  );
  return { reportPath, manifest };
};
