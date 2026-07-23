import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import {
  basename,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { z } from "zod";
import { findMonorepoRoot } from "./approved-resources";
import { editPlanSchema, type EditPlan } from "./edit-plan";
import {
  createEditPlannerContext,
  LocalSentenceEditPlanner,
  type EditPlannerResult,
} from "./edit-planner";
import {
  inspectRdlFile,
  maximumRdlBytes,
  resolveConfiguredReportTitle,
  resolveFieldDisplays,
  type RdlInventory,
} from "./inspection";
import { mutateExistingRdl } from "./mutation";

const hash = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

export const sidecarCliVersion = 1;
export const controlledOutputRelativePath =
  "artifacts/existing-rdl-sidecar/edited-reports";
export const canonicalSourceSha256 =
  "c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a";

export type SidecarCliErrorCode =
  | "SOURCE_NOT_FOUND"
  | "SOURCE_NOT_REGULAR_FILE"
  | "SOURCE_EXTENSION_INVALID"
  | "SOURCE_TOO_LARGE"
  | "SOURCE_XML_INVALID"
  | "SOURCE_XSD_INVALID"
  | "REQUEST_NOT_FOUND"
  | "REQUEST_INVALID_UTF8"
  | "REQUEST_TOO_LARGE"
  | "PLANNER_REJECTED"
  | "PLAN_INVALID"
  | "TARGET_MISSING"
  | "TARGET_AMBIGUOUS"
  | "TARGET_COUNT_MISMATCH"
  | "SOURCE_CHANGED"
  | "MUTATION_FAILED"
  | "STRUCTURAL_GUARD_FAILED"
  | "OUTPUT_VALIDATION_FAILED"
  | "OUTPUT_WRITE_FAILED"
  | "MANIFEST_WRITE_FAILED"
  | "ARGUMENT_INVALID";

export class SidecarCliError extends Error {
  constructor(
    public readonly code: SidecarCliErrorCode,
    message: string,
    public readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "SidecarCliError";
  }
}

const passSchema = z.literal("PASS");
const resolvedTargetSchema = z
  .object({
    semanticTarget: z.string(),
    reportItemName: z.string(),
    evidence: z.array(z.string()),
    expectedBefore: z.string(),
    expectedAfter: z.string(),
  })
  .strict();

export const sidecarAuditManifestSchema = z
  .object({
    manifestVersion: z.literal(1),
    applicationVersion: z.literal("0.1.0"),
    createdAt: z.string().datetime({ offset: true }),
    transactionId: z.string().uuid(),
    invocationSurface: z
      .enum(["cli", "electron-sidecar"])
      .optional()
      .default("cli"),
    planner: z
      .object({
        implementation: z.literal("LocalSentenceEditPlanner"),
        version: z.literal(1),
      })
      .strict(),
    source: z
      .object({
        resolvedPath: z.string(),
        filename: z.string(),
        sha256BeforeInspection: z.string().length(64),
        sha256BeforeMutation: z.string().length(64),
        sha256AfterCompletion: z.string().length(64),
        namespace: z.string(),
        fileSize: z.number().int().nonnegative(),
      })
      .strict(),
    request: z
      .object({
        originalUtf8Sentence: z.string(),
        normalizedRequest: z.string(),
      })
      .strict(),
    plan: z
      .object({ validated: editPlanSchema, sha256: z.string().length(64) })
      .strict(),
    proposal: z.array(z.string()),
    recognizedClauses: z.array(
      z
        .object({
          kind: z.enum(["title", "titleStyle", "orientation", "numberFormat"]),
          start: z.number().int().nonnegative(),
          end: z.number().int().positive(),
          text: z.string(),
        })
        .strict(),
    ),
    inspectedContextSummary: z
      .object({
        datasetNames: z.array(z.string()),
        fieldNames: z.array(z.string()),
        reportSectionCount: z.number().int().nonnegative(),
        textboxCount: z.number().int().nonnegative(),
        tablixNames: z.array(z.string()),
        pageOrientation: z.enum(["portrait", "landscape", "square"]),
      })
      .strict(),
    resolvedTargets: z.array(resolvedTargetSchema),
    output: z
      .object({
        resolvedPath: z.string(),
        filename: z.string(),
        sha256: z.string().length(64),
        fileSize: z.number().int().nonnegative(),
      })
      .strict(),
    validation: z
      .object({
        editPlan: passSchema,
        xmlParse: passSchema,
        xsd: passSchema,
        namespace: passSchema,
        targetCounts: passSchema,
        operationPostconditions: passSchema,
        structuralAllowlist: passSchema,
        embeddedDataPreservation: passSchema,
        finalReparse: passSchema,
        sourceUnchanged: passSchema,
        atomicWriteCompletion: passSchema,
      })
      .strict(),
    preservationHashes: z
      .object({
        completeSemanticProjection: z.string().length(64),
        embeddedData: z.string().length(64),
        datasetsAndFields: z.string().length(64),
        tablixHierarchy: z.string().length(64),
        pageBehavior: z.string().length(64),
        footer: z.string().length(64),
      })
      .strict(),
    warnings: z.array(z.string()),
  })
  .strict();
export type SidecarAuditManifest = z.infer<typeof sidecarAuditManifestSchema>;

export const sidecarPlanResultSchema = z
  .object({
    mode: z.literal("plan"),
    sourcePath: z.string(),
    sourceFileName: z.string(),
    sourceSha256: z.string().length(64),
    requestPath: z.string(),
    normalizedRequest: z.string(),
    plan: editPlanSchema,
    planSha256: z.string().length(64),
    proposal: z.array(z.string()),
    resolvedTargets: z.array(resolvedTargetSchema),
    noFilesChanged: z.literal(true),
  })
  .strict();

export const sidecarApplyResultSchema = z
  .object({
    mode: z.literal("apply"),
    sourcePath: z.string(),
    sourceSha256: z.string().length(64),
    planSha256: z.string().length(64),
    resolvedTargets: z.array(resolvedTargetSchema),
    outputPath: z.string(),
    outputSha256: z.string().length(64),
    manifestPath: z.string(),
    validation: passSchema,
    sourceUnchanged: z.literal(true),
  })
  .strict();

export type SidecarPlanResult = z.infer<typeof sidecarPlanResultSchema>;
export type SidecarApplyResult = z.infer<typeof sidecarApplyResultSchema>;

type ParsedArguments =
  | { mode: "help" }
  | { mode: "plan" | "apply"; source: string; requestFile: string };

export const sidecarCliHelp = `Usage:
  pnpm sidecar:cli -- plan --source <report.rdl> --request-file <request.txt>
  pnpm sidecar:cli -- apply --source <report.rdl> --request-file <request.txt>

The output directory and mutation targets are application-controlled.`;

export const parseSidecarCliArguments = (
  arguments_: string[],
): ParsedArguments => {
  if (arguments_[0] === "--") arguments_ = arguments_.slice(1);
  if (
    arguments_.length === 0 ||
    arguments_.includes("--help") ||
    arguments_.includes("-h")
  )
    return { mode: "help" };
  const mode = arguments_[0];
  if (mode !== "plan" && mode !== "apply")
    throw new SidecarCliError(
      "ARGUMENT_INVALID",
      "Expected plan or apply mode.",
    );
  const allowed = new Set(["--source", "--request-file"]);
  const values = new Map<string, string>();
  for (let index = 1; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    if (!flag || !allowed.has(flag) || !value || value.startsWith("--"))
      throw new SidecarCliError(
        "ARGUMENT_INVALID",
        `Unknown or incomplete argument: ${flag ?? "(missing)"}.`,
      );
    if (values.has(flag))
      throw new SidecarCliError(
        "ARGUMENT_INVALID",
        `Duplicate argument: ${flag}.`,
      );
    values.set(flag, value);
  }
  const source = values.get("--source");
  const requestFile = values.get("--request-file");
  if (!source)
    throw new SidecarCliError("ARGUMENT_INVALID", "Missing required --source.");
  if (!requestFile)
    throw new SidecarCliError(
      "ARGUMENT_INVALID",
      "Missing required --request-file.",
    );
  return { mode, source, requestFile };
};

export const decodeStrictUtf8Request = (bytes: Uint8Array): string => {
  let value: string;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new SidecarCliError(
      "REQUEST_INVALID_UTF8",
      "The request file is not valid UTF-8.",
    );
  }
  return value.startsWith("\uFEFF") ? value.slice(1) : value;
};

const readRequestFile = async (
  path: string,
): Promise<{ path: string; value: string }> => {
  let canonical: string;
  try {
    canonical = await realpath(resolve(path));
  } catch {
    throw new SidecarCliError(
      "REQUEST_NOT_FOUND",
      "The request file was not found.",
    );
  }
  const bytes = await readFile(canonical);
  if (bytes.byteLength > 8192)
    throw new SidecarCliError(
      "REQUEST_TOO_LARGE",
      "The request exceeds 8,192 bytes.",
    );
  return { path: canonical, value: decodeStrictUtf8Request(bytes) };
};

const resolveSource = async (
  source: string,
): Promise<{
  path: string;
  bytes: Buffer;
  metadata: Awaited<ReturnType<typeof stat>>;
}> => {
  if (extname(source).toLocaleLowerCase("en-US") !== ".rdl")
    throw new SidecarCliError(
      "SOURCE_EXTENSION_INVALID",
      "The source must be an .rdl file.",
    );
  let path: string;
  try {
    path = await realpath(resolve(source));
  } catch {
    throw new SidecarCliError(
      "SOURCE_NOT_FOUND",
      "The source RDL was not found.",
    );
  }
  const metadata = await stat(path);
  if (!metadata.isFile())
    throw new SidecarCliError(
      "SOURCE_NOT_REGULAR_FILE",
      "The source RDL is not a regular file.",
    );
  if (metadata.size > maximumRdlBytes)
    throw new SidecarCliError(
      "SOURCE_TOO_LARGE",
      "The source RDL is too large.",
    );
  return { path, bytes: await readFile(path), metadata };
};

const resolveTargets = (inventory: RdlInventory, plan: EditPlan) => {
  const targets: z.infer<typeof resolvedTargetSchema>[] = [];
  const titleOperation = plan.operations.find(({ type }) => type === "setText");
  const titleStyle = plan.operations.find(
    ({ type }) => type === "setTextStyle",
  );
  if (
    titleOperation?.type === "setText" ||
    titleStyle?.type === "setTextStyle"
  ) {
    const target = resolveConfiguredReportTitle(inventory);
    const textbox = inventory.textboxes.find(
      ({ name }) => name === target.reportItemName,
    );
    if (!textbox)
      throw new SidecarCliError(
        "TARGET_MISSING",
        "The report title target is missing.",
      );
    if (titleOperation?.type === "setText")
      targets.push({
        semanticTarget: "reportTitle.text",
        reportItemName: target.reportItemName,
        evidence: target.evidence,
        expectedBefore: textbox.staticText[0] ?? "(missing)",
        expectedAfter: titleOperation.value,
      });
    if (titleStyle?.type === "setTextStyle") {
      if (titleStyle.fontSize)
        targets.push({
          semanticTarget: "reportTitle.fontSize",
          reportItemName: target.reportItemName,
          evidence: target.evidence,
          expectedBefore: textbox.fontSizes[0] ?? "(implicit)",
          expectedAfter: titleStyle.fontSize,
        });
      if (titleStyle.fontWeight)
        targets.push({
          semanticTarget: "reportTitle.fontWeight",
          reportItemName: target.reportItemName,
          evidence: target.evidence,
          expectedBefore: textbox.fontWeights[0] ?? "(implicit)",
          expectedAfter: titleStyle.fontWeight,
        });
    }
  }
  const orientation = plan.operations.find(
    ({ type }) => type === "setPageOrientation",
  );
  if (orientation?.type === "setPageOrientation")
    targets.push({
      semanticTarget: "report.pageOrientation",
      reportItemName: "ReportSection0/Page",
      evidence: [
        `existing PageWidth ${inventory.reportSections[0]?.pageWidth}`,
        `existing PageHeight ${inventory.reportSections[0]?.pageHeight}`,
      ],
      expectedBefore: inventory.reportSections[0]?.orientation ?? "missing",
      expectedAfter: orientation.orientation,
    });
  for (const operation of plan.operations)
    if (operation.type === "setNumberFormat") {
      const resolved = resolveFieldDisplays(
        inventory,
        operation.target.fieldName,
      );
      if (
        operation.target.fieldName === "Revenue" &&
        resolved.reportItemNames.length !== 3
      )
        throw new SidecarCliError(
          "TARGET_COUNT_MISMATCH",
          `Expected exactly three Revenue displays; found ${resolved.reportItemNames.length}.`,
        );
      for (const [
        index,
        reportItemName,
      ] of resolved.reportItemNames.entries()) {
        const textbox = inventory.textboxes.find(
          ({ name }) => name === reportItemName,
        );
        const binding = textbox?.fieldBindings.find(
          ({ fieldName }) => fieldName === operation.target.fieldName,
        );
        targets.push({
          semanticTarget: `fieldDisplay.${operation.target.fieldName}.format`,
          reportItemName,
          evidence: [resolved.evidence[index]!],
          expectedBefore: binding?.format ?? "(implicit)",
          expectedAfter: operation.format,
        });
      }
    }
  return targets;
};

export type PreparedSidecarEdit = {
  source: Awaited<ReturnType<typeof resolveSource>>;
  request: Awaited<ReturnType<typeof readRequestFile>>;
  inventory: RdlInventory;
  plannerResult: Extract<EditPlannerResult, { status: "planned" }>;
  plan: EditPlan;
  targets: z.infer<typeof resolvedTargetSchema>[];
};

export const prepareSidecarEdit = async (input: {
  sourcePath: string;
  requestFilePath: string;
}): Promise<PreparedSidecarEdit> => {
  const source = await resolveSource(input.sourcePath);
  let inventory: RdlInventory;
  try {
    inventory = await inspectRdlFile(source.path);
  } catch (error) {
    throw new SidecarCliError(
      "SOURCE_XML_INVALID",
      "The source RDL could not be inspected.",
      { causeCode: error instanceof Error ? error.name : "unknown" },
    );
  }
  const request = await readRequestFile(input.requestFilePath);
  const plannerResult = new LocalSentenceEditPlanner().plan(
    request.value,
    createEditPlannerContext(inventory),
  );
  if (plannerResult.status === "rejected")
    throw new SidecarCliError(
      "PLANNER_REJECTED",
      `${plannerResult.code}: ${plannerResult.message}`,
      {
        plannerCode: plannerResult.code,
        unsupportedFragments: plannerResult.unsupportedFragments,
      },
    );
  let plan: EditPlan;
  try {
    plan = editPlanSchema.parse(plannerResult.plan);
  } catch {
    throw new SidecarCliError("PLAN_INVALID", "The planned edit is invalid.");
  }
  let targets: z.infer<typeof resolvedTargetSchema>[];
  try {
    targets = resolveTargets(inventory, plan);
  } catch (error) {
    if (error instanceof SidecarCliError) throw error;
    const message =
      error instanceof Error ? error.message : "Target resolution failed.";
    const code = /ambiguous/iu.test(message)
      ? "TARGET_AMBIGUOUS"
      : "TARGET_MISSING";
    throw new SidecarCliError(code, message);
  }
  return { source, request, inventory, plannerResult, plan, targets };
};

export const prepareSidecarEditFromText = async (input: {
  sourcePath: string;
  request: string;
}): Promise<PreparedSidecarEdit> => {
  const source = await resolveSource(input.sourcePath);
  let inventory: RdlInventory;
  try {
    inventory = await inspectRdlFile(source.path);
  } catch (error) {
    throw new SidecarCliError(
      "SOURCE_XML_INVALID",
      "The source RDL could not be inspected.",
      { causeCode: error instanceof Error ? error.name : "unknown" },
    );
  }
  if (Buffer.byteLength(input.request, "utf8") > 8192)
    throw new SidecarCliError(
      "REQUEST_TOO_LARGE",
      "The request exceeds 8,192 UTF-8 bytes.",
    );
  const plannerResult = new LocalSentenceEditPlanner().plan(
    input.request,
    createEditPlannerContext(inventory),
  );
  if (plannerResult.status === "rejected")
    throw new SidecarCliError(
      "PLANNER_REJECTED",
      `${plannerResult.code}: ${plannerResult.message}`,
      {
        plannerCode: plannerResult.code,
        unsupportedFragments: plannerResult.unsupportedFragments,
      },
    );
  const plan = editPlanSchema.parse(plannerResult.plan);
  const targets = resolveTargets(inventory, plan);
  return {
    source,
    request: { path: "(electron input)", value: input.request },
    inventory,
    plannerResult,
    plan,
    targets,
  };
};

const assertInside = (root: string, path: string): void => {
  const child = relative(root, path);
  if (!child || child.startsWith("..") || isAbsolute(child))
    throw new SidecarCliError(
      "OUTPUT_WRITE_FAILED",
      "The controlled output escaped the repository root.",
    );
};

const reserveOutputName = async (
  directory: string,
  sourceFileName: string,
): Promise<{ outputPath: string; manifestPath: string; lockPath: string }> => {
  const stem = basename(sourceFileName, extname(sourceFileName));
  for (let suffix = 1; suffix <= 10_000; suffix += 1) {
    const discriminator = suffix === 1 ? "" : `-${suffix}`;
    const outputPath = join(
      directory,
      `${stem}-copilot-edited${discriminator}.rdl`,
    );
    const manifestPath = `${outputPath}.manifest.json`;
    const lockPath = `${outputPath}.lock`;
    try {
      const handle = await open(lockPath, "wx");
      await handle.close();
      const finalExists = async (path: string): Promise<boolean> => {
        try {
          await stat(path);
          return true;
        } catch {
          return false;
        }
      };
      if (
        (await finalExists(outputPath)) ||
        (await finalExists(manifestPath))
      ) {
        await unlink(lockPath);
        continue;
      }
      return { outputPath, manifestPath, lockPath };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
      throw error;
    }
  }
  throw new SidecarCliError(
    "OUTPUT_WRITE_FAILED",
    "No duplicate-safe output name was available.",
  );
};

export type SidecarTransactionHooks = {
  beforeSourceRecheck?: () => Promise<void>;
  beforeRdlTemporaryWrite?: () => Promise<void>;
  beforeManifestTemporaryWrite?: () => Promise<void>;
  beforeRdlRename?: () => Promise<void>;
  beforeManifestRename?: () => Promise<void>;
};

const writeSyncedExclusive = async (
  path: string,
  value: Uint8Array,
): Promise<void> => {
  const handle = await open(path, "wx");
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }
};

export const planExistingRdlSidecar = async (input: {
  sourcePath: string;
  requestFilePath: string;
}): Promise<SidecarPlanResult> => {
  const prepared = await prepareSidecarEdit(input);
  return sidecarPlanResultSchema.parse({
    mode: "plan",
    sourcePath: prepared.source.path,
    sourceFileName: basename(prepared.source.path),
    sourceSha256: hash(prepared.source.bytes),
    requestPath: prepared.request.path,
    normalizedRequest: prepared.plannerResult.normalizedRequest,
    plan: prepared.plan,
    planSha256: prepared.plannerResult.planSha256,
    proposal: prepared.plannerResult.proposal,
    resolvedTargets: prepared.targets,
    noFilesChanged: true,
  });
};

export const applyExistingRdlSidecar = async (
  input: {
    sourcePath: string;
    requestFilePath: string;
    startPaths?: readonly string[];
  },
  hooks: SidecarTransactionHooks = {},
): Promise<SidecarApplyResult> => {
  const prepared = await prepareSidecarEdit(input);
  const repositoryRoot = findMonorepoRoot(
    input.startPaths ?? [import.meta.dirname, prepared.source.path],
  );
  const outputDirectory = resolve(repositoryRoot, controlledOutputRelativePath);
  const schemaPath = resolve(
    repositoryRoot,
    "packages/rdl-spike/schema/ReportDefinition-2016.xsd",
  );
  return applyPreparedSidecarEdit(
    prepared,
    {
      outputDirectory,
      controlledRoot: repositoryRoot,
      schemaPath,
      invocationSurface: "cli",
    },
    hooks,
  );
};

export const applyPreparedSidecarEdit = async (
  prepared: PreparedSidecarEdit,
  options: {
    outputDirectory: string;
    controlledRoot: string;
    schemaPath: string;
    invocationSurface: "cli" | "electron-sidecar";
  },
  hooks: SidecarTransactionHooks = {},
): Promise<SidecarApplyResult> => {
  const initialSha256 = hash(prepared.source.bytes);
  const outputDirectory = resolve(options.outputDirectory);
  const controlledRoot = resolve(options.controlledRoot);
  assertInside(controlledRoot, outputDirectory);
  const schemaPath = resolve(options.schemaPath);
  await hooks.beforeSourceRecheck?.();
  const sourceBeforeMutation = await readFile(prepared.source.path);
  const sourceBeforeMutationSha256 = hash(sourceBeforeMutation);
  if (sourceBeforeMutationSha256 !== initialSha256)
    throw new SidecarCliError(
      "SOURCE_CHANGED",
      "The source changed after inspection; no output was written.",
    );

  let mutation: Awaited<ReturnType<typeof mutateExistingRdl>>;
  try {
    mutation = await mutateExistingRdl({
      source: sourceBeforeMutation,
      sourceFileName: basename(prepared.source.path),
      expectedSourceSha256: initialSha256,
      plan: prepared.plan,
      schema: await readFile(schemaPath),
    });
  } catch (error) {
    throw new SidecarCliError(
      "MUTATION_FAILED",
      "The deterministic RDL mutation failed.",
      { causeCode: error instanceof Error ? error.name : "unknown" },
    );
  }

  await mkdir(outputDirectory, { recursive: true });
  const [canonicalRepositoryRoot, canonicalOutputDirectory] = await Promise.all(
    [realpath(controlledRoot), realpath(outputDirectory)],
  );
  assertInside(canonicalRepositoryRoot, canonicalOutputDirectory);
  const reservation = await reserveOutputName(
    canonicalOutputDirectory,
    basename(prepared.source.path),
  );
  const transactionId = randomUUID();
  const createdAt = new Date().toISOString();
  const manifest = sidecarAuditManifestSchema.parse({
    manifestVersion: 1,
    applicationVersion: "0.1.0",
    createdAt,
    transactionId,
    invocationSurface: options.invocationSurface,
    planner: { implementation: "LocalSentenceEditPlanner", version: 1 },
    source: {
      resolvedPath: prepared.source.path,
      filename: basename(prepared.source.path),
      sha256BeforeInspection: initialSha256,
      sha256BeforeMutation: sourceBeforeMutationSha256,
      sha256AfterCompletion: initialSha256,
      namespace: prepared.inventory.namespace,
      fileSize: prepared.source.metadata.size,
    },
    request: {
      originalUtf8Sentence: prepared.request.value,
      normalizedRequest: prepared.plannerResult.normalizedRequest,
    },
    plan: {
      validated: prepared.plan,
      sha256: prepared.plannerResult.planSha256,
    },
    proposal: prepared.plannerResult.proposal,
    recognizedClauses: prepared.plannerResult.recognizedClauses,
    inspectedContextSummary: {
      datasetNames: prepared.inventory.datasets.map(({ name }) => name),
      fieldNames: [
        ...new Set(prepared.inventory.datasets.flatMap(({ fields }) => fields)),
      ],
      reportSectionCount: prepared.inventory.reportSections.length,
      textboxCount: prepared.inventory.textboxes.length,
      tablixNames: prepared.inventory.tablixes.map(({ name }) => name),
      pageOrientation:
        prepared.inventory.reportSections[0]?.orientation ?? "square",
    },
    resolvedTargets: prepared.targets,
    output: {
      resolvedPath: reservation.outputPath,
      filename: basename(reservation.outputPath),
      sha256: mutation.outputSha256,
      fileSize: mutation.output.byteLength,
    },
    validation: {
      editPlan: "PASS",
      xmlParse: "PASS",
      xsd: "PASS",
      namespace: "PASS",
      targetCounts: "PASS",
      operationPostconditions: "PASS",
      structuralAllowlist: "PASS",
      embeddedDataPreservation: "PASS",
      finalReparse: "PASS",
      sourceUnchanged: "PASS",
      atomicWriteCompletion: "PASS",
    },
    preservationHashes: {
      completeSemanticProjection:
        mutation.preservation.semanticProjectionSha256,
      embeddedData: mutation.preservation.embeddedDataSha256,
      datasetsAndFields: mutation.preservation.datasetsSha256,
      tablixHierarchy: mutation.preservation.tablixHierarchyProjectionSha256,
      pageBehavior: mutation.preservation.pageBehaviorSha256,
      footer: mutation.preservation.footerSha256,
    },
    warnings: [],
  });
  const manifestBytes = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  const rdlTemporary = `${reservation.outputPath}.${transactionId}.tmp`;
  const manifestTemporary = `${reservation.manifestPath}.${transactionId}.tmp`;
  let rdlFinal = false;
  let manifestFinal = false;
  try {
    await hooks.beforeRdlTemporaryWrite?.();
    await writeSyncedExclusive(rdlTemporary, mutation.output);
    await hooks.beforeManifestTemporaryWrite?.();
    await writeSyncedExclusive(manifestTemporary, manifestBytes);
    await hooks.beforeRdlRename?.();
    await rename(rdlTemporary, reservation.outputPath);
    rdlFinal = true;
    await hooks.beforeManifestRename?.();
    await rename(manifestTemporary, reservation.manifestPath);
    manifestFinal = true;
    const sourceAfter = await readFile(prepared.source.path);
    if (hash(sourceAfter) !== initialSha256)
      throw new SidecarCliError(
        "SOURCE_CHANGED",
        "The source changed during completion; outputs were rolled back.",
      );
  } catch (error) {
    await Promise.all([
      unlink(rdlTemporary).catch(() => undefined),
      unlink(manifestTemporary).catch(() => undefined),
      rdlFinal
        ? unlink(reservation.outputPath).catch(() => undefined)
        : undefined,
      manifestFinal
        ? unlink(reservation.manifestPath).catch(() => undefined)
        : undefined,
    ]);
    if (error instanceof SidecarCliError) throw error;
    throw new SidecarCliError(
      rdlFinal ? "MANIFEST_WRITE_FAILED" : "OUTPUT_WRITE_FAILED",
      "The output transaction failed and was rolled back.",
    );
  } finally {
    await unlink(reservation.lockPath).catch(() => undefined);
  }
  return sidecarApplyResultSchema.parse({
    mode: "apply",
    sourcePath: prepared.source.path,
    sourceSha256: initialSha256,
    planSha256: prepared.plannerResult.planSha256,
    resolvedTargets: prepared.targets,
    outputPath: reservation.outputPath,
    outputSha256: mutation.outputSha256,
    manifestPath: reservation.manifestPath,
    validation: "PASS",
    sourceUnchanged: true,
  });
};

export const formatPlanOutput = (result: SidecarPlanResult): string =>
  [
    "EDIT PLAN",
    "",
    `Source: ${result.sourceFileName}`,
    `Source SHA-256: ${result.sourceSha256}`,
    `Plan SHA-256: ${result.planSha256}`,
    "",
    "Proposal:",
    ...result.proposal.map((entry) => `- ${entry}`),
    "",
    "Resolved targets:",
    ...result.resolvedTargets.map(
      (target) =>
        `- ${target.reportItemName}: ${target.semanticTarget} (${target.expectedBefore} -> ${target.expectedAfter})`,
    ),
    "",
    "NO FILE HAS BEEN CHANGED",
  ].join("\n");

export const formatApplyOutput = (result: SidecarApplyResult): string =>
  [
    "EDIT COMPLETE",
    "",
    `Source: ${basename(result.sourcePath)}`,
    `Source SHA-256: ${result.sourceSha256}`,
    `Plan SHA-256: ${result.planSha256}`,
    "",
    "Resolved targets:",
    ...[
      ...new Set(
        result.resolvedTargets.map(({ reportItemName }) => reportItemName),
      ),
    ].map((name) => `- ${name}`),
    "",
    `Edited RDL: ${result.outputPath}`,
    `Edited SHA-256: ${result.outputSha256}`,
    `Manifest: ${result.manifestPath}`,
    "Validation: PASS",
    "Original source: UNCHANGED",
  ].join("\n");

export const runSidecarCli = async (
  arguments_: string[],
  io: { stdout: (value: string) => void; stderr: (value: string) => void },
): Promise<number> => {
  try {
    const argumentsResult = parseSidecarCliArguments(arguments_);
    if (argumentsResult.mode === "help") {
      io.stdout(sidecarCliHelp);
      return 0;
    }
    const input = {
      sourcePath: argumentsResult.source,
      requestFilePath: argumentsResult.requestFile,
    };
    if (argumentsResult.mode === "plan")
      io.stdout(formatPlanOutput(await planExistingRdlSidecar(input)));
    else io.stdout(formatApplyOutput(await applyExistingRdlSidecar(input)));
    return 0;
  } catch (error) {
    const failure =
      error instanceof SidecarCliError
        ? error
        : new SidecarCliError(
            "MUTATION_FAILED",
            "The sidecar operation failed.",
          );
    io.stderr(`${failure.code}: ${failure.message}`);
    if (
      failure.code === "PLANNER_REJECTED" &&
      Array.isArray(failure.details.unsupportedFragments)
    )
      io.stderr(
        `Unsupported: ${failure.details.unsupportedFragments.join(" | ")}`,
      );
    return 1;
  }
};
