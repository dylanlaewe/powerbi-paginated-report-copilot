import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildReviewBundle,
  confirmReviewOperation,
  declineReviewOperation,
  operationIdFor,
  operationReviewSchema,
  resetReviewOperation,
  reviewBundleSchema,
  updateReviewSelection,
} from "./operation-review";
import {
  LocalSentenceEditPlanner,
  createEditPlannerContext,
} from "./edit-planner";
import { catalogRdlBytes } from "./target-context";
import { inspectRdlFile } from "./inspection";

const root = resolve(import.meta.dirname, "../../..");
const fixtures = {
  simple:
    "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
  grouped:
    "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
  invoice:
    "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl",
  transcript:
    "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl",
} as const;
const hashes = {
  simple: "e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3",
  grouped: "03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b",
  invoice: "6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc",
  transcript:
    "9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81",
} as const;

const create = async (key: keyof typeof fixtures, request: string) => {
  const path = resolve(root, fixtures[key]);
  const inventory = await inspectRdlFile(path);
  const catalog = await catalogRdlBytes(await readFile(path));
  const planned = new LocalSentenceEditPlanner().plan(
    request,
    createEditPlannerContext(inventory),
  );
  if (planned.status !== "planned") throw new Error(planned.message);
  return {
    catalog,
    inventory,
    plan: planned.plan,
    bundle: buildReviewBundle({
      reviewDraftId: "diagnostic-review",
      reportSessionId: "diagnostic-session",
      sourceSha256: hashes[key],
      planSha256: planned.planSha256,
      plan: planned.plan,
      catalog,
      inventory,
    }),
  };
};

describe("operation-level read-only review", () => {
  it("runtime-validates every state and permanently denies mutation", () => {
    for (const status of [
      "readyForConfirmation",
      "choiceRequired",
      "blocked",
      "confirmed",
      "declined",
    ] as const) {
      const common = {
        operationId: "a".repeat(24),
        operationType: "setText" as const,
        requestedChange: "Change title.",
        mutationAuthorized: false as const,
      };
      const candidate = {
        kind: "title" as const,
        candidateId: "candidate",
        visibleText: "Title",
        region: "body" as const,
        score: 100,
        evidence: [],
        ambiguityEvidence: [],
      };
      const value =
        status === "readyForConfirmation"
          ? {
              ...common,
              status,
              recommendedCandidate: candidate,
              alternatives: [],
              selectionPolicy: "exactlyOne" as const,
              selectedCandidateIds: [],
              confirmed: false as const,
            }
          : status === "choiceRequired"
            ? {
                ...common,
                status,
                candidates: [candidate],
                selectionPolicy: "exactlyOne" as const,
                selectedCandidateIds: [],
                confirmed: false as const,
              }
            : status === "blocked"
              ? { ...common, status, reason: "BLOCKED", message: "Blocked." }
              : status === "confirmed"
                ? {
                    ...common,
                    status,
                    selectedCandidateIds: ["candidate"],
                    confirmationSummary: "Reviewed.",
                  }
                : { ...common, status };
      expect(operationReviewSchema.parse(value)).toEqual(value);
      expect(() =>
        operationReviewSchema.parse({ ...value, mutationAuthorized: true }),
      ).toThrow();
    }
  });

  it("creates deterministic operation IDs bound to plan, index, and operation", async () => {
    const { bundle, plan } = await create(
      "grouped",
      'Change the report title to "Quarterly Department Sales", switch the page to landscape, and format Revenue as currency with no decimal places.',
    );
    expect(bundle.operations.map(({ operationId }) => operationId)).toEqual(
      plan.operations.map((operation, index) =>
        operationIdFor(bundle.planSha256, index, operation),
      ),
    );
    expect(
      new Set(bundle.operations.map(({ operationId }) => operationId)).size,
    ).toBe(bundle.operations.length);
  });

  it("keeps simple title operations independent, orientation blocked, and UnitCost unconfirmed", async () => {
    const { bundle } = await create(
      "simple",
      'Change the report title to "Quarterly Inventory Detail", make the title 20-point bold, switch the page to landscape, and format UnitCost as currency with no decimal places.',
    );
    expect(bundle.operations.map(({ status }) => status)).toEqual([
      "choiceRequired",
      "choiceRequired",
      "blocked",
      "readyForConfirmation",
    ]);
    expect(bundle.operations[0]).toMatchObject({
      selectionPolicy: "exactlyOne",
      selectedCandidateIds: [],
    });
    expect(bundle.operations[1]?.operationId).not.toBe(
      bundle.operations[0]?.operationId,
    );
    expect(bundle.operations[2]).toMatchObject({
      reason: "PAGE_DIMENSIONS_UNSPECIFIED",
    });
    expect(bundle.state).toBe("blocked");
    expect(bundle.mutationAuthorized).toBe(false);
    expect(bundle.executable).toBe(false);
  });

  it("requires explicit title confirmation and exact selection", async () => {
    const { bundle } = await create(
      "simple",
      'Change the report title to "Quarterly Inventory Detail".',
    );
    const operation = bundle.operations[0]!;
    expect(() => confirmReviewOperation(bundle, operation.operationId)).toThrow(
      "SELECTION_REQUIRED",
    );
    if (operation.status !== "choiceRequired") throw new Error("choice");
    expect(() =>
      updateReviewSelection(
        bundle,
        operation.operationId,
        operation.candidates.map(({ candidateId }) => candidateId),
      ),
    ).toThrow("EXACTLY_ONE_REQUIRED");
    const selected = updateReviewSelection(bundle, operation.operationId, [
      operation.candidates[0]!.candidateId,
    ]);
    expect(
      confirmReviewOperation(selected, operation.operationId),
    ).toMatchObject({
      state: "fullyReviewed",
      mutationAuthorized: false,
      executable: false,
    });
  });

  it("supports grouped Revenue detail-only and all-three exact choices", async () => {
    const { bundle } = await create(
      "grouped",
      "Format Revenue as currency with no decimal places.",
    );
    const operation = bundle.operations[0]!;
    expect(operation).toMatchObject({
      status: "choiceRequired",
      selectionPolicy: "oneOrMore",
    });
    if (operation.status !== "choiceRequired") throw new Error("choice");
    expect(operation.candidates.map(({ kind }) => kind)).toEqual([
      "fieldDisplay",
      "fieldDisplay",
      "fieldDisplay",
    ]);
    expect(
      operation.candidates.map((candidate) =>
        candidate.kind === "fieldDisplay" ? candidate.structuralRole : "",
      ),
    ).toEqual(["detail", "groupSubtotal", "grandTotal"]);
    for (const ids of [
      [operation.candidates[0]!.candidateId],
      operation.candidates.map(({ candidateId }) => candidateId),
    ]) {
      const reviewed = confirmReviewOperation(
        updateReviewSelection(bundle, operation.operationId, ids),
        operation.operationId,
      );
      expect(reviewed).toMatchObject({
        state: "fullyReviewed",
        mutationAuthorized: false,
        executable: false,
      });
    }
  });

  it("keeps Invoice locations distinct and Quantity confirmation explicit", async () => {
    const amount = await create(
      "invoice",
      "Format Amount as currency with no decimal places.",
    );
    const amountOperation = amount.bundle.operations[0]!;
    expect(amountOperation).toMatchObject({
      status: "choiceRequired",
      selectionPolicy: "oneOrMore",
    });
    if (amountOperation.status !== "choiceRequired") throw new Error("choice");
    expect(
      new Set(
        amountOperation.candidates.map((candidate) =>
          candidate.kind === "fieldDisplay" ? candidate.tablixName : null,
        ),
      ).size,
    ).toBe(2);
    const quantity = await create(
      "invoice",
      "Format Quantity as a number with no decimal places.",
    );
    expect(quantity.bundle.operations[0]).toMatchObject({
      status: "readyForConfirmation",
      selectedCandidateIds: [],
      confirmed: false,
    });
  });

  it("shows Transcript dataset ambiguity and independent title confirmations", async () => {
    const title = await create(
      "transcript",
      'Change the report title to "Professional Certification Transcript" and make the title 20-point bold.',
    );
    expect(title.bundle.operations.map(({ status }) => status)).toEqual([
      "readyForConfirmation",
      "readyForConfirmation",
    ]);
    const name = await create(
      "transcript",
      "Format Name as a number with no decimal places.",
    );
    const operation = name.bundle.operations[0]!;
    expect(operation.status).toBe("choiceRequired");
    if (operation.status !== "choiceRequired") throw new Error("choice");
    expect(operation.candidates[0]).toMatchObject({
      kind: "fieldDisplay",
      possibleDatasets: ["Certification", "Users"],
    });
  });

  it("rejects duplicate, empty, stale, foreign, and cross-operation selections", async () => {
    const { bundle } = await create(
      "grouped",
      "Format Revenue as currency with no decimal places.",
    );
    const operation = bundle.operations[0]!;
    if (operation.status !== "choiceRequired") throw new Error("choice");
    const id = operation.candidates[0]!.candidateId;
    expect(() =>
      updateReviewSelection(bundle, operation.operationId, []),
    ).toThrow("EMPTY_SELECTION");
    expect(() =>
      updateReviewSelection(bundle, operation.operationId, [id, id]),
    ).toThrow("DUPLICATE_CANDIDATE_ID");
    expect(() =>
      updateReviewSelection(bundle, operation.operationId, ["stale"]),
    ).toThrow("CANDIDATE_NOT_ALLOWED");
    expect(() => updateReviewSelection(bundle, "f".repeat(24), [id])).toThrow(
      "OPERATION_NOT_FOUND",
    );
  });

  it("enforces decline then explicit reset and never confirms blocked operations", async () => {
    const { bundle } = await create("simple", "Switch the page to landscape.");
    const operation = bundle.operations[0]!;
    expect(() => confirmReviewOperation(bundle, operation.operationId)).toThrow(
      "OPERATION_NOT_CONFIRMABLE",
    );
    const declined = declineReviewOperation(bundle, operation.operationId);
    expect(declined.operations[0]?.status).toBe("declined");
    expect(() =>
      confirmReviewOperation(declined, operation.operationId),
    ).toThrow("OPERATION_NOT_CONFIRMABLE");
    expect(
      resetReviewOperation(declined, bundle, operation.operationId)
        .operations[0]?.status,
    ).toBe("blocked");
  });

  it("rejects writable, path, XML, and mutation fields from renderer bundles", async () => {
    const { bundle } = await create(
      "grouped",
      'Change the report title to "Quarterly Department Sales".',
    );
    expect(JSON.stringify(bundle)).not.toMatch(
      /<Report|sourcePath|structuralPath|reportItemName|writableTarget/iu,
    );
    for (const forbidden of [
      { mutationAuthorized: true },
      { sourcePath: "/private/report.rdl" },
      { rawXml: "<Report />" },
      { writableTarget: {} },
    ])
      expect(() =>
        reviewBundleSchema.parse({ ...bundle, ...forbidden }),
      ).toThrow();
  });
});
