import { createHash } from "node:crypto";
import { z } from "zod";
import type { EditOperation, EditPlan } from "./edit-plan";
import {
  rankFieldDisplayCandidates,
  resolveReadOnlyFieldDisplay,
  type RankedFieldDisplayCandidate,
} from "./field-resolution";
import type { RdlInventory } from "./inspection";
import {
  rankTitleCandidates,
  resolveReadOnlyReportTitle,
  type RankedTitleCandidate,
} from "./title-resolution";
import type { TargetCandidateCatalog } from "./target-context";

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const evidenceSchema = z
  .object({ code: z.string(), message: z.string() })
  .strict();
const titleEvidenceSchema = z
  .object({
    code: z.string(),
    weight: z.number().int(),
    message: z.string(),
  })
  .strict();

export const reviewCandidateSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("title"),
      candidateId: z.string().min(1),
      visibleText: z.string(),
      region: z.enum(["body", "pageHeader", "pageFooter"]),
      score: z.number().int(),
      evidence: z.array(titleEvidenceSchema),
      ambiguityEvidence: z.array(titleEvidenceSchema),
    })
    .strict(),
  z
    .object({
      kind: z.literal("fieldDisplay"),
      candidateId: z.string().min(1),
      fieldName: z.string(),
      datasetName: z.string().nullable(),
      possibleDatasets: z.array(z.string()),
      region: z.enum(["body", "pageHeader", "pageFooter"]),
      tablixName: z.string().nullable(),
      structuralRole: z.string(),
      expressionKind: z.enum(["directFieldReference", "aggregateExpression"]),
      currentFormat: z.string().nullable(),
      evidence: z.array(evidenceSchema),
      ambiguityEvidence: z.array(evidenceSchema),
    })
    .strict(),
]);
export type ReviewCandidate = z.infer<typeof reviewCandidateSchema>;

const baseOperation = {
  operationId: z.string().regex(/^[a-f0-9]{24}$/u),
  operationType: z.enum([
    "setText",
    "setTextStyle",
    "setPageOrientation",
    "setNumberFormat",
  ]),
  requestedChange: z.string().min(1),
  mutationAuthorized: z.literal(false),
};
export const operationReviewSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("readyForConfirmation"),
      ...baseOperation,
      recommendedCandidate: reviewCandidateSchema,
      alternatives: z.array(reviewCandidateSchema),
      selectionPolicy: z.literal("exactlyOne"),
      selectedCandidateIds: z.array(z.string()).max(0),
      confirmed: z.literal(false),
    })
    .strict(),
  z
    .object({
      status: z.literal("choiceRequired"),
      ...baseOperation,
      candidates: z.array(reviewCandidateSchema).min(1),
      selectionPolicy: z.enum(["exactlyOne", "oneOrMore"]),
      selectedCandidateIds: z.array(z.string()),
      confirmed: z.literal(false),
    })
    .strict(),
  z
    .object({
      status: z.literal("blocked"),
      ...baseOperation,
      reason: z.string().min(1),
      message: z.string().min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("confirmed"),
      ...baseOperation,
      selectedCandidateIds: z.array(z.string()).min(1),
      confirmationSummary: z.string().min(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("declined"),
      ...baseOperation,
    })
    .strict(),
]);
export type OperationReview = z.infer<typeof operationReviewSchema>;

export const reviewBundleSchema = z
  .object({
    version: z.literal(1),
    reviewDraftId: z.string().min(1),
    reportSessionId: z.string().min(1),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    planSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    candidateCatalogVersion: z.literal(1),
    resolutionSummary: z
      .object({
        title: z
          .object({
            status: z.enum([
              "resolved",
              "ambiguous",
              "notFound",
              "unsupported",
            ]),
            reason: z.string(),
            mutationAuthorized: z.literal(false),
          })
          .strict(),
        fields: z.array(
          z
            .object({
              fieldName: z.string(),
              status: z.enum([
                "resolved",
                "ambiguous",
                "notFound",
                "unsupported",
              ]),
              reason: z.string(),
              mutationAuthorized: z.literal(false),
            })
            .strict(),
        ),
        pageOrientation: z
          .object({
            status: z.enum(["structurallyAvailable", "blocked"]),
            reason: z.string().nullable(),
            mutationAuthorized: z.literal(false),
          })
          .strict(),
      })
      .strict(),
    operations: z.array(operationReviewSchema).min(1),
    state: z.enum(["incomplete", "fullyReviewed", "blocked", "declined"]),
    mutationAuthorized: z.literal(false),
    executable: z.literal(false),
  })
  .strict();
export type ReviewBundle = z.infer<typeof reviewBundleSchema>;

const titleCandidate = (
  candidate: RankedTitleCandidate,
  mapId: (id: string) => string,
): ReviewCandidate =>
  reviewCandidateSchema.parse({
    kind: "title",
    candidateId: mapId(candidate.candidateId),
    visibleText: candidate.visibleText,
    region: candidate.region,
    score: candidate.score,
    evidence: candidate.evidence,
    ambiguityEvidence: candidate.negativeEvidence,
  });

const fieldCandidate = (
  candidate: RankedFieldDisplayCandidate,
  mapId: (id: string) => string,
): ReviewCandidate =>
  reviewCandidateSchema.parse({
    kind: "fieldDisplay",
    candidateId: mapId(candidate.candidateId),
    fieldName: candidate.fieldName,
    datasetName: candidate.datasetName,
    possibleDatasets: candidate.possibleDatasets,
    region: candidate.region,
    tablixName: candidate.tablixName,
    structuralRole: candidate.scopeRole,
    expressionKind: candidate.expressionKind,
    currentFormat: candidate.currentFormat,
    evidence: candidate.evidence,
    ambiguityEvidence: candidate.ambiguityEvidence,
  });

const requestedChange = (operation: EditOperation): string => {
  switch (operation.type) {
    case "setText":
      return `Change report title text to "${operation.value}".`;
    case "setTextStyle":
      return `Change report title style (${[
        operation.fontSize && `font size ${operation.fontSize}`,
        operation.fontWeight && `weight ${operation.fontWeight}`,
        operation.textAlign && `alignment ${operation.textAlign}`,
      ]
        .filter(Boolean)
        .join(", ")}).`;
    case "setPageOrientation":
      return `Change page orientation to ${operation.orientation}.`;
    case "setNumberFormat":
      return `Format ${operation.target.fieldName} as ${operation.format}.`;
  }
};

export const operationIdFor = (
  planSha256: string,
  index: number,
  operation: EditOperation,
): string =>
  sha256(JSON.stringify({ version: 1, planSha256, index, operation })).slice(
    0,
    24,
  );

const stateFor = (operations: OperationReview[]): ReviewBundle["state"] => {
  if (operations.some(({ status }) => status === "blocked")) return "blocked";
  if (
    operations.every(
      ({ status }) => status === "confirmed" || status === "declined",
    )
  )
    return operations.some(({ status }) => status === "declined")
      ? "declined"
      : "fullyReviewed";
  return "incomplete";
};

export const buildReviewBundle = (input: {
  reviewDraftId: string;
  reportSessionId: string;
  sourceSha256: string;
  planSha256: string;
  plan: EditPlan;
  catalog: TargetCandidateCatalog;
  inventory: RdlInventory;
  candidateId?: (diagnosticId: string) => string;
}): ReviewBundle => {
  const mapId = input.candidateId ?? ((id: string) => id);
  const titleResolution = resolveReadOnlyReportTitle(input.catalog);
  const rankedTitles = rankTitleCandidates(input.catalog);
  const fieldResolutions = [
    ...new Set(
      input.plan.operations.flatMap((operation) =>
        operation.type === "setNumberFormat"
          ? [operation.target.fieldName]
          : [],
      ),
    ),
  ].map((fieldName) =>
    resolveReadOnlyFieldDisplay(input.catalog, { fieldName }),
  );
  const section = input.inventory.reportSections[0];
  const pageDimensionsExplicit =
    section?.pageWidth.presence === "explicit" &&
    section.pageHeight.presence === "explicit";
  const operations: OperationReview[] = input.plan.operations.map(
    (operation, index) => {
      const base = {
        operationId: operationIdFor(input.planSha256, index, operation),
        operationType: operation.type,
        requestedChange: requestedChange(operation),
        mutationAuthorized: false as const,
      };
      if (operation.type === "setPageOrientation") {
        if (
          section?.pageWidth.presence !== "explicit" ||
          section.pageHeight.presence !== "explicit"
        )
          return operationReviewSchema.parse({
            ...base,
            status: "blocked",
            reason: "PAGE_DIMENSIONS_UNSPECIFIED",
            message:
              "The source omits explicit PageWidth or PageHeight, so deterministic orientation mutation cannot proceed.",
          });
        return operationReviewSchema.parse({
          ...base,
          status: "blocked",
          reason: "PAGE_TARGET_AUTHORIZATION_NOT_IMPLEMENTED",
          message:
            "Page orientation is structurally supported, but generic page-target authorization is not implemented.",
        });
      }
      if (operation.type === "setText" || operation.type === "setTextStyle") {
        if (titleResolution.status === "resolved") {
          const selected = rankedTitles.find(
            ({ candidateId }) => candidateId === titleResolution.candidateId,
          )!;
          return operationReviewSchema.parse({
            ...base,
            status: "readyForConfirmation",
            recommendedCandidate: titleCandidate(selected, mapId),
            alternatives: titleResolution.alternatives.map((candidate) =>
              titleCandidate(candidate, mapId),
            ),
            selectionPolicy: "exactlyOne",
            selectedCandidateIds: [],
            confirmed: false,
          });
        }
        if (titleResolution.status === "ambiguous")
          return operationReviewSchema.parse({
            ...base,
            status: "choiceRequired",
            candidates: titleResolution.candidates.map((candidate) =>
              titleCandidate(candidate, mapId),
            ),
            selectionPolicy: "exactlyOne",
            selectedCandidateIds: [],
            confirmed: false,
          });
        return operationReviewSchema.parse({
          ...base,
          status: "blocked",
          reason: titleResolution.reason,
          message: "No defensible title candidate is available for review.",
        });
      }
      const resolution = resolveReadOnlyFieldDisplay(input.catalog, {
        fieldName: operation.target.fieldName,
      });
      if (resolution.status === "resolved") {
        const ranked = resolveReadOnlyFieldDisplay(input.catalog, {
          fieldName: operation.target.fieldName,
        });
        if (ranked.status !== "resolved")
          throw new Error("Resolution changed.");
        const summary = fieldCandidate(
          requireRankedField(
            input.catalog,
            operation.target.fieldName,
            ranked.candidateId,
          )!,
          mapId,
        );
        return operationReviewSchema.parse({
          ...base,
          status: "readyForConfirmation",
          recommendedCandidate: summary,
          alternatives: [],
          selectionPolicy: "exactlyOne",
          selectedCandidateIds: [],
          confirmed: false,
        });
      }
      if (resolution.status === "ambiguous")
        return operationReviewSchema.parse({
          ...base,
          status: "choiceRequired",
          candidates: resolution.candidates.map((candidate) =>
            fieldCandidate(candidate, mapId),
          ),
          selectionPolicy: "oneOrMore",
          selectedCandidateIds: [],
          confirmed: false,
        });
      return operationReviewSchema.parse({
        ...base,
        status: "blocked",
        reason: resolution.reason,
        message:
          "No defensible field-display candidate is available for review.",
      });
    },
  );
  return reviewBundleSchema.parse({
    version: 1,
    reviewDraftId: input.reviewDraftId,
    reportSessionId: input.reportSessionId,
    sourceSha256: input.sourceSha256,
    planSha256: input.planSha256,
    candidateCatalogVersion: 1,
    resolutionSummary: {
      title: {
        status: titleResolution.status,
        reason: titleResolution.reason,
        mutationAuthorized: false,
      },
      fields: fieldResolutions.map((resolution) => ({
        fieldName: resolution.fieldName,
        status: resolution.status,
        reason: resolution.reason,
        mutationAuthorized: false,
      })),
      pageOrientation: {
        status: pageDimensionsExplicit ? "structurallyAvailable" : "blocked",
        reason: pageDimensionsExplicit ? null : "PAGE_DIMENSIONS_UNSPECIFIED",
        mutationAuthorized: false,
      },
    },
    operations,
    state: stateFor(operations),
    mutationAuthorized: false,
    executable: false,
  });
};

const requireRankedField = (
  catalog: TargetCandidateCatalog,
  fieldName: string,
  candidateId: string,
): RankedFieldDisplayCandidate | undefined =>
  rankFieldDisplayCandidates(catalog, { fieldName }).find(
    (candidate) => candidate.candidateId === candidateId,
  );

const selectedIds = (operation: OperationReview): string[] =>
  operation.status === "readyForConfirmation"
    ? [operation.recommendedCandidate.candidateId]
    : operation.status === "choiceRequired"
      ? operation.selectedCandidateIds
      : operation.status === "confirmed"
        ? operation.selectedCandidateIds
        : [];

export const updateReviewSelection = (
  bundle: ReviewBundle,
  operationId: string,
  candidateIds: string[],
): ReviewBundle => {
  if (new Set(candidateIds).size !== candidateIds.length)
    throw new Error("DUPLICATE_CANDIDATE_ID");
  const operations = bundle.operations.map((operation) => {
    if (operation.operationId !== operationId) return operation;
    if (operation.status !== "choiceRequired")
      throw new Error("OPERATION_NOT_SELECTABLE");
    const allowed = new Map(
      operation.candidates.map((candidate) => [
        candidate.candidateId,
        candidate,
      ]),
    );
    if (candidateIds.some((id) => !allowed.has(id)))
      throw new Error("CANDIDATE_NOT_ALLOWED");
    if (!candidateIds.length) throw new Error("EMPTY_SELECTION");
    if (operation.selectionPolicy === "exactlyOne" && candidateIds.length !== 1)
      throw new Error("EXACTLY_ONE_REQUIRED");
    const expectedKind =
      operation.operationType === "setNumberFormat" ? "fieldDisplay" : "title";
    if (candidateIds.some((id) => allowed.get(id)?.kind !== expectedKind))
      throw new Error("CANDIDATE_TYPE_MISMATCH");
    return operationReviewSchema.parse({
      ...operation,
      selectedCandidateIds: [...candidateIds].sort(),
    });
  });
  if (!operations.some(({ operationId: id }) => id === operationId))
    throw new Error("OPERATION_NOT_FOUND");
  return reviewBundleSchema.parse({
    ...bundle,
    operations,
    state: stateFor(operations),
  });
};

export const confirmReviewOperation = (
  bundle: ReviewBundle,
  operationId: string,
): ReviewBundle => {
  const operations = bundle.operations.map((operation) => {
    if (operation.operationId !== operationId) return operation;
    if (
      operation.status !== "readyForConfirmation" &&
      operation.status !== "choiceRequired"
    )
      throw new Error("OPERATION_NOT_CONFIRMABLE");
    const ids = selectedIds(operation);
    if (!ids.length) throw new Error("SELECTION_REQUIRED");
    return operationReviewSchema.parse({
      status: "confirmed",
      operationId: operation.operationId,
      operationType: operation.operationType,
      requestedChange: operation.requestedChange,
      selectedCandidateIds: ids,
      confirmationSummary: `Reviewed ${ids.length} exact candidate${ids.length === 1 ? "" : "s"}.`,
      mutationAuthorized: false,
    });
  });
  if (!operations.some(({ operationId: id }) => id === operationId))
    throw new Error("OPERATION_NOT_FOUND");
  return reviewBundleSchema.parse({
    ...bundle,
    operations,
    state: stateFor(operations),
  });
};

export const declineReviewOperation = (
  bundle: ReviewBundle,
  operationId: string,
): ReviewBundle => {
  const operations = bundle.operations.map((operation) =>
    operation.operationId === operationId
      ? operationReviewSchema.parse({
          status: "declined",
          operationId: operation.operationId,
          operationType: operation.operationType,
          requestedChange: operation.requestedChange,
          mutationAuthorized: false,
        })
      : operation,
  );
  if (!operations.some(({ operationId: id }) => id === operationId))
    throw new Error("OPERATION_NOT_FOUND");
  return reviewBundleSchema.parse({
    ...bundle,
    operations,
    state: stateFor(operations),
  });
};

export const resetReviewOperation = (
  current: ReviewBundle,
  initial: ReviewBundle,
  operationId: string,
): ReviewBundle => {
  const original = initial.operations.find(
    ({ operationId: id }) => id === operationId,
  );
  if (!original) throw new Error("OPERATION_NOT_FOUND");
  const operations = current.operations.map((operation) =>
    operation.operationId === operationId ? original : operation,
  );
  return reviewBundleSchema.parse({
    ...current,
    operations,
    state: stateFor(operations),
  });
};
