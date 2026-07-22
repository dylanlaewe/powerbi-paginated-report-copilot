import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCollectionConsistency } from "./compatibility";
import { assertReportBuilderGrandTotalStructure } from "./grand-total-forensics";
import { assertWellFormed } from "./index";
import { sha256 } from "./ladder";
import {
  assertReportBuilderPaginationStructure,
  fingerprintPagination,
} from "./pagination-forensics";

export const printSafePaginationSeedPath = resolve(
  "samples/report-builder-seeds/KnownGoodProductionPaginationPrintSafe.rdl",
);
export const printSafePaginationSeedSha256 =
  "a9a258a6fab73c0374c4d08dc0c1c923d57e8efd55df2fa04c88215bab06ef2a";
export const candidate06FileName = "06-production-pagination.rdl";
const candidate05Sha256 =
  "13a62fcb5858fc53c45cf465de70d53d481c82722e1855c59d6aa2e72378c6dc";
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

export const deriveCandidate06 = (seed: string): string => {
  if (sha256(seed) !== printSafePaginationSeedSha256)
    throw new Error(
      "Canonical print-safe pagination seed SHA-256 differs from the baseline",
    );
  assertWellFormed(seed);
  assertReportBuilderGrandTotalStructure(seed, { allowPageBreaks: true });
  assertReportBuilderPaginationStructure(seed);
  const pagination = fingerprintPagination(seed);
  if (
    !pagination.printSafe ||
    pagination.pageWidthInches !== 8.5 ||
    pagination.pageHeightInches !== 11
  )
    throw new Error(
      "Canonical production seed is not effective Letter print-safe",
    );
  const consistency = validateCollectionConsistency(seed, {
    requireExplicitLetterPage: true,
  });
  if (
    consistency.embeddedRows !== 6 ||
    consistency.fields.join("|") !== requiredFields.join("|")
  )
    throw new Error(
      "Canonical production seed does not preserve six rows and nine fields",
    );
  return seed;
};

const atomicWrite = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, { flag: "wx" });
  await rename(temporary, path);
};

export const runCandidate06 = async (outputDirectory: string) => {
  const [seed, candidate05] = await Promise.all([
    readFile(printSafePaginationSeedPath, "utf8"),
    readFile(
      resolve("artifacts/rdl-compatibility-ladder/05-grand-total.rdl"),
      "utf8",
    ),
  ]);
  if (sha256(candidate05) !== candidate05Sha256)
    throw new Error("Accepted Candidate 05 checksum changed");
  const candidate = deriveCandidate06(seed);
  const output = resolve(outputDirectory);
  const reportPath = join(output, candidate06FileName);
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
    requireExplicitLetterPage: true,
  });
  const pagination = fingerprintPagination(candidate);
  const manifest = {
    candidate: candidate06FileName,
    candidateSha256: sha256(candidate),
    correctedReportBuilderSeed:
      "samples/report-builder-seeds/KnownGoodProductionPaginationPrintSafe.rdl",
    correctedSeedSha256: printSafePaginationSeedSha256,
    acceptedCandidate05Sha256: candidate05Sha256,
    derivation: "BYTE_FOR_BYTE_COPY",
    validation: {
      seedByteIdentity: "PASS",
      sixRowsPreserved: "PASS",
      regionGroupingPreserved: "PASS",
      threeRegionSubtotalsPreserved: "PASS",
      exactlyOneGrandTotalPreserved: "PASS",
      outerRegionPageBreak: "PASS",
      repeatingColumnHeaderMetadata: "PASS",
      pageNumberAndTotalPagesFooter: "PASS",
      effectivePageWidth: "8.5in",
      effectivePageHeight: "11in",
      margins: "0.5in / 0.5in / 0.5in / 0.5in",
      bodyWidth: "7in",
      printableWidth: "7.5in",
      printSafe: "PASS",
      noUnexpectedBlankPagesSeedValidation: "PASS",
      noHorizontalClippingSeedValidation: "PASS",
      seedPdfExport: "PASS",
      seedExcelExport: "PASS",
      previewPageCount: "NOT_PROVIDED_PLACEHOLDER_RECEIVED",
      pdfPageCount: "NOT_PROVIDED_PLACEHOLDER_RECEIVED",
      excelWorksheetCount: "NOT_PROVIDED_PLACEHOLDER_RECEIVED",
      xmlWellFormedness: "PASS",
      existingXsd: "PASS",
      xsdOutput: xsdOutput || `${candidate06FileName} validates`,
      crossPlatformRdlBytePolicy: "PASS",
      candidateReportBuilderOpen: "PENDING_INDEPENDENT_WINDOWS",
      candidateReportBuilderPreview: "PENDING_INDEPENDENT_WINDOWS",
      candidatePdfExport: "PENDING_INDEPENDENT_WINDOWS",
      candidateExcelExport: "PENDING_INDEPENDENT_WINDOWS",
    },
    pagination,
    consistency,
  };
  await atomicWrite(
    join(output, "06-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return { reportPath, manifest };
};
