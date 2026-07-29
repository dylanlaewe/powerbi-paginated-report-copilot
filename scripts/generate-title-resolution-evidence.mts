import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { catalogRdlBytes } from "../packages/rdl-copilot/src/target-context";
import {
  rankTitleCandidates,
  resolveReadOnlyReportTitle,
} from "../packages/rdl-copilot/src/title-resolution";

const root = resolve(import.meta.dirname, "..");
const outputRoot = resolve(
  root,
  "examples/rdl-structure-corpus/title-resolution-v0.3",
);
const fixtures = [
  {
    id: "simple-table",
    path: "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
    gate2G:
      "Styled ReportTitle and visible Textbox9 conflict was observed diagnostically.",
  },
  {
    id: "grouped-report",
    path: "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
    gate2G: "ReportTitle was the correct diagnostic candidate.",
  },
  {
    id: "microsoft-invoice",
    path: "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl",
    gate2G: "No conservative title candidate was found.",
  },
  {
    id: "microsoft-transcript",
    path: "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl",
    gate2G:
      "The page-header title was outside the former body-only discovery path.",
  },
] as const;
const hash = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

await mkdir(resolve(outputRoot, "fixtures"), { recursive: true });
const matrix = [];
for (const fixture of fixtures) {
  const source = await readFile(resolve(root, fixture.path));
  const catalog = await catalogRdlBytes(source);
  const ranking = rankTitleCandidates(catalog);
  const outcome = resolveReadOnlyReportTitle(catalog);
  const artifact = {
    version: 1,
    fixtureId: fixture.id,
    source: {
      relativePath: fixture.path,
      byteLength: source.byteLength,
      sha256: hash(source),
    },
    candidateOrdering: ranking,
    resolution: outcome,
    selectedDiagnosticCandidate:
      outcome.status === "resolved" ? outcome.candidateId : null,
    alternatives:
      outcome.status === "resolved"
        ? outcome.alternatives
        : outcome.status === "ambiguous"
          ? outcome.candidates
          : ranking,
    mutationAuthorized: false,
    mutationTargetCreated: false,
    gate2GComparison: fixture.gate2G,
    remainingLimitations: [
      "Resolution is read-only and cannot authorize a title mutation.",
      "No user review or generic target authorization exists.",
      "Existing checksum-reviewed title mappings remain the only writable path.",
    ],
  };
  await writeFile(
    resolve(outputRoot, "fixtures", `${fixture.id}.json`),
    `${JSON.stringify(artifact, null, 2)}\n`,
  );
  matrix.push({
    fixtureId: fixture.id,
    sourceSha256: artifact.source.sha256,
    consideredCandidateCount: ranking.length,
    status: outcome.status,
    reason: outcome.reason,
    confidence: outcome.status === "resolved" ? outcome.confidence : null,
    selectedDiagnosticCandidate: artifact.selectedDiagnosticCandidate,
    mutationAuthorized: false,
  });
}
await writeFile(
  resolve(outputRoot, "resolution-matrix.json"),
  `${JSON.stringify({ version: 1, fixtures: matrix }, null, 2)}\n`,
);
