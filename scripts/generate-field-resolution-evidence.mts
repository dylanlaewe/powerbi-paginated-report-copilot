import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  rankFieldDisplayCandidates,
  resolveReadOnlyFieldDisplay,
} from "../packages/rdl-copilot/src/field-resolution";
import { catalogRdlBytes } from "../packages/rdl-copilot/src/target-context";

const root = resolve(import.meta.dirname, "..");
const outputRoot = resolve(
  root,
  "examples/rdl-structure-corpus/field-resolution-v0.3",
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
  const catalog = await catalogRdlBytes(source);
  const fieldNames = [
    ...new Set(
      catalog.fieldDisplayCandidates.map(
        ({ fieldIdentity }) => fieldIdentity.fieldName,
      ),
    ),
  ].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const evaluations = fieldNames.map((fieldName) => ({
    fieldName,
    candidateOrdering: rankFieldDisplayCandidates(catalog, { fieldName }),
    outcome: resolveReadOnlyFieldDisplay(catalog, { fieldName }),
  }));
  const artifact = {
    version: 1,
    fixtureId: fixture.id,
    source: {
      relativePath: fixture.path,
      byteLength: source.byteLength,
      sha256: hash(source),
    },
    evaluatedFieldNames: fieldNames,
    evaluations,
    datasetOverlapEvidence: catalog.datasetOverlaps,
    mutationAuthorized: false,
    mutationTargetCreated: false,
    remainingLimitations: [
      "Field-name-only requests cannot select detail, subtotal, or Grand Total scope.",
      "No multi-location formatting policy is authorized.",
      "Serialized field types are unavailable in the current production catalog; compatibility remains unknown.",
      "Checksum-reviewed numeric targets remain the only writable path.",
    ],
  };
  await writeFile(
    resolve(outputRoot, "fixtures", `${fixture.id}.json`),
    `${JSON.stringify(artifact, null, 2)}\n`,
  );
  matrix.push({
    fixtureId: fixture.id,
    sourceSha256: artifact.source.sha256,
    evaluatedFieldCount: fieldNames.length,
    outcomes: evaluations.map(({ fieldName, outcome }) => ({
      fieldName,
      status: outcome.status,
      reason: outcome.reason,
      confidence: outcome.status === "resolved" ? outcome.confidence : null,
      selectedDiagnosticCandidate:
        outcome.status === "resolved" ? outcome.candidateId : null,
      mutationAuthorized: false,
    })),
  });
}
await writeFile(
  resolve(outputRoot, "resolution-matrix.json"),
  `${JSON.stringify({ version: 1, fixtures: matrix }, null, 2)}\n`,
);
