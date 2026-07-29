import { z } from "zod";
import type {
  TargetCandidateCatalog,
  TargetFieldCandidate,
} from "./target-context";

export const fieldDisplayResolutionRequestSchema = z
  .object({ fieldName: z.string().trim().min(1).max(256) })
  .strict();
export type FieldDisplayResolutionRequest = z.infer<
  typeof fieldDisplayResolutionRequestSchema
>;

export const fieldDisplayResolutionReasonSchema = z.enum([
  "FIELD_DISPLAY_RESOLVED",
  "NO_FIELD_DISPLAY_CANDIDATE",
  "MULTIPLE_FIELD_DISPLAY_CANDIDATES",
  "MULTIPLE_DATASET_CANDIDATES",
  "DATASET_IDENTITY_AMBIGUOUS",
  "MULTIPLE_SCOPE_ROLES",
  "CONFLICTING_FIELD_SCOPE",
  "DUPLICATE_VISUAL_LOCATIONS",
  "UNSUPPORTED_FIELD_EXPRESSION",
  "FIELD_CONTEXT_INSUFFICIENT",
]);

const evidenceSchema = z
  .object({ code: z.string(), message: z.string() })
  .strict();
const candidateSchema = z
  .object({
    candidateId: z.string().min(1),
    reportItemName: z.string(),
    structuralPath: z.string(),
    region: z.enum(["body", "pageHeader", "pageFooter"]),
    fieldName: z.string(),
    expressionKind: z.enum(["directFieldReference", "aggregateExpression"]),
    aggregateFunction: z.string().nullable(),
    explicitAggregateScope: z.string().nullable(),
    datasetCertainty: z.enum(["certain", "ambiguous", "unavailable"]),
    datasetName: z.string().nullable(),
    possibleDatasets: z.array(z.string()),
    tablixName: z.string().nullable(),
    scopeRole: z.enum([
      "detail",
      "groupHeader",
      "groupSubtotal",
      "grandTotal",
      "staticHeader",
      "staticLabel",
      "standalone",
      "unknown",
    ]),
    groupNames: z.array(z.string()),
    currentFormat: z.string().nullable(),
    serializedType: z.string().nullable(),
    likelyNumericDisplay: z.boolean(),
    compatibilityUnknown: z.boolean(),
    hiddenStatus: z.enum(["visible", "hidden", "expression", "unspecified"]),
    evidence: z.array(evidenceSchema),
    ambiguityEvidence: z.array(evidenceSchema),
  })
  .strict();

export const fieldDisplayResolutionOutcomeSchema = z.discriminatedUnion(
  "status",
  [
    z
      .object({
        status: z.literal("resolved"),
        reason: z.literal("FIELD_DISPLAY_RESOLVED"),
        fieldName: z.string(),
        candidateId: z.string().min(1),
        confidence: z.enum(["high", "medium"]),
        evidence: z.array(evidenceSchema).min(1),
        alternatives: z.array(candidateSchema),
        mutationAuthorized: z.literal(false),
      })
      .strict(),
    z
      .object({
        status: z.literal("ambiguous"),
        reason: z.enum([
          "MULTIPLE_FIELD_DISPLAY_CANDIDATES",
          "MULTIPLE_DATASET_CANDIDATES",
          "DATASET_IDENTITY_AMBIGUOUS",
          "MULTIPLE_SCOPE_ROLES",
          "CONFLICTING_FIELD_SCOPE",
          "DUPLICATE_VISUAL_LOCATIONS",
        ]),
        fieldName: z.string(),
        candidates: z.array(candidateSchema).min(1),
        evidence: z.array(z.string()).min(1),
        mutationAuthorized: z.literal(false),
      })
      .strict(),
    z
      .object({
        status: z.literal("notFound"),
        reason: z.literal("NO_FIELD_DISPLAY_CANDIDATE"),
        fieldName: z.string(),
        consideredCandidateCount: z.number().int().nonnegative(),
        mutationAuthorized: z.literal(false),
      })
      .strict(),
    z
      .object({
        status: z.literal("unsupported"),
        reason: z.enum([
          "UNSUPPORTED_FIELD_EXPRESSION",
          "FIELD_CONTEXT_INSUFFICIENT",
        ]),
        fieldName: z.string(),
        evidence: z.array(z.string()).min(1),
        mutationAuthorized: z.literal(false),
      })
      .strict(),
  ],
);

export type FieldDisplayResolutionOutcome = z.infer<
  typeof fieldDisplayResolutionOutcomeSchema
>;
export type RankedFieldDisplayCandidate = z.infer<typeof candidateSchema>;

const evidence = (code: string, message: string) => ({ code, message });
const caseInsensitiveExact = (left: string, right: string): boolean =>
  left.toUpperCase() === right.toUpperCase();
const compareCodePoints = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const summarize = (
  candidate: TargetFieldCandidate,
  allMatches: TargetFieldCandidate[],
  reportWideDatasets: string[],
): RankedFieldDisplayCandidate => {
  const fieldName = candidate.fieldIdentity.fieldName;
  const positive = [
    evidence("EXACT_FIELD_NAME", `exact field-name match: ${fieldName}`),
    evidence(
      candidate.expression.kind === "directFieldReference"
        ? "DIRECT_FIELD_REFERENCE"
        : "AGGREGATE_FIELD_EXPRESSION",
      `expression kind is ${candidate.expression.kind}`,
    ),
    evidence(
      "STRUCTURAL_PATH_PRESERVED",
      `structural location: ${candidate.location.structuralPath}`,
    ),
    ...(candidate.location.tablixName
      ? [evidence("TABLIX_CONTEXT", `tablix: ${candidate.location.tablixName}`)]
      : []),
    evidence("SCOPE_ROLE", `structural role: ${candidate.scope.role}`),
    ...(candidate.currentFormat
      ? [
          evidence(
            "CURRENT_FORMAT",
            `current format: ${candidate.currentFormat}`,
          ),
        ]
      : []),
  ];
  const ambiguity = [
    ...(candidate.fieldIdentity.certainty === "certain"
      ? []
      : [
          evidence(
            "DATASET_IDENTITY_UNCERTAIN",
            `dataset identity is ${candidate.fieldIdentity.certainty}`,
          ),
        ]),
    ...(reportWideDatasets.length > 1
      ? [
          evidence(
            "MULTIPLE_DATASET_DECLARATIONS",
            `field is declared by ${reportWideDatasets.join(", ")}`,
          ),
        ]
      : []),
    ...(allMatches.length > 1
      ? [
          evidence(
            "DUPLICATE_VISUAL_LOCATION",
            `${allMatches.length} display candidates match the field`,
          ),
        ]
      : []),
    ...(candidate.location.hidden.status === "hidden" ||
    candidate.location.hidden.status === "expression"
      ? [
          evidence(
            "HIDDEN_OR_CONDITIONAL",
            `visibility is ${candidate.location.hidden.status}`,
          ),
        ]
      : []),
  ];
  return candidateSchema.parse({
    candidateId: candidate.diagnosticId,
    reportItemName: candidate.reportItemName,
    structuralPath: candidate.location.structuralPath,
    region: candidate.location.region,
    fieldName,
    expressionKind: candidate.expression.kind,
    aggregateFunction:
      candidate.expression.kind === "aggregateExpression"
        ? candidate.expression.functionName
        : null,
    explicitAggregateScope:
      candidate.expression.kind === "aggregateExpression"
        ? candidate.expression.explicitScope
        : null,
    datasetCertainty: candidate.fieldIdentity.certainty,
    datasetName:
      candidate.fieldIdentity.certainty === "certain"
        ? candidate.fieldIdentity.datasetName
        : null,
    possibleDatasets: reportWideDatasets,
    tablixName: candidate.location.tablixName,
    scopeRole: candidate.scope.role,
    groupNames: candidate.location.groupNames,
    currentFormat: candidate.currentFormat,
    serializedType: null,
    likelyNumericDisplay:
      candidate.currentFormat !== null ||
      candidate.expression.kind === "aggregateExpression",
    compatibilityUnknown: true,
    hiddenStatus: candidate.location.hidden.status,
    evidence: positive,
    ambiguityEvidence: ambiguity,
  });
};

export const rankFieldDisplayCandidates = (
  catalog: TargetCandidateCatalog,
  input: FieldDisplayResolutionRequest,
): RankedFieldDisplayCandidate[] => {
  const request = fieldDisplayResolutionRequestSchema.parse(input);
  const matches = catalog.fieldDisplayCandidates.filter(({ fieldIdentity }) =>
    caseInsensitiveExact(fieldIdentity.fieldName, request.fieldName),
  );
  const overlap = catalog.datasetOverlaps.find(({ fieldName }) =>
    caseInsensitiveExact(fieldName, request.fieldName),
  );
  return matches
    .map((candidate) =>
      summarize(
        candidate,
        matches,
        overlap?.datasetNames ?? candidate.fieldIdentity.possibleDatasets,
      ),
    )
    .sort(
      (a, b) =>
        compareCodePoints(a.structuralPath, b.structuralPath) ||
        compareCodePoints(a.candidateId, b.candidateId),
    );
};

export const resolveReadOnlyFieldDisplay = (
  catalog: TargetCandidateCatalog,
  input: FieldDisplayResolutionRequest,
): FieldDisplayResolutionOutcome => {
  const request = fieldDisplayResolutionRequestSchema.parse(input);
  const candidates = rankFieldDisplayCandidates(catalog, request);
  const canonicalFieldName = candidates[0]?.fieldName ?? request.fieldName;
  if (!candidates.length)
    return fieldDisplayResolutionOutcomeSchema.parse({
      status: "notFound",
      reason: "NO_FIELD_DISPLAY_CANDIDATE",
      fieldName: request.fieldName,
      consideredCandidateCount: catalog.fieldDisplayCandidates.length,
      mutationAuthorized: false,
    });
  const datasetNames = new Set(
    candidates.flatMap(({ datasetName }) => (datasetName ? [datasetName] : [])),
  );
  const declaredDatasets = new Set(
    candidates.flatMap(({ possibleDatasets }) => possibleDatasets),
  );
  if (datasetNames.size > 1)
    return fieldDisplayResolutionOutcomeSchema.parse({
      status: "ambiguous",
      reason: "MULTIPLE_DATASET_CANDIDATES",
      fieldName: canonicalFieldName,
      candidates,
      evidence: ["matching displays belong to multiple datasets"],
      mutationAuthorized: false,
    });
  if (declaredDatasets.size > 1)
    return fieldDisplayResolutionOutcomeSchema.parse({
      status: "ambiguous",
      reason: "MULTIPLE_DATASET_CANDIDATES",
      fieldName: canonicalFieldName,
      candidates,
      evidence: [
        `field is declared by multiple datasets: ${[...declaredDatasets].join(", ")}`,
        "no reviewed policy proves that other declarations are irrelevant",
      ],
      mutationAuthorized: false,
    });
  if (
    candidates.some(({ datasetCertainty }) => datasetCertainty === "ambiguous")
  )
    return fieldDisplayResolutionOutcomeSchema.parse({
      status: "ambiguous",
      reason: "DATASET_IDENTITY_AMBIGUOUS",
      fieldName: canonicalFieldName,
      candidates,
      evidence: [
        "the display cannot be assigned to one dataset from structural evidence",
      ],
      mutationAuthorized: false,
    });
  if (
    candidates.some(
      ({ datasetCertainty, structuralPath }) =>
        datasetCertainty === "unavailable" || !structuralPath,
    )
  )
    return fieldDisplayResolutionOutcomeSchema.parse({
      status: "unsupported",
      reason: "FIELD_CONTEXT_INSUFFICIENT",
      fieldName: canonicalFieldName,
      evidence: ["dataset identity or structural location is unavailable"],
      mutationAuthorized: false,
    });
  if (candidates.length > 1) {
    const roles = new Set(candidates.map(({ scopeRole }) => scopeRole));
    const tablixes = new Set(candidates.map(({ tablixName }) => tablixName));
    const containers = new Set(
      candidates.map(({ structuralPath }) =>
        structuralPath.slice(0, structuralPath.lastIndexOf("/Textbox(")),
      ),
    );
    const reason =
      tablixes.size > 1
        ? "DUPLICATE_VISUAL_LOCATIONS"
        : roles.size > 1
          ? "MULTIPLE_SCOPE_ROLES"
          : containers.size > 1
            ? "DUPLICATE_VISUAL_LOCATIONS"
            : "MULTIPLE_FIELD_DISPLAY_CANDIDATES";
    return fieldDisplayResolutionOutcomeSchema.parse({
      status: "ambiguous",
      reason,
      fieldName: canonicalFieldName,
      candidates,
      evidence:
        reason === "MULTIPLE_SCOPE_ROLES"
          ? [
              `matching displays span structural roles: ${[...roles].join(", ")}`,
              "field-name-only input does not define detail or total scope",
            ]
          : [
              "matching displays occupy materially distinct visual locations",
              "no multi-location selection policy is approved",
            ],
      mutationAuthorized: false,
    });
  }
  const candidate = candidates[0]!;
  return fieldDisplayResolutionOutcomeSchema.parse({
    status: "resolved",
    reason: "FIELD_DISPLAY_RESOLVED",
    fieldName: canonicalFieldName,
    candidateId: candidate.candidateId,
    confidence: "high",
    evidence: candidate.evidence,
    alternatives: [],
    mutationAuthorized: false,
  });
};
