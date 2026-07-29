import { createHash } from "node:crypto";
import type { XmlDocument, XmlElement, XmlText } from "libxml2-wasm";
import { z } from "zod";
import { editPlanSchema, type EditOperation, type EditPlan } from "./edit-plan";
import { inspectRdlBytes } from "./inspection";
import { operationIdFor, type ReviewBundle } from "./operation-review";
import {
  assertStructuralPreservation,
  type MutationAllowlist,
} from "./structural-guard";
import type {
  TargetFieldCandidate,
  TargetTitleCandidate,
} from "./target-context";
import { catalogRdlBytes } from "./target-context";
import { validateXmlAgainstXsd } from "./xsd-validator";

const sha256 = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const local = (name: string): string => `*[local-name()='${name}']`;
const directChild = (element: XmlElement, name: string): XmlElement | null =>
  element.get(`./${local(name)}`) as XmlElement | null;

export class GenericMutationError extends Error {
  constructor(
    public readonly code:
      | "REVIEW_INCOMPLETE"
      | "REVIEW_BLOCKED"
      | "REVIEW_BINDING_MISMATCH"
      | "CANDIDATE_MISMATCH"
      | "SOURCE_CHECKSUM_MISMATCH"
      | "MUTATION_TARGET_MISSING"
      | "POST_MUTATION_VERIFICATION_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "GenericMutationError";
  }
}

type ExactCandidate = TargetTitleCandidate | TargetFieldCandidate;
export type AuthorizedReviewOperation = {
  operationId: string;
  operation: EditOperation;
  candidates: ExactCandidate[];
};
export type GenericMutationAuthorization = {
  sourceSha256: string;
  planSha256: string;
  reviewDraftId: string;
  candidateCatalogVersion: 1;
  operations: AuthorizedReviewOperation[];
  declinedOperationIds: string[];
  mutationAuthorized: true;
};

export const genericMutationManifestSchema = z
  .object({
    manifestVersion: z.literal(1),
    applicationVersion: z.enum(["0.3.0", "0.4.0-beta.1"]),
    invocationSurface: z.enum(["electron-sidecar", "test-evidence"]),
    source: z
      .object({
        filename: z.string(),
        sha256: z.string().length(64),
      })
      .strict(),
    planSha256: z.string().length(64),
    reviewAuditId: z.string().length(64),
    confirmedOperations: z.array(
      z
        .object({
          operationId: z.string().length(24),
          operationType: z.string(),
        })
        .strict(),
    ),
    declinedOperationIds: z.array(z.string().length(24)),
    selectedTargets: z.array(
      z
        .object({
          operationId: z.string().length(24),
          operationType: z.string(),
          reportItemName: z.string(),
          datasetName: z.string().nullable(),
          structuralRole: z.string(),
        })
        .strict(),
    ),
    output: z
      .object({
        filename: z.string(),
        sha256: z.string().length(64),
      })
      .strict(),
    validation: z
      .object({
        xmlParse: z.literal("PASS"),
        xsd: z.literal("PASS"),
        namespace: z.literal("PASS"),
        structuralAllowlist: z.literal("PASS"),
        operationPostconditions: z.literal("PASS"),
        finalReparse: z.literal("PASS"),
        sourceUnchanged: z.literal("PASS"),
        atomicWrite: z.literal("PASS"),
      })
      .strict(),
  })
  .strict();

export const authorizeReviewedPlan = (input: {
  bundle: ReviewBundle;
  plan: EditPlan;
  sourceSha256: string;
  planSha256: string;
  candidateForId: (candidateId: string) => ExactCandidate | undefined;
}): GenericMutationAuthorization => {
  const plan = editPlanSchema.parse(input.plan);
  if (input.bundle.operations.some(({ status }) => status === "blocked"))
    throw new GenericMutationError(
      "REVIEW_BLOCKED",
      "An atomic plan containing a blocked operation cannot be authorized.",
    );
  if (
    input.bundle.state !== "fullyReviewed" &&
    input.bundle.state !== "declined"
  )
    throw new GenericMutationError(
      "REVIEW_INCOMPLETE",
      "Every operation must be explicitly confirmed or declined.",
    );
  if (
    input.bundle.sourceSha256 !== input.sourceSha256 ||
    input.bundle.planSha256 !== input.planSha256 ||
    input.bundle.candidateCatalogVersion !== 1
  )
    throw new GenericMutationError(
      "REVIEW_BINDING_MISMATCH",
      "The review no longer matches the source, plan, or candidate catalog.",
    );
  const operations: AuthorizedReviewOperation[] = [];
  const declinedOperationIds: string[] = [];
  for (const [index, operation] of plan.operations.entries()) {
    const operationId = operationIdFor(input.planSha256, index, operation);
    const review = input.bundle.operations.find(
      ({ operationId: id }) => id === operationId,
    );
    if (!review)
      throw new GenericMutationError(
        "REVIEW_BINDING_MISMATCH",
        "A plan operation has no matching review entry.",
      );
    if (review.status === "declined") {
      declinedOperationIds.push(operationId);
      continue;
    }
    if (review.status !== "confirmed")
      throw new GenericMutationError(
        "REVIEW_INCOMPLETE",
        "A plan operation is not confirmed or declined.",
      );
    const candidates = review.selectedCandidateIds.map((candidateId) => {
      const candidate = input.candidateForId(candidateId);
      if (!candidate)
        throw new GenericMutationError(
          "CANDIDATE_MISMATCH",
          "A reviewed candidate is no longer part of the active session.",
        );
      return candidate;
    });
    const expectsField = operation.type === "setNumberFormat";
    if (
      !candidates.length ||
      candidates.some((candidate) =>
        expectsField
          ? !("fieldIdentity" in candidate)
          : "fieldIdentity" in candidate,
      )
    )
      throw new GenericMutationError(
        "CANDIDATE_MISMATCH",
        "The reviewed candidate type does not match the operation.",
      );
    if (!expectsField && candidates.length !== 1)
      throw new GenericMutationError(
        "CANDIDATE_MISMATCH",
        "Title operations require exactly one reviewed candidate.",
      );
    operations.push({ operationId, operation, candidates });
  }
  return {
    sourceSha256: input.sourceSha256,
    planSha256: input.planSha256,
    reviewDraftId: input.bundle.reviewDraftId,
    candidateCatalogVersion: 1,
    operations,
    declinedOperationIds,
    mutationAuthorized: true,
  };
};

const setElementText = (element: XmlElement, value: string): void => {
  const first = element.firstChild;
  if (!first) {
    element.addText(value);
    return;
  }
  if (first.constructor.name !== "XmlText" || first.next)
    throw new GenericMutationError(
      "MUTATION_TARGET_MISSING",
      `Expected scalar ${element.name}.`,
    );
  (first as XmlText).content = value;
};

const ensureStyleProperty = (
  style: XmlElement,
  name: string,
  value: string,
): void => {
  const existing = directChild(style, name);
  if (existing) setElementText(existing, value);
  else style.addElement(name).addText(value);
};

const textbox = (document: XmlDocument, name: string): XmlElement => {
  const matches = (
    document.find(`//*[local-name()='Textbox']`) as XmlElement[]
  ).filter((element) => element.attr("Name")?.value === name);
  if (matches.length !== 1)
    throw new GenericMutationError(
      "MUTATION_TARGET_MISSING",
      `Expected one reviewed textbox, found ${matches.length}.`,
    );
  return matches[0]!;
};

const candidateExpression = (candidate: TargetTitleCandidate): string =>
  candidate.expression.kind === "staticText"
    ? candidate.expression.text
    : candidate.expression.kind === "constantStringExpression"
      ? candidate.expression.expression
      : (() => {
          throw new GenericMutationError(
            "CANDIDATE_MISMATCH",
            "The reviewed title expression is not safely mutable.",
          );
        })();

const titleRun = (
  document: XmlDocument,
  candidate: TargetTitleCandidate,
): { textbox: XmlElement; run: XmlElement; value: XmlElement } => {
  const targetTextbox = textbox(document, candidate.reportItemName);
  const expected = candidateExpression(candidate);
  const runs = (
    targetTextbox.find(`.//${local("TextRun")}`) as XmlElement[]
  ).filter(
    (run) => directChild(run, "Value")?.content.trim() === expected.trim(),
  );
  if (runs.length !== 1)
    throw new GenericMutationError(
      "MUTATION_TARGET_MISSING",
      "The exact reviewed title run no longer exists once.",
    );
  const value = directChild(runs[0]!, "Value");
  if (!value)
    throw new GenericMutationError(
      "MUTATION_TARGET_MISSING",
      "The reviewed title value is missing.",
    );
  return { textbox: targetTextbox, run: runs[0]!, value };
};

const escapedConstant = (value: string): string =>
  `="${value.replaceAll('"', '""')}"`;

const applyAuthorized = (
  document: XmlDocument,
  authorization: GenericMutationAuthorization,
): MutationAllowlist => {
  const titleTargets: NonNullable<MutationAllowlist["titleTargets"]> = [];
  const numberFormats: MutationAllowlist["numberFormats"] = [];
  const titleRuns = new Map<
    string,
    { textbox: XmlElement; run: XmlElement; value: XmlElement }
  >();
  for (const entry of authorization.operations)
    if (
      entry.operation.type === "setText" ||
      entry.operation.type === "setTextStyle"
    ) {
      const candidate = entry.candidates[0] as TargetTitleCandidate;
      if (!titleRuns.has(candidate.diagnosticId))
        titleRuns.set(candidate.diagnosticId, titleRun(document, candidate));
    }
  for (const entry of authorization.operations) {
    const { operation } = entry;
    if (operation.type === "setText") {
      const candidate = entry.candidates[0] as TargetTitleCandidate;
      const target = titleRuns.get(candidate.diagnosticId)!;
      setElementText(
        target.value,
        candidate.expression.kind === "constantStringExpression"
          ? escapedConstant(operation.value)
          : operation.value,
      );
      titleTargets.push({
        reportItemName: candidate.reportItemName,
        expression: candidateExpression(candidate),
        titleText: true,
        titleFontSize: false,
        titleFontWeight: false,
        titleTextAlign: false,
      });
    } else if (operation.type === "setTextStyle") {
      const candidate = entry.candidates[0] as TargetTitleCandidate;
      const target = titleRuns.get(candidate.diagnosticId)!;
      const style = directChild(target.run, "Style");
      if (!style)
        throw new GenericMutationError(
          "MUTATION_TARGET_MISSING",
          "The reviewed title TextRun style is missing.",
        );
      if (operation.fontSize)
        ensureStyleProperty(style, "FontSize", operation.fontSize);
      if (operation.fontWeight)
        ensureStyleProperty(style, "FontWeight", operation.fontWeight);
      if (operation.textAlign) {
        const paragraphStyle = target.textbox.get(
          `.//${local("Paragraph")}/${local("Style")}`,
        ) as XmlElement | null;
        if (!paragraphStyle)
          throw new GenericMutationError(
            "MUTATION_TARGET_MISSING",
            "The reviewed title paragraph style is missing.",
          );
        ensureStyleProperty(paragraphStyle, "TextAlign", operation.textAlign);
      }
      titleTargets.push({
        reportItemName: candidate.reportItemName,
        expression: candidateExpression(candidate),
        titleText: false,
        titleFontSize: operation.fontSize !== undefined,
        titleFontWeight: operation.fontWeight !== undefined,
        titleTextAlign: operation.textAlign !== undefined,
      });
    } else if (operation.type === "setNumberFormat") {
      for (const rawCandidate of entry.candidates) {
        const candidate = rawCandidate as TargetFieldCandidate;
        const targetTextbox = textbox(document, candidate.reportItemName);
        const runs = (
          targetTextbox.find(`.//${local("TextRun")}`) as XmlElement[]
        ).filter(
          (run) =>
            directChild(run, "Value")?.content.trim() ===
            candidate.expression.expression.trim(),
        );
        if (runs.length !== 1)
          throw new GenericMutationError(
            "MUTATION_TARGET_MISSING",
            "The exact reviewed field display no longer exists once.",
          );
        const style = directChild(runs[0]!, "Style");
        if (!style)
          throw new GenericMutationError(
            "MUTATION_TARGET_MISSING",
            "The reviewed field display style is missing.",
          );
        ensureStyleProperty(style, "Format", operation.format);
        numberFormats.push({
          reportItemName: candidate.reportItemName,
          expression: candidate.expression.expression,
        });
      }
    } else
      throw new GenericMutationError(
        "REVIEW_BLOCKED",
        "Generic page mutation is not authorized by this workflow.",
      );
  }
  return {
    reportTitleItemName: null,
    titleTargets,
    titleText: false,
    titleFontSize: false,
    titleFontWeight: false,
    titleTextAlign: false,
    pageOrientation: false,
    numberFormats,
  };
};

const verifyCandidateIdentity = async (
  source: Uint8Array,
  authorization: GenericMutationAuthorization,
): Promise<void> => {
  const catalog = await catalogRdlBytes(source);
  if (catalog.sourceSha256 !== authorization.sourceSha256)
    throw new GenericMutationError(
      "SOURCE_CHECKSUM_MISMATCH",
      "The source no longer matches the reviewed source.",
    );
  const current = new Map(
    [...catalog.titleCandidates, ...catalog.fieldDisplayCandidates].map(
      (candidate) => [candidate.diagnosticId, candidate],
    ),
  );
  for (const entry of authorization.operations)
    for (const candidate of entry.candidates)
      if (
        JSON.stringify(current.get(candidate.diagnosticId)) !==
        JSON.stringify(candidate)
      )
        throw new GenericMutationError(
          "CANDIDATE_MISMATCH",
          "A reviewed structural candidate changed after inspection.",
        );
};

export const mutateAuthorizedRdl = async (input: {
  source: Uint8Array;
  sourceFileName: string;
  schema: Uint8Array;
  plan: EditPlan;
  authorization: GenericMutationAuthorization;
}) => {
  const plan = editPlanSchema.parse(input.plan);
  if (
    createHash("sha256").update(JSON.stringify(plan), "utf8").digest("hex") !==
    input.authorization.planSha256
  )
    throw new GenericMutationError(
      "REVIEW_BINDING_MISMATCH",
      "The typed plan no longer matches the reviewed plan identity.",
    );
  const sourceSha256 = sha256(input.source);
  if (sourceSha256 !== input.authorization.sourceSha256)
    throw new GenericMutationError(
      "SOURCE_CHECKSUM_MISMATCH",
      "The source checksum differs from the authorization.",
    );
  await verifyCandidateIdentity(input.source, input.authorization);
  const sourceInventory = await inspectRdlBytes(
    input.source,
    input.sourceFileName,
  );
  const { ParseOption, XmlDocument } = await import("libxml2-wasm");
  const document = XmlDocument.fromBuffer(input.source, {
    option: ParseOption.XML_PARSE_NONET | ParseOption.XML_PARSE_NO_XXE,
  });
  let output: Buffer;
  let allowlist: MutationAllowlist;
  try {
    allowlist = applyAuthorized(document, input.authorization);
    output = Buffer.from(document.toString(), "utf8");
  } finally {
    document.dispose();
  }
  const outputInventory = await inspectRdlBytes(output, input.sourceFileName);
  const outputCatalog = await catalogRdlBytes(output);
  if (
    outputInventory.namespace !== sourceInventory.namespace ||
    outputInventory.namespaceVersion !== sourceInventory.namespaceVersion
  )
    throw new GenericMutationError(
      "POST_MUTATION_VERIFICATION_FAILED",
      "The RDL namespace changed.",
    );
  for (const entry of input.authorization.operations) {
    const operation = entry.operation;
    for (const candidate of entry.candidates) {
      const outputTextbox = outputInventory.textboxes.find(
        ({ name }) => name === candidate.reportItemName,
      );
      if (!outputTextbox)
        throw new GenericMutationError(
          "POST_MUTATION_VERIFICATION_FAILED",
          "A reviewed output textbox is missing.",
        );
      if (operation.type === "setText") {
        if (
          !outputCatalog.titleCandidates.some(
            ({ reportItemName, visibleText }) =>
              reportItemName === candidate.reportItemName &&
              visibleText === operation.value,
          )
        )
          throw new GenericMutationError(
            "POST_MUTATION_VERIFICATION_FAILED",
            "The reviewed title text postcondition failed.",
          );
      } else if (operation.type === "setTextStyle") {
        if (
          (operation.fontSize &&
            !outputTextbox.fontSizes.includes(operation.fontSize)) ||
          (operation.fontWeight &&
            !outputTextbox.fontWeights.includes(operation.fontWeight)) ||
          (operation.textAlign &&
            !outputTextbox.textAlignments.includes(operation.textAlign))
        )
          throw new GenericMutationError(
            "POST_MUTATION_VERIFICATION_FAILED",
            "A reviewed title style postcondition failed.",
          );
      } else if (operation.type === "setNumberFormat") {
        const field = candidate as TargetFieldCandidate;
        if (
          !outputTextbox.fieldBindings.some(
            ({ expression, format }) =>
              expression === field.expression.expression &&
              format === operation.format,
          )
        )
          throw new GenericMutationError(
            "POST_MUTATION_VERIFICATION_FAILED",
            "A reviewed field-format postcondition failed.",
          );
      }
    }
  }
  const preservation = await assertStructuralPreservation(
    input.source,
    output,
    allowlist,
  );
  const xsd = await validateXmlAgainstXsd(output, input.schema);
  if (xsd.status !== "PASS")
    throw new GenericMutationError(
      "POST_MUTATION_VERIFICATION_FAILED",
      "The generated RDL failed XSD validation.",
    );
  return {
    output,
    sourceSha256,
    outputSha256: sha256(output),
    allowlist,
    preservation,
    validation: {
      xmlParse: "PASS",
      xsd: "PASS",
      namespace: "PASS",
      structuralAllowlist: "PASS",
      operationPostconditions: "PASS",
      finalReparse: "PASS",
      sourceUnchanged: "PASS",
    } as const,
    selectedTargets: input.authorization.operations.flatMap((entry) =>
      entry.candidates.map((candidate) => ({
        operationId: entry.operationId,
        operationType: entry.operation.type,
        reportItemName: candidate.reportItemName,
        datasetName:
          "fieldIdentity" in candidate
            ? candidate.fieldIdentity.certainty === "certain"
              ? candidate.fieldIdentity.datasetName
              : null
            : null,
        structuralRole: candidate.scope.role,
      })),
    ),
  };
};
