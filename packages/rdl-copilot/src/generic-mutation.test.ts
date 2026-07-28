import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  authorizeReviewedPlan,
  GenericMutationError,
  mutateAuthorizedRdl,
} from "./generic-mutation";
import {
  buildReviewBundle,
  confirmReviewOperation,
  declineReviewOperation,
  updateReviewSelection,
} from "./operation-review";
import {
  createEditPlannerContext,
  LocalSentenceEditPlanner,
} from "./edit-planner";
import { inspectRdlBytes, inspectRdlFile } from "./inspection";
import { catalogRdlBytes } from "./target-context";
import { editPlanSchema } from "./edit-plan";

const root = resolve(import.meta.dirname, "../../..");
const schemaPath = resolve(
  root,
  "packages/rdl-spike/schema/ReportDefinition-2016.xsd",
);
const fixtures = {
  simple: {
    path: "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
    sha: "e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3",
  },
  grouped: {
    path: "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
    sha: "03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b",
  },
  invoice: {
    path: "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl",
    sha: "6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc",
  },
  transcript: {
    path: "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl",
    sha: "9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81",
  },
} as const;

const prepare = async (key: keyof typeof fixtures, request: string) => {
  const fixture = fixtures[key];
  const path = resolve(root, fixture.path);
  const source = await readFile(path);
  const schema = await readFile(schemaPath);
  const inventory = await inspectRdlFile(path);
  const catalog = await catalogRdlBytes(source);
  const planned = new LocalSentenceEditPlanner().plan(
    request,
    createEditPlannerContext(inventory),
  );
  if (planned.status !== "planned") throw new Error(planned.message);
  const bundle = buildReviewBundle({
    reviewDraftId: "review",
    reportSessionId: "session",
    sourceSha256: fixture.sha,
    planSha256: planned.planSha256,
    plan: planned.plan,
    catalog,
    inventory,
  });
  const candidates = new Map(
    [...catalog.titleCandidates, ...catalog.fieldDisplayCandidates].map(
      (candidate) => [candidate.diagnosticId, candidate],
    ),
  );
  return { source, schema, inventory, catalog, planned, bundle, candidates };
};

const authorize = (
  prepared: Awaited<ReturnType<typeof prepare>>,
  bundle: typeof prepared.bundle,
) =>
  authorizeReviewedPlan({
    bundle,
    plan: prepared.planned.plan,
    sourceSha256: prepared.bundle.sourceSha256,
    planSha256: prepared.planned.planSha256,
    candidateForId: (id) => prepared.candidates.get(id),
  });

describe("review-bound generic mutation", () => {
  it("rejects incomplete and blocked reviews", async () => {
    const incomplete = await prepare(
      "grouped",
      "Format Revenue as currency with no decimal places.",
    );
    expect(() => authorize(incomplete, incomplete.bundle)).toThrowError(
      new GenericMutationError(
        "REVIEW_INCOMPLETE",
        "Every operation must be explicitly confirmed or declined.",
      ),
    );
    const blocked = await prepare("simple", "Switch the page to landscape.");
    expect(() => authorize(blocked, blocked.bundle)).toThrowError(
      /blocked operation/u,
    );
  });

  it("mutates only reviewed simple title and UnitCost candidates", async () => {
    const prepared = await prepare(
      "simple",
      'Change the report title to "Quarterly Inventory Detail", make the title 20-point bold, and format UnitCost as currency with no decimal places.',
    );
    const textbox9 = prepared.catalog.titleCandidates.find(
      ({ reportItemName }) => reportItemName === "Textbox9",
    )!;
    let reviewed = prepared.bundle;
    for (const operation of prepared.bundle.operations) {
      if (operation.status === "choiceRequired")
        reviewed = confirmReviewOperation(
          updateReviewSelection(reviewed, operation.operationId, [
            textbox9.diagnosticId,
          ]),
          operation.operationId,
        );
      else if (operation.status === "readyForConfirmation")
        reviewed = confirmReviewOperation(reviewed, operation.operationId);
    }
    const result = await mutateAuthorizedRdl({
      source: prepared.source,
      sourceFileName: "simple.rdl",
      schema: prepared.schema,
      plan: prepared.planned.plan,
      authorization: authorize(prepared, reviewed),
    });
    const output = await inspectRdlBytes(result.output, "simple.rdl");
    const title = output.textboxes.find(({ name }) => name === "Textbox9")!;
    expect(title.staticText).toContain("Quarterly Inventory Detail");
    expect(title.fontSizes).toContain("20pt");
    expect(title.fontWeights).toContain("Bold");
    expect(
      output.textboxes
        .find(({ name }) => name === "DetailUnitCose")
        ?.fieldBindings.find(({ fieldName }) => fieldName === "UnitCost")
        ?.format,
    ).toBe("C0");
    expect(
      output.textboxes.find(({ name }) => name === "ReportTitle")?.staticText,
    ).toEqual(
      prepared.inventory.textboxes.find(({ name }) => name === "ReportTitle")
        ?.staticText,
    );
    expect(result.validation).toMatchObject({ xmlParse: "PASS", xsd: "PASS" });
  });

  it("supports grouped all-three and detail-only exact formatting", async () => {
    const prepared = await prepare(
      "grouped",
      'Change the report title to "Quarterly Department Sales" and format Revenue as currency with no decimal places.',
    );
    const titleOperation = prepared.bundle.operations[0]!;
    const fieldOperation = prepared.bundle.operations[1]!;
    if (
      titleOperation.status !== "readyForConfirmation" ||
      fieldOperation.status !== "choiceRequired"
    )
      throw new Error("Unexpected review states.");
    const titleConfirmed = confirmReviewOperation(
      prepared.bundle,
      titleOperation.operationId,
    );
    for (const selectedIds of [
      fieldOperation.candidates.map(({ candidateId }) => candidateId),
      [
        fieldOperation.candidates.find(
          (candidate) =>
            candidate.kind === "fieldDisplay" &&
            candidate.structuralRole === "detail",
        )!.candidateId,
      ],
    ]) {
      const reviewed = confirmReviewOperation(
        updateReviewSelection(
          titleConfirmed,
          fieldOperation.operationId,
          selectedIds,
        ),
        fieldOperation.operationId,
      );
      const result = await mutateAuthorizedRdl({
        source: prepared.source,
        sourceFileName: "grouped.rdl",
        schema: prepared.schema,
        plan: prepared.planned.plan,
        authorization: authorize(prepared, reviewed),
      });
      const output = await inspectRdlBytes(result.output, "grouped.rdl");
      const formats = output.textboxes
        .flatMap(({ fieldBindings }) => fieldBindings)
        .filter(({ fieldName }) => fieldName === "Revenue")
        .map(({ format }) => format);
      expect(formats.filter((format) => format === "C0")).toHaveLength(
        selectedIds.length,
      );
      expect(result.selectedTargets).toHaveLength(1 + selectedIds.length);
    }
  });

  it("mutates one Invoice Amount location and resolved Quantity without query execution", async () => {
    for (const [request, expectedFormat] of [
      ["Format Amount as currency with no decimal places.", "C0"],
      ["Format Quantity as a number with no decimal places.", "N0"],
    ] as const) {
      const prepared = await prepare("invoice", request);
      const operation = prepared.bundle.operations[0]!;
      const reviewed =
        operation.status === "choiceRequired"
          ? confirmReviewOperation(
              updateReviewSelection(prepared.bundle, operation.operationId, [
                operation.candidates[0]!.candidateId,
              ]),
              operation.operationId,
            )
          : confirmReviewOperation(prepared.bundle, operation.operationId);
      const authorization = authorize(prepared, reviewed);
      const result = await mutateAuthorizedRdl({
        source: prepared.source,
        sourceFileName: "Invoice.rdl",
        schema: prepared.schema,
        plan: prepared.planned.plan,
        authorization,
      });
      const output = await inspectRdlBytes(result.output, "Invoice.rdl");
      const fieldName = request.includes("Amount") ? "Amount" : "Quantity";
      const changed = output.textboxes
        .flatMap(({ fieldBindings }) => fieldBindings)
        .filter(
          ({ fieldName: name, format }) =>
            name === fieldName && format === expectedFormat,
        );
      expect(changed).toHaveLength(1);
    }
  });

  it("mutates a page-header constant title safely and preserves Transcript images", async () => {
    const prepared = await prepare(
      "transcript",
      'Change the report title to "Professional Certification Transcript" and make the title 20-point bold.',
    );
    let reviewed = prepared.bundle;
    for (const operation of prepared.bundle.operations)
      reviewed = confirmReviewOperation(reviewed, operation.operationId);
    const result = await mutateAuthorizedRdl({
      source: prepared.source,
      sourceFileName: "Transcript.rdl",
      schema: prepared.schema,
      plan: prepared.planned.plan,
      authorization: authorize(prepared, reviewed),
    });
    const outputText = result.output.toString("utf8");
    expect(outputText).toContain('="Professional Certification Transcript"');
    expect(outputText).toContain("<FontSize>20pt</FontSize>");
    const output = await inspectRdlBytes(result.output, "Transcript.rdl");
    expect(output.images).toEqual(prepared.inventory.images);
    expect(result.validation.xsd).toBe("PASS");
  });

  it("escapes quotes in a reviewed constant-string title expression", async () => {
    const prepared = await prepare(
      "transcript",
      'Change the report title to "Professional Certification Transcript".',
    );
    const plan = editPlanSchema.parse({
      version: 1,
      operations: [
        {
          type: "setText",
          target: { kind: "reportItem", semanticRole: "reportTitle" },
          value: 'Professional "Certification" Transcript',
        },
      ],
    });
    const planSha256 = createHash("sha256")
      .update(JSON.stringify(plan), "utf8")
      .digest("hex");
    const initial = buildReviewBundle({
      reviewDraftId: "review-quotes",
      reportSessionId: "session",
      sourceSha256: prepared.bundle.sourceSha256,
      planSha256,
      plan,
      catalog: prepared.catalog,
      inventory: prepared.inventory,
    });
    const reviewed = confirmReviewOperation(
      initial,
      initial.operations[0]!.operationId,
    );
    const authorization = authorizeReviewedPlan({
      bundle: reviewed,
      plan,
      sourceSha256: prepared.bundle.sourceSha256,
      planSha256,
      candidateForId: (id) => prepared.candidates.get(id),
    });
    const result = await mutateAuthorizedRdl({
      source: prepared.source,
      sourceFileName: "Transcript.rdl",
      schema: prepared.schema,
      plan,
      authorization,
    });
    expect(result.output.toString("utf8")).toContain(
      '="Professional ""Certification"" Transcript"',
    );
  });

  it("excludes explicitly declined operations from authorization", async () => {
    const prepared = await prepare(
      "grouped",
      'Change the report title to "Quarterly Department Sales" and format Revenue as currency with no decimal places.',
    );
    let reviewed = prepared.bundle;
    reviewed = declineReviewOperation(
      reviewed,
      reviewed.operations[0]!.operationId,
    );
    const field = reviewed.operations[1]!;
    if (field.status !== "choiceRequired") throw new Error("choice");
    reviewed = confirmReviewOperation(
      updateReviewSelection(
        reviewed,
        field.operationId,
        field.candidates.map(({ candidateId }) => candidateId),
      ),
      field.operationId,
    );
    const authorization = authorize(prepared, reviewed);
    expect(authorization.operations).toHaveLength(1);
    expect(authorization.declinedOperationIds).toHaveLength(1);
  });
});
import { createHash } from "node:crypto";
