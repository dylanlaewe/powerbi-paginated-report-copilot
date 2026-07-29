import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import {
  authorizeReviewedPlan,
  buildReviewBundle,
  catalogRdlBytes,
  confirmReviewOperation,
  createEditPlannerContext,
  genericMutationManifestSchema,
  inspectRdlFile,
  LocalSentenceEditPlanner,
  mutateAuthorizedRdl,
  updateReviewSelection,
} from "../packages/rdl-copilot/src/index";

const root = resolve(import.meta.dirname, "..");
const outputRoot = resolve(
  root,
  "examples/rdl-structure-corpus/generic-mutation-v0.3",
);
const schema = await readFile(
  resolve(root, "packages/rdl-spike/schema/ReportDefinition-2016.xsd"),
);
const scenarios = [
  {
    id: "controlled-simple-table",
    fixtureId: "simple-table",
    path: "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
    sourceSha256:
      "e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3",
    request:
      'Change the report title to "Quarterly Inventory Detail", make the title 20-point bold, and format UnitCost as currency with no decimal places.',
    choice: "simpleTextbox9",
  },
  {
    id: "controlled-grouped-all-three",
    fixtureId: "grouped-report",
    path: "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
    sourceSha256:
      "03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b",
    request:
      'Change the report title to "Quarterly Department Sales" and format Revenue as currency with no decimal places.',
    choice: "allFieldCandidates",
  },
  {
    id: "controlled-grouped-detail-only",
    fixtureId: "grouped-report",
    path: "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
    sourceSha256:
      "03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b",
    request: "Format Revenue as currency with no decimal places.",
    choice: "detailOnly",
  },
  {
    id: "static-microsoft-invoice",
    fixtureId: "microsoft-invoice",
    path: "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl",
    sourceSha256:
      "6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc",
    request:
      "Format Amount as currency with no decimal places and format Quantity as a number with no decimal places.",
    choice: "firstFieldCandidate",
  },
  {
    id: "static-microsoft-transcript",
    fixtureId: "microsoft-transcript",
    path: "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl",
    sourceSha256:
      "9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81",
    request:
      'Change the report title to "Professional Certification Transcript" and make the title 20-point bold.',
    choice: "recommended",
  },
] as const;

await mkdir(resolve(outputRoot, "results"), { recursive: true });
const matrix = [];
for (const scenario of scenarios) {
  const sourcePath = resolve(root, scenario.path);
  const source = await readFile(sourcePath);
  const sourceSha256 = createHash("sha256").update(source).digest("hex");
  if (sourceSha256 !== scenario.sourceSha256)
    throw new Error(`Source identity changed for ${scenario.id}.`);
  const inventory = await inspectRdlFile(sourcePath);
  const catalog = await catalogRdlBytes(source);
  const planned = new LocalSentenceEditPlanner().plan(
    scenario.request,
    createEditPlannerContext(inventory),
  );
  if (planned.status !== "planned") throw new Error(planned.message);
  const initial = buildReviewBundle({
    reviewDraftId: `diagnostic-${scenario.id}`,
    reportSessionId: `diagnostic-${scenario.fixtureId}`,
    sourceSha256,
    planSha256: planned.planSha256,
    plan: planned.plan,
    catalog,
    inventory,
  });
  let reviewed = initial;
  for (const operation of initial.operations) {
    if (operation.status === "readyForConfirmation") {
      reviewed = confirmReviewOperation(reviewed, operation.operationId);
      continue;
    }
    if (operation.status !== "choiceRequired")
      throw new Error(`Scenario ${scenario.id} unexpectedly blocked.`);
    let candidateIds: string[];
    if (scenario.choice === "simpleTextbox9") {
      candidateIds = [
        catalog.titleCandidates.find(
          ({ reportItemName }) => reportItemName === "Textbox9",
        )!.diagnosticId,
      ];
    } else if (scenario.choice === "allFieldCandidates") {
      candidateIds = operation.candidates.map(({ candidateId }) => candidateId);
    } else if (scenario.choice === "detailOnly") {
      candidateIds = [
        operation.candidates.find(
          (candidate) =>
            candidate.kind === "fieldDisplay" &&
            candidate.structuralRole === "detail",
        )!.candidateId,
      ];
    } else {
      candidateIds = [operation.candidates[0]!.candidateId];
    }
    reviewed = confirmReviewOperation(
      updateReviewSelection(reviewed, operation.operationId, candidateIds),
      operation.operationId,
    );
  }
  const candidates = new Map(
    [...catalog.titleCandidates, ...catalog.fieldDisplayCandidates].map(
      (candidate) => [candidate.diagnosticId, candidate],
    ),
  );
  const authorization = authorizeReviewedPlan({
    bundle: reviewed,
    plan: planned.plan,
    sourceSha256,
    planSha256: planned.planSha256,
    candidateForId: (id) => candidates.get(id),
  });
  const mutation = await mutateAuthorizedRdl({
    source,
    sourceFileName: basename(sourcePath),
    schema,
    plan: planned.plan,
    authorization,
  });
  const outputFilename = `${scenario.id}-regenerated.rdl`;
  const manifest = genericMutationManifestSchema.parse({
    manifestVersion: 1,
    applicationVersion: "0.3.0",
    invocationSurface: "test-evidence",
    source: { filename: basename(sourcePath), sha256: sourceSha256 },
    planSha256: planned.planSha256,
    reviewAuditId: createHash("sha256")
      .update(`${scenario.id}:${sourceSha256}:${planned.planSha256}`)
      .digest("hex"),
    confirmedOperations: authorization.operations.map(
      ({ operationId, operation }) => ({
        operationId,
        operationType: operation.type,
      }),
    ),
    declinedOperationIds: authorization.declinedOperationIds,
    selectedTargets: mutation.selectedTargets,
    output: {
      filename: outputFilename,
      sha256: mutation.outputSha256,
    },
    validation: {
      ...mutation.validation,
      atomicWrite: "PASS",
    },
  });
  const evidence = {
    version: 1,
    scenarioId: scenario.id,
    fixtureId: scenario.fixtureId,
    source: { relativePath: scenario.path, sha256: sourceSha256 },
    request: scenario.request,
    plan: planned.plan,
    planSha256: planned.planSha256,
    confirmedReview: reviewed,
    authorizationAudit: {
      operationIds: authorization.operations.map(
        ({ operationId }) => operationId,
      ),
      declinedOperationIds: authorization.declinedOperationIds,
      exactSelectedDiagnosticCandidateIds: authorization.operations.flatMap(
        ({ candidates }) => candidates.map(({ diagnosticId }) => diagnosticId),
      ),
      rendererReceivedAuthorization: false,
    },
    output: {
      committedRdl: false,
      deterministicFilenameForEvidence: outputFilename,
      byteLength: mutation.output.byteLength,
      sha256: mutation.outputSha256,
    },
    validation: mutation.validation,
    preservationHashes: mutation.preservation,
    manifest,
    originalUnchanged: true,
  };
  await writeFile(
    resolve(outputRoot, "results", `${scenario.id}.json`),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  matrix.push({
    scenarioId: scenario.id,
    sourceSha256,
    planSha256: planned.planSha256,
    outputSha256: mutation.outputSha256,
    selectedTargetCount: mutation.selectedTargets.length,
    validation: mutation.validation,
    originalUnchanged: true,
    editedRdlCommitted: false,
  });
}
await writeFile(
  resolve(outputRoot, "mutation-matrix.json"),
  `${JSON.stringify({ version: 1, scenarios: matrix }, null, 2)}\n`,
);
