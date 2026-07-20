import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCollectionConsistency } from "./compatibility";
import { assertReportBuilderGroupedHierarchy } from "./group-forensics";
import { assertWellFormed } from "./index";
import { sha256 } from "./ladder";

export const groupedSeedPath = resolve(
  "samples/report-builder-seeds/KnownGoodRegionGroup.rdl",
);
export const groupedSeedSha256 =
  "f85dfd067e037336cb9a7fe7f5245b19a2030b01e2a997f0430a34b1f5090b88";
export const candidate03bFileName = "03b-region-group-from-seed.rdl";
const candidate01Sha256 =
  "151274f425f20e1bd88a7a8f892fca799f9efe9184b1df42e9cec53ab2e016a7";
const candidate02Sha256 =
  "c5c86b7f7f9aa90dbd101f5d8a637c715ae8e3e36d5a6d3a2095f0617a0d5c8b";
const rejectedCandidate03Sha256 =
  "5dd58b2d5acd39a66bc734e16956a592f1c84afa9ae7080101f7003030661c0b";
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

export const deriveCandidate03b = (groupedSeed: string): string => {
  if (sha256(groupedSeed) !== groupedSeedSha256)
    throw new Error("Canonical grouped seed SHA-256 differs from the baseline");
  assertWellFormed(groupedSeed);
  assertReportBuilderGroupedHierarchy(groupedSeed);
  const consistency = validateCollectionConsistency(groupedSeed, {
    requirePrintSafe: false,
  });
  if (
    consistency.fields.join("|") !== requiredFields.join("|") ||
    consistency.embeddedRows !== 6
  )
    throw new Error(
      "Canonical grouped seed does not preserve nine fields and six rows",
    );
  return groupedSeed;
};

const atomicWrite = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, { flag: "wx" });
  await rename(temporary, path);
};

export const runCandidate03b = async (outputDirectory: string) => {
  const groupedSeed = await readFile(groupedSeedPath, "utf8");
  const candidate = deriveCandidate03b(groupedSeed);
  const consistency = validateCollectionConsistency(candidate, {
    requirePrintSafe: false,
  });
  const output = resolve(outputDirectory);
  const reportPath = join(output, candidate03bFileName);
  await atomicWrite(reportPath, candidate);
  const protectedFiles = [
    {
      path: resolve(
        "artifacts/rdl-compatibility-ladder/01-minimal-enter-data-table.rdl",
      ),
      expected: candidate01Sha256,
      label: "Candidate 01",
    },
    {
      path: resolve("artifacts/rdl-compatibility-ladder/02-detail-columns.rdl"),
      expected: candidate02Sha256,
      label: "Candidate 02",
    },
    {
      path: resolve("artifacts/rdl-compatibility-ladder/03-region-group.rdl"),
      expected: rejectedCandidate03Sha256,
      label: "rejected Candidate 03",
    },
    {
      path: groupedSeedPath,
      expected: groupedSeedSha256,
      label: "grouped seed",
    },
  ];
  for (const protectedFile of protectedFiles)
    if (sha256(await readFile(protectedFile.path)) !== protectedFile.expected)
      throw new Error(`${protectedFile.label} checksum changed`);
  const schemaPath = fileURLToPath(
    new URL("../schema/ReportDefinition-2016.xsd", import.meta.url),
  );
  const xsdOutput = execFileSync(
    "xmllint",
    ["--noout", "--schema", schemaPath, reportPath],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const manifest = {
    candidate: candidate03bFileName,
    candidateSha256: sha256(candidate),
    canonicalGroupedSeed:
      "samples/report-builder-seeds/KnownGoodRegionGroup.rdl",
    groupedSeedSha256,
    derivation: "BYTE_FOR_BYTE_COPY",
    fields: requiredFields,
    rows: 6,
    validation: {
      xmlWellFormedness: "PASS",
      existingXsd: "PASS",
      xsdOutput: xsdOutput || `${candidate03bFileName} validates`,
      reportBuilderGroupedHierarchyRegression: "PASS",
      embeddedDataConsistency: "PASS",
      candidates01And02Unchanged: "PASS",
      rejectedCandidate03Unchanged: "PASS",
      groupedSeedUnchanged: "PASS",
      bodyWidth: `${consistency.bodyWidthInches}in`,
      nominalPrintableWidth: `${consistency.availablePageWidthInches}in`,
      widthDisposition:
        "PRESERVED_FROM_INDEPENDENTLY_ACCEPTED_REPORT_BUILDER_SEED",
      consistency,
      reportBuilderOpen: "PENDING_INDEPENDENT_WINDOWS",
      reportBuilderPreview: "PENDING_INDEPENDENT_WINDOWS",
    },
  };
  await atomicWrite(
    join(output, "03b-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await atomicWrite(
    join(output, "03b-HIERARCHY_CONSISTENCY.json"),
    `${JSON.stringify(
      {
        command:
          "pnpm spike:rdl-compatibility-03b artifacts/rdl-compatibility-ladder",
        derivation: "BYTE_FOR_BYTE_COPY",
        seed: {
          path: "samples/report-builder-seeds/KnownGoodRegionGroup.rdl",
          sha256: groupedSeedSha256,
          unchanged: "PASS",
        },
        candidate: {
          path: `artifacts/rdl-compatibility-ladder/${candidate03bFileName}`,
          sha256: sha256(candidate),
          byteForByteEqualToSeed: "PASS",
        },
        hierarchy: {
          bodyRows: 2,
          rowHierarchyLeaves: 2,
          groups: ["Region", "Region1", "Details"],
          groupHeaderPlacement: "ROW_HIERARCHY_HEADER",
          regionSorts: 2,
          detailSorts: ["=Fields!SaleDate.Value", "=Fields!Salesperson.Value"],
          aggregateExpressions: "NONE",
          pageBreakDefinitions: "NONE",
        },
        consistency,
      },
      null,
      2,
    )}\n`,
  );
  return { reportPath, manifest };
};
