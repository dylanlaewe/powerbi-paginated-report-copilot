import type { PowerBiProject } from "@powerbi-copilot/domain";
import { z } from "zod";
export const ipcChannels = {
  selectProject: "project:select",
  generateReport: "report:generate",
  revealGeneratedReport: "report:reveal",
  copyGeneratedPath: "report:copy-path",
  selectExistingRdl: "sidecar:select-rdl",
  planExistingRdlEdit: "sidecar:plan-edit",
  applyExistingRdlEdit: "sidecar:apply-edit",
  cancelExistingRdlPlan: "sidecar:cancel-plan",
  revealEditedRdl: "sidecar:reveal-output",
  copyEditedRdlPath: "sidecar:copy-rdl-path",
  copyManifestPath: "sidecar:copy-manifest-path",
  clearExistingRdlSession: "sidecar:clear-session",
} as const;
export const projectSelectionResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("selected"),
    project: z.custom<PowerBiProject>(),
  }),
  z.object({ status: z.literal("cancelled") }),
  z.object({
    status: z.literal("error"),
    message: z.string(),
    code: z.string(),
  }),
]);
export type ProjectSelectionResult = z.infer<
  typeof projectSelectionResultSchema
>;
export const generationRequestSchema = z
  .object({
    request: z.string().min(1).max(100_000),
  })
  .strict();
const totalsSchema = z.object({
  Quantity: z.number(),
  Revenue: z.number(),
  GrossProfit: z.number(),
});
export const generationResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("generated"),
    title: z.string(),
    rowCount: z.number().int().positive(),
    regions: z.array(z.string()),
    regionSubtotals: z.record(z.string(), totalsSchema),
    grandTotal: totalsSchema,
    template: z.literal("production-pagination-letter"),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    outputPath: z.string().min(1),
  }),
  z.object({ status: z.literal("error"), message: z.string().min(1) }),
]);
export type GenerationResult = z.infer<typeof generationResultSchema>;
export const visibleGenerationError = (result: GenerationResult): string =>
  result.status === "error" ? result.message : "";

const sidecarErrorSchema = z
  .object({
    status: z.literal("error"),
    code: z.string().min(1),
    message: z.string().min(1),
    unsupportedFragments: z.array(z.string()).optional(),
    noOutputWritten: z.boolean().optional(),
    sourceUnchanged: z.boolean().optional(),
  })
  .strict();
const titleEvidenceContributionSchema = z
  .object({
    code: z.string(),
    weight: z.number().int(),
    message: z.string(),
  })
  .strict();
const liveRankedTitleCandidateSchema = z
  .object({
    candidateId: z.string().uuid(),
    visibleText: z.string(),
    structuralPath: z.string(),
    region: z.enum(["body", "pageHeader", "pageFooter"]),
    score: z.number().int(),
    evidence: z.array(titleEvidenceContributionSchema),
    negativeEvidence: z.array(titleEvidenceContributionSchema),
  })
  .strict();
export const reportSummarySchema = z
  .object({
    filename: z.string(),
    sourceSha256: z.string().length(64),
    namespace: z.string(),
    namespaceVersion: z.string(),
    datasetNames: z.array(z.string()),
    fieldCount: z.number().int().nonnegative(),
    tablixNames: z.array(z.string()),
    groupNames: z.array(z.string()),
    textboxCount: z.number().int().nonnegative(),
    pageOrientation: z.enum(["portrait", "landscape", "square", "unspecified"]),
    pageWidth: z.string(),
    pageHeight: z.string(),
    candidateCatalog: z
      .object({
        titleCount: z.number().int().nonnegative(),
        fieldDisplayCount: z.number().int().nonnegative(),
        titleCandidates: z.array(
          z
            .object({
              candidateId: z.string().uuid(),
              reportItemName: z.string(),
              structuralPath: z.string(),
              region: z.enum(["body", "pageHeader", "pageFooter"]),
              visibleText: z.string(),
              evidence: z.array(z.string()),
            })
            .strict(),
        ),
        fieldDisplayCandidates: z.array(
          z
            .object({
              candidateId: z.string().uuid(),
              reportItemName: z.string(),
              structuralPath: z.string(),
              region: z.enum(["body", "pageHeader", "pageFooter"]),
              fieldName: z.string(),
              expressionKind: z.enum([
                "directFieldReference",
                "aggregateExpression",
              ]),
              datasetCertainty: z.enum(["certain", "ambiguous", "unavailable"]),
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
            })
            .strict(),
        ),
        titleResolution: z.discriminatedUnion("status", [
          z
            .object({
              status: z.literal("resolved"),
              reason: z.literal("TITLE_RESOLVED"),
              candidateId: z.string().uuid(),
              confidence: z.enum(["high", "medium"]),
              evidence: z.array(titleEvidenceContributionSchema),
              alternatives: z.array(liveRankedTitleCandidateSchema),
              mutationAuthorized: z.literal(false),
            })
            .strict(),
          z
            .object({
              status: z.literal("ambiguous"),
              reason: z.enum([
                "MULTIPLE_PLAUSIBLE_TITLE_CANDIDATES",
                "CONFLICTING_TITLE_EVIDENCE",
              ]),
              candidates: z.array(liveRankedTitleCandidateSchema).min(2),
              evidence: z.array(z.string()),
              mutationAuthorized: z.literal(false),
            })
            .strict(),
          z
            .object({
              status: z.literal("notFound"),
              reason: z.enum([
                "NO_TITLE_CANDIDATE",
                "NO_CONFIDENT_TITLE_CANDIDATE",
              ]),
              consideredCandidateCount: z.number().int().nonnegative(),
              mutationAuthorized: z.literal(false),
            })
            .strict(),
          z
            .object({
              status: z.literal("unsupported"),
              reason: z.enum([
                "UNSUPPORTED_TITLE_EXPRESSION",
                "TITLE_CONTEXT_INSUFFICIENT",
              ]),
              evidence: z.array(z.string()),
              mutationAuthorized: z.literal(false),
            })
            .strict(),
        ]),
      })
      .strict(),
    currentTitle: z.string().nullable(),
  })
  .strict();
export const existingRdlSelectionResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("selected"),
      reportSessionId: z.string().uuid(),
      summary: reportSummarySchema,
      revealLabel: z.enum([
        "Reveal in Finder",
        "Reveal in Explorer",
        "Reveal in File Manager",
      ]),
    })
    .strict(),
  z.object({ status: z.literal("cancelled") }).strict(),
  sidecarErrorSchema,
]);
export const planEditRequestSchema = z
  .object({
    reportSessionId: z.string().uuid(),
    request: z.string().min(1).max(8192),
  })
  .strict();
const targetDisplaySchema = z
  .object({
    semanticTarget: z.string(),
    reportItemName: z.string(),
    evidence: z.array(z.string()),
    expectedBefore: z.string(),
    expectedAfter: z.string(),
  })
  .strict();
export const planEditResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("planned"),
      reportSessionId: z.string().uuid(),
      planSessionId: z.string().uuid(),
      sourceFilename: z.string(),
      sourceSha256: z.string().length(64),
      planSha256: z.string().length(64),
      proposal: z.array(z.string()),
      resolvedTargets: z.array(targetDisplaySchema),
      warnings: z.array(z.string()),
    })
    .strict(),
  sidecarErrorSchema,
]);
export const applyEditRequestSchema = z
  .object({
    reportSessionId: z.string().uuid(),
    planSessionId: z.string().uuid(),
  })
  .strict();
export const applyEditResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("complete"),
      outputHandle: z.string().uuid(),
      editedFilename: z.string(),
      manifestFilename: z.string(),
      sourceSha256: z.string().length(64),
      planSha256: z.string().length(64),
      outputSha256: z.string().length(64),
      sourceUnchanged: z.literal(true),
      validation: z.literal("PASS"),
    })
    .strict(),
  sidecarErrorSchema,
]);
export const sessionIdRequestSchema = z
  .object({ reportSessionId: z.string().uuid() })
  .strict();
export const planSessionIdRequestSchema = z
  .object({ planSessionId: z.string().uuid() })
  .strict();
export const outputHandleRequestSchema = z
  .object({ outputHandle: z.string().uuid() })
  .strict();
export const actionResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok") }).strict(),
  sidecarErrorSchema,
]);
export type ExistingRdlSelectionResult = z.infer<
  typeof existingRdlSelectionResultSchema
>;
export type PlanEditResult = z.infer<typeof planEditResultSchema>;
export type ApplyEditResult = z.infer<typeof applyEditResultSchema>;
export type SidecarActionResult = z.infer<typeof actionResultSchema>;
export interface DesktopApi {
  readonly platform: string;
  readonly appMode: "offline-authoring";
  readonly windowsValidation: "pending";
  selectProject(): Promise<ProjectSelectionResult>;
  generateReport(request: string): Promise<GenerationResult>;
  revealGeneratedReport(): Promise<void>;
  copyGeneratedPath(): Promise<void>;
  selectExistingRdl(): Promise<ExistingRdlSelectionResult>;
  planExistingRdlEdit(input: {
    reportSessionId: string;
    request: string;
  }): Promise<PlanEditResult>;
  applyExistingRdlEdit(input: {
    reportSessionId: string;
    planSessionId: string;
  }): Promise<ApplyEditResult>;
  cancelExistingRdlPlan(input: {
    planSessionId: string;
  }): Promise<SidecarActionResult>;
  revealEditedRdl(input: {
    outputHandle: string;
  }): Promise<SidecarActionResult>;
  copyEditedRdlPath(input: {
    outputHandle: string;
  }): Promise<SidecarActionResult>;
  copyManifestPath(input: {
    outputHandle: string;
  }): Promise<SidecarActionResult>;
  clearExistingRdlSession(input: {
    reportSessionId: string;
  }): Promise<SidecarActionResult>;
}
