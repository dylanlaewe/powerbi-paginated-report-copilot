import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildReviewBundle,
  confirmReviewOperation,
  createEditPlannerContext,
  inspectRdlFile,
  LocalSentenceEditPlanner,
  resetReviewOperation,
  updateReviewSelection,
} from "../packages/rdl-copilot/src/index";
import { catalogRdlBytes } from "../packages/rdl-copilot/src/target-context";

const root = resolve(import.meta.dirname, "..");
const output = resolve(
  root,
  "examples/rdl-structure-corpus/review-workflow-v0.3",
);
const fixtures = [
  {
    id: "simple-table",
    path: "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
    sha256: "e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3",
    requests: [
      'Change the report title to "Quarterly Inventory Detail", make the title 20-point bold, switch the page to landscape, and format UnitCost as currency with no decimal places.',
    ],
  },
  {
    id: "grouped-report",
    path: "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
    sha256: "03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b",
    requests: [
      'Change the report title to "Quarterly Department Sales", switch the page to landscape, and format Revenue as currency with no decimal places.',
    ],
  },
  {
    id: "microsoft-invoice",
    path: "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl",
    sha256: "6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc",
    requests: [
      "Format Amount as currency with no decimal places.",
      "Format Quantity as a number with no decimal places.",
    ],
  },
  {
    id: "microsoft-transcript",
    path: "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl",
    sha256: "9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81",
    requests: [
      'Change the report title to "Professional Certification Transcript" and make the title 20-point bold.',
      "Format Name as a number with no decimal places.",
    ],
  },
] as const;

await mkdir(resolve(output, "fixtures"), { recursive: true });
const matrix = [];
for (const fixture of fixtures) {
  const absolute = resolve(root, fixture.path);
  const source = await readFile(absolute);
  const actualSha = createHash("sha256").update(source).digest("hex");
  if (actualSha !== fixture.sha256)
    throw new Error(`Source identity changed for ${fixture.id}.`);
  const inventory = await inspectRdlFile(absolute);
  const catalog = await catalogRdlBytes(source);
  const scenarios = [];
  for (const [scenarioIndex, request] of fixture.requests.entries()) {
    const planned = new LocalSentenceEditPlanner().plan(
      request,
      createEditPlannerContext(inventory),
    );
    if (planned.status !== "planned") throw new Error(planned.message);
    const initial = buildReviewBundle({
      reviewDraftId: `diagnostic-${fixture.id}-${scenarioIndex + 1}`,
      reportSessionId: `diagnostic-${fixture.id}`,
      sourceSha256: fixture.sha256,
      planSha256: planned.planSha256,
      plan: planned.plan,
      catalog,
      inventory,
    });
    let simulated = initial;
    const decisions = [];
    for (const operation of initial.operations) {
      if (operation.status === "readyForConfirmation") {
        simulated = confirmReviewOperation(simulated, operation.operationId);
        decisions.push({
          operationId: operation.operationId,
          action: "confirmRecommendedCandidate",
          candidateIds: [operation.recommendedCandidate.candidateId],
        });
      } else if (operation.status === "choiceRequired") {
        let ids: string[];
        if (
          fixture.id === "simple-table" &&
          operation.operationType !== "setNumberFormat"
        ) {
          const textbox9 = catalog.titleCandidates.find(
            ({ reportItemName }) => reportItemName === "Textbox9",
          );
          if (!textbox9) throw new Error("Textbox9 diagnostic missing.");
          ids = [textbox9.diagnosticId];
        } else {
          ids = [operation.candidates[0]!.candidateId];
        }
        simulated = updateReviewSelection(
          simulated,
          operation.operationId,
          ids,
        );
        simulated = confirmReviewOperation(simulated, operation.operationId);
        decisions.push({
          operationId: operation.operationId,
          action: "selectExactCandidatesAndConfirm",
          candidateIds: ids,
        });
      }
    }
    const alternativeSimulations =
      fixture.id === "grouped-report"
        ? initial.operations
            .filter(
              (operation) =>
                operation.status === "choiceRequired" &&
                operation.operationType === "setNumberFormat",
            )
            .map((operation) => {
              if (operation.status !== "choiceRequired")
                throw new Error("Unexpected state.");
              const allIds = operation.candidates.map(
                ({ candidateId }) => candidateId,
              );
              const detailId = operation.candidates.find(
                (candidate) =>
                  candidate.kind === "fieldDisplay" &&
                  candidate.structuralRole === "detail",
              )!.candidateId;
              return {
                operationId: operation.operationId,
                detailOnly: confirmReviewOperation(
                  updateReviewSelection(initial, operation.operationId, [
                    detailId,
                  ]),
                  operation.operationId,
                ).operations.find(
                  ({ operationId }) => operationId === operation.operationId,
                ),
                allThree: confirmReviewOperation(
                  updateReviewSelection(initial, operation.operationId, allIds),
                  operation.operationId,
                ).operations.find(
                  ({ operationId }) => operationId === operation.operationId,
                ),
              };
            })
        : [];
    scenarios.push({
      request,
      plan: planned.plan,
      planSha256: planned.planSha256,
      operationIds: initial.operations.map(({ operationId }) => operationId),
      initial,
      decisions,
      final: simulated,
      alternativeSimulations,
      resetProof: simulated.operations
        .filter(({ status }) => status === "confirmed")
        .slice(0, 1)
        .map(({ operationId }) =>
          resetReviewOperation(simulated, initial, operationId).operations.find(
            ({ operationId: id }) => id === operationId,
          ),
        ),
    });
  }
  const artifact = {
    version: 1,
    fixtureId: fixture.id,
    source: { relativePath: fixture.path, sha256: fixture.sha256 },
    scenarios,
    mutationAuthorized: false,
    mutationTargetCreated: false,
    editedRdlGenerated: false,
  };
  await writeFile(
    resolve(output, "fixtures", `${fixture.id}.json`),
    `${JSON.stringify(artifact, null, 2)}\n`,
  );
  matrix.push({
    fixtureId: fixture.id,
    sourceSha256: fixture.sha256,
    scenarios: scenarios.map(({ planSha256, initial, final }) => ({
      planSha256,
      initialState: initial.state,
      initialOperationStates: initial.operations.map(
        ({ operationType, status }) => ({ operationType, status }),
      ),
      finalState: final.state,
      mutationAuthorized: false,
      executable: false,
    })),
  });
}
await writeFile(
  resolve(output, "review-matrix.json"),
  `${JSON.stringify({ version: 1, fixtures: matrix }, null, 2)}\n`,
);
import { createHash } from "node:crypto";
