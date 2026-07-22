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

export const letterSeedPath = resolve(
  "samples/report-builder-seeds/KnownGoodProductionPaginationLetter.rdl",
);
export const letterSeedSha256 =
  "c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a";
export const candidate06bFileName = "06b-production-pagination-letter.rdl";
const failedCandidate06Sha256 =
  "a9a258a6fab73c0374c4d08dc0c1c923d57e8efd55df2fa04c88215bab06ef2a";

export const deriveCandidate06b = (seed: string): string => {
  if (sha256(seed) !== letterSeedSha256)
    throw new Error(
      "Canonical explicit-Letter seed SHA-256 differs from the baseline",
    );
  assertWellFormed(seed);
  assertReportBuilderGrandTotalStructure(seed, { allowPageBreaks: true });
  assertReportBuilderPaginationStructure(seed);
  const consistency = validateCollectionConsistency(seed, {
    requireExplicitLetterPage: true,
  });
  const pagination = fingerprintPagination(seed);
  if (
    pagination.pageWidthSource !== "EXPLICIT" ||
    pagination.pageHeightSource !== "EXPLICIT" ||
    pagination.pageWidthInches !== 8.5 ||
    pagination.pageHeightInches !== 11 ||
    !pagination.printSafe
  )
    throw new Error(
      "Canonical seed lacks explicit print-safe Letter dimensions",
    );
  if (consistency.embeddedRows !== 6)
    throw new Error("Canonical seed does not preserve six embedded rows");
  return seed;
};

const atomicWrite = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, { flag: "wx" });
  await rename(temporary, path);
};

export const runCandidate06b = async (outputDirectory: string) => {
  const [seed, failedCandidate06] = await Promise.all([
    readFile(letterSeedPath, "utf8"),
    readFile(
      resolve(
        "artifacts/rdl-compatibility-ladder/06-production-pagination.rdl",
      ),
      "utf8",
    ),
  ]);
  if (sha256(failedCandidate06) !== failedCandidate06Sha256)
    throw new Error("Failed Candidate 06 checksum changed");
  const candidate = deriveCandidate06b(seed);
  const output = resolve(outputDirectory);
  const reportPath = join(output, candidate06bFileName);
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
    candidate: candidate06bFileName,
    candidateSha256: sha256(candidate),
    explicitLetterSeed:
      "samples/report-builder-seeds/KnownGoodProductionPaginationLetter.rdl",
    letterSeedSha256,
    derivation: "BYTE_FOR_BYTE_COPY",
    failedCandidate06Preserved: "PASS",
    validation: {
      seedByteIdentity: "PASS",
      literalPageWidth: "8.5in_PASS",
      literalPageHeight: "11in_PASS",
      positivePageHeight: "PASS",
      fourHalfInchMargins: "PASS",
      bodyWithinPrintableWidth: "PASS",
      paginationStructure: "PASS",
      sixRows: "PASS",
      threeRegionSubtotals: "PASS",
      exactlyOneGrandTotal: "PASS",
      correctedSeedOpenDesignPreview: "PASS",
      correctedSeedPdfExport: "PASS",
      correctedSeedExcelExport: "PASS",
      correctedSeedNoBlankPages: "PASS",
      correctedSeedNoHorizontalClipping: "PASS",
      correctedSeedPreviewPageCount: "NOT_PROVIDED_PLACEHOLDER_RECEIVED",
      correctedSeedPdfPageCount: "NOT_PROVIDED_PLACEHOLDER_RECEIVED",
      correctedSeedExcelWorksheetCount: "NOT_PROVIDED_PLACEHOLDER_RECEIVED",
      xmlWellFormedness: "PASS",
      existingXsd: "PASS",
      xsdOutput: xsdOutput || `${candidate06bFileName} validates`,
      candidateReportBuilderOpen: "PENDING_INDEPENDENT_WINDOWS",
      candidatePreview: "PENDING_INDEPENDENT_WINDOWS",
      candidatePdfExport: "PENDING_INDEPENDENT_WINDOWS",
      candidateExcelExport: "PENDING_INDEPENDENT_WINDOWS",
    },
    pagination,
    consistency,
  };
  await atomicWrite(
    join(output, "06b-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return { reportPath, manifest };
};
