import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { replacementRows } from "./candidate04c";
import { validateCollectionConsistency } from "./compatibility";
import { assertReportBuilderGrandTotalStructure } from "./grand-total-forensics";
import { assertWellFormed } from "./index";
import { sha256 } from "./ladder";

export const grandTotalSeedPath = resolve(
  "samples/report-builder-seeds/KnownGoodGrandTotal.rdl",
);
export const grandTotalSeedSha256 =
  "2056e175e99364301dcfd07c0e54e7f417e3851ffe5617589f4f707e47b4eba7";
export const candidate05FileName = "05-grand-total.rdl";
export const candidate04cSha256 =
  "f3844e47c16670a21715c2a476d87f5f01d8018c2f5cb45a37aa3afa6211aa90";
export const expectedGrandTotal = {
  Quantity: 61,
  Revenue: 15990,
  GrossProfit: 6250,
} as const;

const textbox2 =
  /(<Textbox Name="Textbox2">[\s\S]*?<Value>)Total(<\/Value>[\s\S]*?<\/Textbox>)/;
const textbox2Grand =
  /(<Textbox Name="Textbox2">[\s\S]*?<Value>)Grand Total(<\/Value>[\s\S]*?<\/Textbox>)/;
const normalizeGrandTotalLabel = (xml: string): string =>
  xml.replace(textbox2Grand, "$1Total$2");

export const deriveCandidate05 = (seed: string): string => {
  if (sha256(seed) !== grandTotalSeedSha256)
    throw new Error(
      "Canonical grand-total seed SHA-256 differs from the baseline",
    );
  assertReportBuilderGrandTotalStructure(seed);
  const candidate = seed.replace(textbox2, "$1Grand Total$2");
  if (candidate === seed || !candidate.includes("<Value>Grand Total</Value>"))
    throw new Error("Report-level Grand Total label was not instantiated");
  if (normalizeGrandTotalLabel(candidate) !== seed)
    throw new Error(
      "Candidate differs from the seed beyond the Grand Total label",
    );
  assertWellFormed(candidate);
  assertReportBuilderGrandTotalStructure(candidate);
  return candidate;
};

const atomicWrite = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, { flag: "wx" });
  await rename(temporary, path);
};

export const runCandidate05 = async (outputDirectory: string) => {
  const [seed, candidate04c] = await Promise.all([
    readFile(grandTotalSeedPath, "utf8"),
    readFile(
      resolve(
        "artifacts/rdl-compatibility-ladder/04c-template-instantiated-subtotal.rdl",
      ),
      "utf8",
    ),
  ]);
  if (sha256(candidate04c) !== candidate04cSha256)
    throw new Error("Accepted Candidate 04c checksum changed");
  const candidate = deriveCandidate05(seed);
  const consistency = validateCollectionConsistency(candidate, {
    requirePrintSafe: false,
  });
  if (consistency.embeddedRows !== 6)
    throw new Error("Candidate 05 does not preserve six embedded rows");
  const calculated = replacementRows.reduce(
    (total, row) => ({
      Quantity: total.Quantity + row.Quantity,
      Revenue: total.Revenue + row.Revenue,
      GrossProfit: total.GrossProfit + row.GrossProfit,
    }),
    { Quantity: 0, Revenue: 0, GrossProfit: 0 },
  );
  if (JSON.stringify(calculated) !== JSON.stringify(expectedGrandTotal))
    throw new Error(
      "Candidate 05 grand-total expectation differs from embedded data",
    );
  const output = resolve(outputDirectory);
  const reportPath = join(output, candidate05FileName);
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
  const manifest = {
    candidate: candidate05FileName,
    candidateSha256: sha256(candidate),
    acceptedCandidate04c:
      "artifacts/rdl-compatibility-ladder/04c-template-instantiated-subtotal.rdl",
    candidate04cSha256,
    reportBuilderGrandTotalTemplate:
      "samples/report-builder-seeds/KnownGoodGrandTotal.rdl",
    grandTotalSeedSha256,
    derivation: "REPORT_BUILDER_GRAND_TOTAL_TEMPLATE_LABEL_INSTANTIATION",
    onlySeedByteChange: "Textbox2 Value: Total -> Grand Total",
    rows: replacementRows,
    expectedRegionSubtotals: {
      Central: { Quantity: 17, Revenue: 4050, GrossProfit: 1610 },
      East: { Quantity: 14, Revenue: 5950, GrossProfit: 2270 },
      West: { Quantity: 30, Revenue: 5990, GrossProfit: 2370 },
    },
    expectedGrandTotal,
    validation: {
      grandTotalSeedHash: "PASS",
      candidate04cHash: "PASS",
      grandTotalStructureRegression: "PASS",
      seedStructurePreservedExceptLabelContent: "PASS",
      sixRowsPreserved: "PASS",
      threeRegionSubtotalsPreserved: "PASS",
      exactlyOneReportGrandTotal: "PASS",
      datasetContextAggregateExpressions: "PASS",
      grandTotalCalculatedIndependently: "PASS",
      noPageBreaks: "PASS",
      noParameters: "PASS",
      xmlWellFormedness: "PASS",
      existingXsd: "PASS",
      xsdOutput: xsdOutput || `${candidate05FileName} validates`,
      crossPlatformRdlBytePolicy: "PASS",
      reportBuilderOpen: "PENDING_INDEPENDENT_WINDOWS",
      reportBuilderPreview: "PENDING_INDEPENDENT_WINDOWS",
    },
    consistency,
  };
  await atomicWrite(
    join(output, "05-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return { reportPath, manifest };
};
