import { createHash, randomUUID } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { basename, join } from "node:path";
import {
  applyPreparedSidecarEdit,
  catalogRdlBytes,
  createEditPlannerContext,
  inspectRdlFile,
  prepareSidecarEditFromText,
  resolveConfiguredReportTitle,
  resolveReadOnlyReportTitle,
  resolveReadOnlyFieldDisplay,
  SidecarCliError,
  RdlInspectionError,
  validateXmlAgainstXsd,
  type PreparedSidecarEdit,
} from "@powerbi-copilot/rdl-copilot";
import {
  actionResultSchema,
  applyEditResultSchema,
  existingRdlSelectionResultSchema,
  fieldResolutionResultSchema,
  planEditResultSchema,
  type ApplyEditResult,
  type ExistingRdlSelectionResult,
  type FieldResolutionResult,
  type PlanEditResult,
  type SidecarActionResult,
} from "../shared/desktop-api";

const sha256 = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

type ReportSession = {
  id: string;
  sourcePath: string;
  sourceSha256: string;
  createdAt: number;
  candidateIds: ReadonlySet<string>;
  fieldCandidateIds: ReadonlyMap<string, string>;
  catalog: Awaited<ReturnType<typeof catalogRdlBytes>>;
};
type PlanSession = {
  id: string;
  reportSessionId: string;
  prepared: PreparedSidecarEdit;
  createdAt: number;
  consumed: boolean;
};
type OutputRecord = {
  rdlPath: string;
  manifestPath: string;
};

export type SidecarPlatform = "darwin" | "win32" | "linux";
export const revealLabelForPlatform = (
  platform: SidecarPlatform,
): "Reveal in Finder" | "Reveal in Explorer" | "Reveal in File Manager" =>
  platform === "darwin"
    ? "Reveal in Finder"
    : platform === "win32"
      ? "Reveal in Explorer"
      : "Reveal in File Manager";

const errorResult = (
  error: unknown,
  fallbackCode = "IPC_REJECTED",
): {
  status: "error";
  code: string;
  message: string;
  noOutputWritten: true;
  sourceUnchanged: true;
  unsupportedFragments?: string[];
} => {
  if (error instanceof RdlInspectionError) {
    const code = {
      NOT_RDL: "SOURCE_EXTENSION_INVALID",
      NOT_REGULAR_FILE: "SOURCE_NOT_REGULAR_FILE",
      FILE_TOO_LARGE: "SOURCE_TOO_LARGE",
      INVALID_REPORT: "SOURCE_XML_INVALID",
      PAGE_DIMENSIONS_UNSPECIFIED: "PAGE_DIMENSIONS_UNSPECIFIED",
      TITLE_NOT_FOUND: "TARGET_MISSING",
      TITLE_AMBIGUOUS: "TARGET_AMBIGUOUS",
      FIELD_NOT_FOUND: "TARGET_MISSING",
      FIELD_AMBIGUOUS: "TARGET_AMBIGUOUS",
      FIELD_DISPLAY_NOT_FOUND: "TARGET_MISSING",
    }[error.code];
    return {
      status: "error",
      code,
      message: error.message,
      noOutputWritten: true,
      sourceUnchanged: true,
    };
  }
  if (error instanceof SidecarCliError)
    return {
      status: "error",
      code: error.code,
      message:
        error.code === "SOURCE_CHANGED"
          ? "The source report changed after it was inspected. Select it again before applying changes."
          : error.message,
      noOutputWritten: true,
      sourceUnchanged: true,
      ...(Array.isArray(error.details.unsupportedFragments)
        ? {
            unsupportedFragments: error.details
              .unsupportedFragments as string[],
          }
        : {}),
    };
  return {
    status: "error",
    code: fallbackCode,
    message: "The existing-report sidecar operation failed.",
    noOutputWritten: true,
    sourceUnchanged: true,
  };
};

export class ExistingRdlSidecarService {
  private readonly reports = new Map<string, ReportSession>();
  private readonly plans = new Map<string, PlanSession>();
  private readonly outputs = new Map<string, OutputRecord>();

  constructor(
    private readonly options: {
      userDataPath: string;
      schemaPath: string;
      platform: SidecarPlatform;
      now?: () => number;
      sessionLifetimeMs?: number;
      revealPath: (path: string) => void;
      copyText: (value: string) => void;
    },
  ) {}

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  private lifetime(): number {
    return this.options.sessionLifetimeMs ?? 30 * 60 * 1000;
  }

  private report(id: string): ReportSession {
    const session = this.reports.get(id);
    if (!session)
      throw new SidecarCliError(
        "TARGET_MISSING",
        "The report session was not found.",
        { electronCode: "REPORT_SESSION_NOT_FOUND" },
      );
    if (this.now() - session.createdAt > this.lifetime()) {
      this.clearReport(id);
      throw new SidecarCliError(
        "TARGET_MISSING",
        "The report session expired.",
        { electronCode: "REPORT_SESSION_EXPIRED" },
      );
    }
    return session;
  }

  private planSession(id: string): PlanSession {
    const session = this.plans.get(id);
    if (!session)
      throw new SidecarCliError(
        "PLAN_INVALID",
        "The plan session was not found.",
        { electronCode: "PLAN_SESSION_NOT_FOUND" },
      );
    if (this.now() - session.createdAt > this.lifetime()) {
      this.plans.delete(id);
      throw new SidecarCliError("PLAN_INVALID", "The plan session expired.", {
        electronCode: "PLAN_SESSION_EXPIRED",
      });
    }
    return session;
  }

  private clearReport(id: string): void {
    this.reports.delete(id);
    for (const [planId, plan] of this.plans)
      if (plan.reportSessionId === id) this.plans.delete(planId);
  }

  clearAllSessions(): void {
    this.reports.clear();
    this.plans.clear();
  }

  async selectPath(
    selectedPath: string | null,
  ): Promise<ExistingRdlSelectionResult> {
    if (!selectedPath) return { status: "cancelled" };
    try {
      this.clearAllSessions();
      const sourcePath = await realpath(selectedPath);
      const inventory = await inspectRdlFile(sourcePath);
      const source = await readFile(sourcePath);
      const catalog = await catalogRdlBytes(source);
      const xsd = await validateXmlAgainstXsd(
        source,
        await readFile(this.options.schemaPath),
      );
      if (xsd.status !== "PASS")
        throw new SidecarCliError(
          "SOURCE_XSD_INVALID",
          "The selected RDL failed schema validation.",
        );
      const id = randomUUID();
      const titleCandidates = catalog.titleCandidates.map((candidate) => ({
        candidateId: randomUUID(),
        reportItemName: candidate.reportItemName,
        structuralPath: candidate.location.structuralPath,
        region: candidate.location.region,
        visibleText: candidate.visibleText,
        evidence: [
          ...candidate.positiveEvidence,
          ...candidate.negativeEvidence,
        ],
      }));
      const titleCandidateIds = new Map(
        titleCandidates.map((candidate, index) => [
          catalog.titleCandidates[index]!.diagnosticId,
          candidate.candidateId,
        ]),
      );
      const fieldDisplayCandidates = catalog.fieldDisplayCandidates.map(
        (candidate) => ({
          candidateId: randomUUID(),
          reportItemName: candidate.reportItemName,
          structuralPath: candidate.location.structuralPath,
          region: candidate.location.region,
          fieldName: candidate.fieldIdentity.fieldName,
          expressionKind: candidate.expression.kind,
          datasetCertainty: candidate.fieldIdentity.certainty,
          scopeRole: candidate.scope.role,
        }),
      );
      const fieldCandidateIds = new Map(
        fieldDisplayCandidates.map((candidate, index) => [
          catalog.fieldDisplayCandidates[index]!.diagnosticId,
          candidate.candidateId,
        ]),
      );
      const diagnosticTitleResolution = resolveReadOnlyReportTitle(catalog);
      const liveRanked = <
        T extends {
          candidateId: string;
        },
      >(
        candidate: T,
      ): T => ({
        ...candidate,
        candidateId: titleCandidateIds.get(candidate.candidateId)!,
      });
      const titleResolution =
        diagnosticTitleResolution.status === "resolved"
          ? {
              ...diagnosticTitleResolution,
              candidateId: titleCandidateIds.get(
                diagnosticTitleResolution.candidateId,
              )!,
              alternatives:
                diagnosticTitleResolution.alternatives.map(liveRanked),
            }
          : diagnosticTitleResolution.status === "ambiguous"
            ? {
                ...diagnosticTitleResolution,
                candidates:
                  diagnosticTitleResolution.candidates.map(liveRanked),
              }
            : diagnosticTitleResolution;
      this.reports.set(id, {
        id,
        sourcePath,
        sourceSha256: sha256(source),
        createdAt: this.now(),
        candidateIds: new Set([
          ...titleCandidates.map(({ candidateId }) => candidateId),
          ...fieldDisplayCandidates.map(({ candidateId }) => candidateId),
        ]),
        fieldCandidateIds,
        catalog,
      });
      let currentTitle: string | null = null;
      try {
        const target = resolveConfiguredReportTitle(inventory);
        currentTitle =
          inventory.textboxes.find(({ name }) => name === target.reportItemName)
            ?.staticText[0] ?? null;
      } catch {
        currentTitle = null;
      }
      return existingRdlSelectionResultSchema.parse({
        status: "selected",
        reportSessionId: id,
        summary: {
          filename: basename(sourcePath),
          sourceSha256: inventory.sourceSha256,
          namespace: inventory.namespace,
          namespaceVersion: inventory.namespaceVersion,
          datasetNames: inventory.datasets.map(({ name }) => name),
          fieldCount: new Set(
            inventory.datasets.flatMap(({ fields }) => fields),
          ).size,
          tablixNames: inventory.tablixes.map(({ name }) => name),
          groupNames: inventory.groups.map(({ name }) => name),
          textboxCount: inventory.textboxes.length,
          pageOrientation:
            inventory.reportSections[0]?.orientation.status === "known"
              ? inventory.reportSections[0].orientation.value
              : "unspecified",
          pageWidth:
            inventory.reportSections[0]?.pageWidth.presence === "explicit"
              ? inventory.reportSections[0].pageWidth.raw
              : "Not serialized",
          pageHeight:
            inventory.reportSections[0]?.pageHeight.presence === "explicit"
              ? inventory.reportSections[0].pageHeight.raw
              : "Not serialized",
          candidateCatalog: {
            titleCount: titleCandidates.length,
            fieldDisplayCount: fieldDisplayCandidates.length,
            titleCandidates,
            fieldDisplayCandidates,
            titleResolution,
          },
          currentTitle,
        },
        revealLabel: revealLabelForPlatform(this.options.platform),
      });
    } catch (error) {
      return existingRdlSelectionResultSchema.parse(errorResult(error));
    }
  }

  resolveField(input: {
    reportSessionId: string;
    fieldName: string;
  }): FieldResolutionResult {
    try {
      const report = this.report(input.reportSessionId);
      const outcome = resolveReadOnlyFieldDisplay(report.catalog, {
        fieldName: input.fieldName,
      });
      const liveCandidate = <
        T extends {
          candidateId: string;
        },
      >(
        candidate: T,
      ): T => ({
        ...candidate,
        candidateId: report.fieldCandidateIds.get(candidate.candidateId)!,
      });
      return fieldResolutionResultSchema.parse(
        outcome.status === "resolved"
          ? {
              ...outcome,
              candidateId: report.fieldCandidateIds.get(outcome.candidateId)!,
              alternatives: outcome.alternatives.map(liveCandidate),
            }
          : outcome.status === "ambiguous"
            ? { ...outcome, candidates: outcome.candidates.map(liveCandidate) }
            : outcome,
      );
    } catch (error) {
      return fieldResolutionResultSchema.parse(errorResult(error));
    }
  }

  async planEdit(input: {
    reportSessionId: string;
    request: string;
  }): Promise<PlanEditResult> {
    try {
      const report = this.report(input.reportSessionId);
      if (Buffer.byteLength(input.request, "utf8") > 8192)
        throw new SidecarCliError(
          "REQUEST_TOO_LARGE",
          "The request exceeds 8,192 UTF-8 bytes.",
        );
      if (sha256(await readFile(report.sourcePath)) !== report.sourceSha256) {
        this.clearReport(report.id);
        throw new SidecarCliError(
          "SOURCE_CHANGED",
          "The source report changed after inspection.",
        );
      }
      for (const [id, plan] of this.plans)
        if (plan.reportSessionId === report.id) this.plans.delete(id);
      const prepared = await prepareSidecarEditFromText({
        sourcePath: report.sourcePath,
        request: input.request,
      });
      createEditPlannerContext(prepared.inventory);
      const planSessionId = randomUUID();
      this.plans.set(planSessionId, {
        id: planSessionId,
        reportSessionId: report.id,
        prepared,
        createdAt: this.now(),
        consumed: false,
      });
      return planEditResultSchema.parse({
        status: "planned",
        reportSessionId: report.id,
        planSessionId,
        sourceFilename: basename(report.sourcePath),
        sourceSha256: report.sourceSha256,
        planSha256: prepared.plannerResult.planSha256,
        proposal: prepared.plannerResult.proposal,
        resolvedTargets: prepared.targets,
        warnings: prepared.plannerResult.warnings,
      });
    } catch (error) {
      const result = errorResult(error);
      const electronCode =
        error instanceof SidecarCliError
          ? error.details.electronCode
          : undefined;
      return planEditResultSchema.parse({
        ...result,
        ...(typeof electronCode === "string" ? { code: electronCode } : {}),
      });
    }
  }

  async applyEdit(input: {
    reportSessionId: string;
    planSessionId: string;
  }): Promise<ApplyEditResult> {
    try {
      const report = this.report(input.reportSessionId);
      const plan = this.planSession(input.planSessionId);
      if (plan.reportSessionId !== report.id)
        return applyEditResultSchema.parse({
          ...errorResult(null),
          code: "PLAN_SESSION_MISMATCH",
          message: "The edit plan belongs to a different report.",
        });
      if (plan.consumed)
        return applyEditResultSchema.parse({
          ...errorResult(null),
          code: "PLAN_ALREADY_APPLIED",
          message: "This edit plan has already been applied.",
        });
      if (!plan.prepared.targets.length)
        throw new SidecarCliError(
          "TARGET_MISSING",
          "Stored resolution evidence is missing.",
        );
      if (sha256(await readFile(report.sourcePath)) !== report.sourceSha256)
        throw new SidecarCliError(
          "SOURCE_CHANGED",
          "The source report changed after inspection.",
        );
      const result = await applyPreparedSidecarEdit(plan.prepared, {
        controlledRoot: this.options.userDataPath,
        outputDirectory: join(this.options.userDataPath, "edited-reports"),
        schemaPath: this.options.schemaPath,
        invocationSurface: "electron-sidecar",
      });
      plan.consumed = true;
      const outputHandle = randomUUID();
      this.outputs.set(outputHandle, {
        rdlPath: result.outputPath,
        manifestPath: result.manifestPath,
      });
      return applyEditResultSchema.parse({
        status: "complete",
        outputHandle,
        editedFilename: basename(result.outputPath),
        manifestFilename: basename(result.manifestPath),
        sourceSha256: result.sourceSha256,
        planSha256: result.planSha256,
        outputSha256: result.outputSha256,
        sourceUnchanged: true,
        validation: "PASS",
      });
    } catch (error) {
      const result = errorResult(error);
      const electronCode =
        error instanceof SidecarCliError
          ? error.details.electronCode
          : undefined;
      return applyEditResultSchema.parse({
        ...result,
        ...(typeof electronCode === "string" ? { code: electronCode } : {}),
      });
    }
  }

  cancelPlan(planSessionId: string): SidecarActionResult {
    this.plans.delete(planSessionId);
    return actionResultSchema.parse({ status: "ok" });
  }

  clearSession(reportSessionId: string): SidecarActionResult {
    this.clearReport(reportSessionId);
    return actionResultSchema.parse({ status: "ok" });
  }

  reveal(outputHandle: string): SidecarActionResult {
    const output = this.outputs.get(outputHandle);
    if (!output)
      return actionResultSchema.parse({
        ...errorResult(null, "REVEAL_FAILED"),
        code: "REVEAL_FAILED",
        message: "The edited report output is no longer available.",
      });
    try {
      this.options.revealPath(output.rdlPath);
      return actionResultSchema.parse({ status: "ok" });
    } catch {
      return actionResultSchema.parse({
        ...errorResult(null, "REVEAL_FAILED"),
        code: "REVEAL_FAILED",
        message: "The edited report could not be revealed.",
      });
    }
  }

  copy(outputHandle: string, kind: "rdl" | "manifest"): SidecarActionResult {
    const output = this.outputs.get(outputHandle);
    if (!output)
      return actionResultSchema.parse({
        ...errorResult(null, "CLIPBOARD_FAILED"),
        code: "CLIPBOARD_FAILED",
        message: "The output path is no longer available.",
      });
    try {
      this.options.copyText(
        kind === "rdl" ? output.rdlPath : output.manifestPath,
      );
      return actionResultSchema.parse({ status: "ok" });
    } catch {
      return actionResultSchema.parse({
        ...errorResult(null, "CLIPBOARD_FAILED"),
        code: "CLIPBOARD_FAILED",
        message: "The output path could not be copied.",
      });
    }
  }
}
