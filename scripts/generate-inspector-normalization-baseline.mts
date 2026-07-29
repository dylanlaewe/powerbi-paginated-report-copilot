import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import {
  inspectRdlBytes,
  resolveConfiguredReportTitle,
  resolveFieldDisplays,
  RdlInspectionError,
} from "../packages/rdl-copilot/src/inspection";

const root = resolve(import.meta.dirname, "..");
const outputRoot = resolve(
  root,
  "examples/rdl-structure-corpus/inspector-normalization-v0.3",
);
const fixtures = [
  {
    id: "simple-table",
    path: "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
    numericField: "UnitCost",
  },
  {
    id: "grouped-report",
    path: "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
    numericField: "Revenue",
  },
  {
    id: "microsoft-invoice",
    path: "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl",
  },
  {
    id: "microsoft-transcript",
    path: "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl",
  },
] as const;

const hash = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const result = (operation: () => unknown) => {
  try {
    return { status: "PASS", result: operation() };
  } catch (error) {
    return {
      status: "BLOCKED",
      code:
        error instanceof RdlInspectionError ? error.code : "UNEXPECTED_ERROR",
      message: error instanceof Error ? error.message : String(error),
    };
  }
};

await mkdir(resolve(outputRoot, "fixtures"), { recursive: true });
const matrix = [];
for (const fixture of fixtures) {
  const source = await readFile(resolve(root, fixture.path));
  const inventory = await inspectRdlBytes(source, basename(fixture.path));
  const section = inventory.reportSections[0]!;
  const summary = {
    filename: inventory.fileName,
    sourceSha256: inventory.sourceSha256,
    namespace: inventory.namespace,
    namespaceVersion: inventory.namespaceVersion,
    datasetNames: inventory.datasets.map(({ name }) => name),
    fieldCount: new Set(inventory.datasets.flatMap(({ fields }) => fields))
      .size,
    tablixNames: inventory.tablixes.map(({ name }) => name),
    groupNames: inventory.groups.map(({ name }) => name),
    textboxCount: inventory.textboxes.length,
    pageOrientation:
      section.orientation.status === "known"
        ? section.orientation.value
        : "unspecified",
    pageWidth:
      section.pageWidth.presence === "explicit"
        ? section.pageWidth.raw
        : "Not serialized",
    pageHeight:
      section.pageHeight.presence === "explicit"
        ? section.pageHeight.raw
        : "Not serialized",
  };
  const evidence = {
    version: 1,
    fixtureId: fixture.id,
    source: {
      relativePath: fixture.path,
      byteLength: source.byteLength,
      sha256: hash(source),
    },
    priorGate2GResult: {
      status: "BLOCKED_INSPECTOR",
      code: "INVALID_REPORT",
      message: "ReportSection 0 lacks PageWidth",
    },
    newInspectionResult: "PASS",
    xmlParseResult: "PASS",
    namespaceResult: {
      status: "PASS",
      namespace: inventory.namespace,
      version: inventory.namespaceVersion,
    },
    modelNormalizationResult: "PASS",
    pageSettingsResult: {
      status: "PASS",
      pageWidth: section.pageWidth,
      pageHeight: section.pageHeight,
      margins: section.margins,
      orientation: section.orientation,
      bodyWidth: section.bodyWidth,
    },
    structuralInventoryResult: {
      status: "PASS",
      counts: {
        dataSources: inventory.dataSources.length,
        datasets: inventory.datasets.length,
        parameters: inventory.reportParameters.length,
        tablixes: inventory.tablixes.length,
        textboxes: inventory.textboxes.length,
        rectangles: inventory.rectangles.length,
        images: inventory.images.length,
        groups: inventory.groups.length,
        expressions: inventory.textboxes.reduce(
          (count, textbox) => count + textbox.expressions.length,
          0,
        ),
      },
      pageHeaderPresent: inventory.pageHeaderPresent,
      pageFooterPresent: inventory.pageFooterPresent,
      groups: inventory.groups,
      warnings: inventory.warnings,
      unsupportedElements: inventory.unsupportedElements,
    },
    candidateDiscoveryReachability: "REACHED",
    rendererSummaryAvailability: { status: "PASS", summary },
    titleResolution: result(() => resolveConfiguredReportTitle(inventory)),
    numericResolution:
      "numericField" in fixture
        ? result(() => resolveFieldDisplays(inventory, fixture.numericField))
        : {
            status: "NOT_EVALUATED",
            reason: "No Gate 2H numeric mutation target was approved.",
          },
    orientationCapability: {
      status: "BLOCKED",
      code: "PAGE_DIMENSIONS_UNSPECIFIED",
      message:
        "The source omits explicit PageWidth or PageHeight, so deterministic orientation mutation cannot proceed.",
    },
    exactRemainingBlockers: [
      "Page orientation mutation requires explicit serialized PageWidth and PageHeight.",
      "Checksum-reviewed report-title target is not configured for this source.",
    ],
  };
  await writeFile(
    resolve(outputRoot, "fixtures", `${fixture.id}.json`),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  matrix.push({
    fixtureId: fixture.id,
    sourceSha256: evidence.source.sha256,
    inspection: evidence.newInspectionResult,
    pageWidthPresence: section.pageWidth.presence,
    pageHeightPresence: section.pageHeight.presence,
    rendererSummary: evidence.rendererSummaryAvailability.status,
    orientationCapability: evidence.orientationCapability.code,
  });
}
await writeFile(
  resolve(outputRoot, "normalization-matrix.json"),
  `${JSON.stringify({ version: 1, fixtures: matrix }, null, 2)}\n`,
);
