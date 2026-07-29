import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inspectRdlBytes } from "../packages/rdl-copilot/src/inspection";
import { catalogRdlBytes } from "../packages/rdl-copilot/src/target-context";

const root = resolve(import.meta.dirname, "..");
const outputRoot = resolve(
  root,
  "examples/rdl-structure-corpus/target-context-v0.3",
);
const fixtures = [
  {
    id: "simple-table",
    path: "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
  },
  {
    id: "grouped-report",
    path: "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
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

await mkdir(resolve(outputRoot, "fixtures"), { recursive: true });
const matrix = [];
for (const fixture of fixtures) {
  const source = await readFile(resolve(root, fixture.path));
  const inventory = await inspectRdlBytes(source, `${fixture.id}.rdl`);
  const catalog = await catalogRdlBytes(source);
  const artifact = {
    version: 1,
    fixtureId: fixture.id,
    source: {
      relativePath: fixture.path,
      byteLength: source.byteLength,
      sha256: hash(source),
    },
    productionInspectionResult: "PASS",
    structuralLocationInventory: {
      regions: [
        ...new Set(
          [...catalog.titleCandidates, ...catalog.fieldDisplayCandidates].map(
            ({ location }) => location.region,
          ),
        ),
      ],
      containerPaths: [
        ...new Set(
          [...catalog.titleCandidates, ...catalog.fieldDisplayCandidates].map(
            ({ location }) => location.structuralPath,
          ),
        ),
      ],
      tablixes: inventory.tablixes,
      groups: inventory.groups,
    },
    titleCandidateCatalog: catalog.titleCandidates,
    fieldDisplayCandidateCatalog: catalog.fieldDisplayCandidates,
    datasetOverlapEvidence: catalog.datasetOverlaps,
    aggregateScopeEvidence: catalog.fieldDisplayCandidates
      .filter(({ expression }) => expression.kind === "aggregateExpression")
      .map(({ diagnosticId, reportItemName, expression, scope, location }) => ({
        diagnosticId,
        reportItemName,
        expression,
        scope,
        groupNames: location.groupNames,
      })),
    containerHierarchyEvidence: [
      ...catalog.titleCandidates,
      ...catalog.fieldDisplayCandidates,
    ]
      .filter(({ location }) => location.containerChain.length)
      .map(({ diagnosticId, reportItemName, location }) => ({
        diagnosticId,
        reportItemName,
        structuralPath: location.structuralPath,
        containerChain: location.containerChain,
        rowMemberPath: location.rowMemberPath,
        columnMemberPath: location.columnMemberPath,
      })),
    candidateOrdering: {
      titleDiagnosticIds: catalog.titleCandidates.map(
        ({ diagnosticId }) => diagnosticId,
      ),
      fieldDiagnosticIds: catalog.fieldDisplayCandidates.map(
        ({ diagnosticId }) => diagnosticId,
      ),
    },
    remainingInformationLoss: [
      "Candidate discovery does not select or score a generic target.",
      "Structural role inference is conservative and remains review evidence.",
      "No candidate identifier is mutation authority.",
    ],
    selectedTarget: null,
    mutationAuthorized: false,
  };
  await writeFile(
    resolve(outputRoot, "fixtures", `${fixture.id}.json`),
    `${JSON.stringify(artifact, null, 2)}\n`,
  );
  matrix.push({
    fixtureId: fixture.id,
    sourceSha256: artifact.source.sha256,
    titleCandidateCount: catalog.titleCandidates.length,
    fieldDisplayCandidateCount: catalog.fieldDisplayCandidates.length,
    datasetOverlapCount: catalog.datasetOverlaps.length,
    selectedTarget: null,
    mutationAuthorized: false,
  });
}
await writeFile(
  resolve(outputRoot, "context-matrix.json"),
  `${JSON.stringify({ version: 1, fixtures: matrix }, null, 2)}\n`,
);
