import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  realpath,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, extname, join } from "node:path";
import {
  applyPreparedSidecarEdit,
  authorizeReviewedPlan,
  buildReviewBundle,
  catalogRdlBytes,
  confirmReviewOperation,
  createEditPlannerContext,
  declineReviewOperation,
  editPlanSchema,
  genericMutationManifestSchema,
  GenericMutationError,
  inspectRdlFile,
  LocalSentenceEditPlanner,
  mutateAuthorizedRdl,
  prepareSidecarEditFromText,
  resetReviewOperation,
  resolveConfiguredReportTitle,
  resolveReadOnlyReportTitle,
  resolveReadOnlyFieldDisplay,
  updateReviewSelection,
  SidecarCliError,
  RdlInspectionError,
  validateXmlAgainstXsd,
  type PreparedSidecarEdit,
  type EditPlan,
  type ReviewBundle,
  type RdlInventory,
  type TargetFieldCandidate,
  type TargetTitleCandidate,
} from "@powerbi-copilot/rdl-copilot";
import {
  actionResultSchema,
  applyEditResultSchema,
  existingRdlSelectionResultSchema,
  fieldResolutionResultSchema,
  reviewBundleResultSchema,
  reviewedCopyResultSchema,
  planEditResultSchema,
  type ApplyEditResult,
  type ExistingRdlSelectionResult,
  type FieldResolutionResult,
  type ReviewBundleResult,
  type ReviewedCopyResult,
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
  titleCandidateIds: ReadonlyMap<string, string>;
  fieldCandidateIds: ReadonlyMap<string, string>;
  catalog: Awaited<ReturnType<typeof catalogRdlBytes>>;
  inventory: RdlInventory;
  candidateByLiveId: ReadonlyMap<
    string,
    TargetTitleCandidate | TargetFieldCandidate
  >;
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
type ReviewDraft = {
  id: string;
  reportSessionId: string;
  sourceSha256: string;
  planSha256: string;
  initial: ReviewBundle;
  current: ReviewBundle;
  plan: EditPlan;
  consumed: boolean;
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
  if (error instanceof GenericMutationError)
    return {
      status: "error",
      code: error.code,
      message: error.message,
      noOutputWritten: true,
      sourceUnchanged: true,
    };
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
  private readonly reviews = new Map<string, ReviewDraft>();

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
    for (const [reviewId, review] of this.reviews)
      if (review.reportSessionId === id) this.reviews.delete(reviewId);
  }

  clearAllSessions(): void {
    this.reports.clear();
    this.plans.clear();
    this.reviews.clear();
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
      const candidateByLiveId = new Map<
        string,
        TargetTitleCandidate | TargetFieldCandidate
      >([
        ...catalog.titleCandidates.map(
          (
            candidate,
          ): [string, TargetTitleCandidate | TargetFieldCandidate] => [
            titleCandidateIds.get(candidate.diagnosticId)!,
            candidate,
          ],
        ),
        ...catalog.fieldDisplayCandidates.map(
          (
            candidate,
          ): [string, TargetTitleCandidate | TargetFieldCandidate] => [
            fieldCandidateIds.get(candidate.diagnosticId)!,
            candidate,
          ],
        ),
      ]);
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
        titleCandidateIds,
        fieldCandidateIds,
        catalog,
        inventory,
        candidateByLiveId,
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

  private async reviewDraft(id: string): Promise<ReviewDraft> {
    const draft = this.reviews.get(id);
    if (!draft)
      throw new SidecarCliError(
        "TARGET_MISSING",
        "The review draft was not found.",
      );
    const report = this.report(draft.reportSessionId);
    if (
      report.sourceSha256 !== draft.sourceSha256 ||
      sha256(await readFile(report.sourcePath)) !== draft.sourceSha256
    ) {
      this.clearReport(report.id);
      throw new SidecarCliError(
        "SOURCE_CHANGED",
        "The source report changed after review began.",
      );
    }
    return draft;
  }

  async createReview(input: {
    reportSessionId: string;
    request: string;
  }): Promise<ReviewBundleResult> {
    try {
      const report = this.report(input.reportSessionId);
      if (sha256(await readFile(report.sourcePath)) !== report.sourceSha256)
        throw new SidecarCliError(
          "SOURCE_CHANGED",
          "The source report changed after inspection.",
        );
      const planner = new LocalSentenceEditPlanner().plan(
        input.request,
        createEditPlannerContext(report.inventory),
      );
      if (planner.status === "rejected")
        throw new SidecarCliError(
          "PLANNER_REJECTED",
          `${planner.code}: ${planner.message}`,
          { unsupportedFragments: planner.unsupportedFragments },
        );
      const plan = editPlanSchema.parse(planner.plan);
      for (const [id, draft] of this.reviews)
        if (draft.reportSessionId === report.id) this.reviews.delete(id);
      const reviewDraftId = randomUUID();
      const mapCandidate = (diagnosticId: string): string => {
        const live =
          report.titleCandidateIds.get(diagnosticId) ??
          report.fieldCandidateIds.get(diagnosticId);
        if (!live)
          throw new SidecarCliError(
            "TARGET_MISSING",
            "A review candidate is no longer available.",
          );
        return live;
      };
      const bundle = buildReviewBundle({
        reviewDraftId,
        reportSessionId: report.id,
        sourceSha256: report.sourceSha256,
        planSha256: planner.planSha256,
        plan,
        catalog: report.catalog,
        inventory: report.inventory,
        candidateId: mapCandidate,
      });
      this.reviews.set(reviewDraftId, {
        id: reviewDraftId,
        reportSessionId: report.id,
        sourceSha256: report.sourceSha256,
        planSha256: planner.planSha256,
        initial: bundle,
        current: bundle,
        plan,
        consumed: false,
      });
      return reviewBundleResultSchema.parse({ status: "review", bundle });
    } catch (error) {
      return reviewBundleResultSchema.parse(errorResult(error));
    }
  }

  async getReview(reviewDraftId: string): Promise<ReviewBundleResult> {
    try {
      const draft = await this.reviewDraft(reviewDraftId);
      return reviewBundleResultSchema.parse({
        status: "review",
        bundle: draft.current,
      });
    } catch (error) {
      return reviewBundleResultSchema.parse(errorResult(error));
    }
  }

  private async updateReview(
    reviewDraftId: string,
    update: (current: ReviewBundle, initial: ReviewBundle) => ReviewBundle,
  ): Promise<ReviewBundleResult> {
    try {
      const draft = await this.reviewDraft(reviewDraftId);
      draft.current = update(draft.current, draft.initial);
      return reviewBundleResultSchema.parse({
        status: "review",
        bundle: draft.current,
      });
    } catch (error) {
      return reviewBundleResultSchema.parse(errorResult(error));
    }
  }

  selectReviewCandidates(input: {
    reviewDraftId: string;
    operationId: string;
    candidateIds: string[];
  }): Promise<ReviewBundleResult> {
    return this.updateReview(input.reviewDraftId, (current) =>
      updateReviewSelection(current, input.operationId, input.candidateIds),
    );
  }

  confirmReviewOperation(input: {
    reviewDraftId: string;
    operationId: string;
  }): Promise<ReviewBundleResult> {
    return this.updateReview(input.reviewDraftId, (current) =>
      confirmReviewOperation(current, input.operationId),
    );
  }

  declineReviewOperation(input: {
    reviewDraftId: string;
    operationId: string;
  }): Promise<ReviewBundleResult> {
    return this.updateReview(input.reviewDraftId, (current) =>
      declineReviewOperation(current, input.operationId),
    );
  }

  resetReviewOperation(input: {
    reviewDraftId: string;
    operationId: string;
  }): Promise<ReviewBundleResult> {
    return this.updateReview(input.reviewDraftId, (current, initial) =>
      resetReviewOperation(current, initial, input.operationId),
    );
  }

  async createReviewedCopy(input: {
    reviewDraftId: string;
  }): Promise<ReviewedCopyResult> {
    let outputPath: string | undefined;
    let manifestPath: string | undefined;
    try {
      const draft = await this.reviewDraft(input.reviewDraftId);
      if (draft.consumed)
        throw new SidecarCliError(
          "PLAN_INVALID",
          "The reviewed-copy authorization has already been consumed.",
        );
      const report = this.report(draft.reportSessionId);
      const authorization = authorizeReviewedPlan({
        bundle: draft.current,
        plan: draft.plan,
        sourceSha256: report.sourceSha256,
        planSha256: draft.planSha256,
        candidateForId: (candidateId) =>
          report.candidateByLiveId.get(candidateId),
      });
      draft.consumed = true;
      const source = await readFile(report.sourcePath);
      if (sha256(source) !== report.sourceSha256)
        throw new SidecarCliError(
          "SOURCE_CHANGED",
          "The source changed before reviewed-copy mutation.",
        );
      const mutation = await mutateAuthorizedRdl({
        source,
        sourceFileName: basename(report.sourcePath),
        schema: await readFile(this.options.schemaPath),
        plan: draft.plan,
        authorization,
      });
      const outputDirectory = join(this.options.userDataPath, "edited-reports");
      await mkdir(outputDirectory, { recursive: true });
      const transactionId = randomUUID();
      const stem = basename(report.sourcePath, extname(report.sourcePath));
      outputPath = join(
        outputDirectory,
        `${stem}-copilot-reviewed-${transactionId}.rdl`,
      );
      manifestPath = `${outputPath}.manifest.json`;
      const manifest = genericMutationManifestSchema.parse({
        manifestVersion: 1,
        applicationVersion: "0.1.0",
        invocationSurface: "electron-sidecar",
        source: {
          filename: basename(report.sourcePath),
          sha256: report.sourceSha256,
        },
        planSha256: draft.planSha256,
        reviewAuditId: sha256(
          Buffer.from(
            `${draft.id}:${draft.sourceSha256}:${draft.planSha256}`,
            "utf8",
          ),
        ),
        confirmedOperations: authorization.operations.map(
          ({ operationId, operation }) => ({
            operationId,
            operationType: operation.type,
          }),
        ),
        declinedOperationIds: authorization.declinedOperationIds,
        selectedTargets: mutation.selectedTargets,
        output: {
          filename: basename(outputPath),
          sha256: mutation.outputSha256,
        },
        validation: {
          ...mutation.validation,
          atomicWrite: "PASS",
        },
      });
      const rdlTemporary = `${outputPath}.tmp`;
      const manifestTemporary = `${manifestPath}.tmp`;
      let rdlFinal = false;
      try {
        await writeFile(rdlTemporary, mutation.output, { flag: "wx" });
        await writeFile(
          manifestTemporary,
          `${JSON.stringify(manifest, null, 2)}\n`,
          { flag: "wx" },
        );
        await rename(rdlTemporary, outputPath);
        rdlFinal = true;
        await rename(manifestTemporary, manifestPath);
        if (sha256(await readFile(report.sourcePath)) !== report.sourceSha256)
          throw new SidecarCliError(
            "SOURCE_CHANGED",
            "The source changed during reviewed-copy completion.",
          );
      } catch (error) {
        await Promise.all([
          unlink(rdlTemporary).catch(() => undefined),
          unlink(manifestTemporary).catch(() => undefined),
          rdlFinal ? unlink(outputPath).catch(() => undefined) : undefined,
          unlink(manifestPath).catch(() => undefined),
        ]);
        throw error;
      }
      const outputHandle = randomUUID();
      this.outputs.set(outputHandle, { rdlPath: outputPath, manifestPath });
      return reviewedCopyResultSchema.parse({
        status: "complete",
        outputHandle,
        editedFilename: basename(outputPath),
        manifestFilename: basename(manifestPath),
        sourceSha256: report.sourceSha256,
        planSha256: draft.planSha256,
        outputSha256: mutation.outputSha256,
        sourceUnchanged: true,
        validation: "PASS",
      });
    } catch (error) {
      if (outputPath) await unlink(outputPath).catch(() => undefined);
      if (manifestPath) await unlink(manifestPath).catch(() => undefined);
      return reviewedCopyResultSchema.parse(errorResult(error));
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
