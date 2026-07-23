import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import type { XmlDocument, XmlElement, XmlText } from "libxml2-wasm";
import type { EditPlan } from "./edit-plan";
import { editPlanSchema } from "./edit-plan";
import {
  inspectRdlBytes,
  resolveConfiguredReportTitle,
  resolveFieldDisplays,
  type RdlInventory,
  type ResolvedFieldDisplayTarget,
  type ResolvedReportItemTarget,
} from "./inspection";
import {
  assertStructuralPreservation,
  type MutationAllowlist,
} from "./structural-guard";
import { validateXmlAgainstXsd } from "./xsd-validator";

const sha256 = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const local = (name: string): string => `*[local-name()='${name}']`;

export class RdlMutationError extends Error {
  constructor(
    public readonly code:
      | "SOURCE_CHECKSUM_MISMATCH"
      | "SOURCE_CHANGED"
      | "INVALID_OUTPUT"
      | "TARGET_COUNT_MISMATCH"
      | "MUTATION_TARGET_MISSING"
      | "POST_MUTATION_VERIFICATION_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "RdlMutationError";
  }
}

const setElementText = (element: XmlElement, value: string): void => {
  const first = element.firstChild;
  if (!first) {
    element.addText(value);
    return;
  }
  if (first.constructor.name !== "XmlText" || first.next)
    throw new RdlMutationError(
      "MUTATION_TARGET_MISSING",
      `Expected scalar ${element.name}`,
    );
  (first as XmlText).content = value;
};

const directChild = (element: XmlElement, name: string): XmlElement | null =>
  element.get(`./${local(name)}`) as XmlElement | null;

const textboxByName = (document: XmlDocument, name: string): XmlElement => {
  const matches = (
    document.find(`//*[local-name()='Textbox']`) as XmlElement[]
  ).filter((textbox) => textbox.attr("Name")?.value === name);
  if (matches.length !== 1)
    throw new RdlMutationError(
      "MUTATION_TARGET_MISSING",
      `Expected one textbox named ${name}, found ${matches.length}`,
    );
  return matches[0]!;
};

const ensureStyleProperty = (
  style: XmlElement,
  name: string,
  value: string,
): void => {
  const property = directChild(style, name);
  if (property) setElementText(property, value);
  else style.addElement(name).addText(value);
};

const resolveTargets = (inventory: RdlInventory, plan: EditPlan) => {
  const needsTitle = plan.operations.some(
    ({ type }) => type === "setText" || type === "setTextStyle",
  );
  const title = needsTitle ? resolveConfiguredReportTitle(inventory) : null;
  const fields = new Map<string, ResolvedFieldDisplayTarget>();
  for (const operation of plan.operations)
    if (operation.type === "setNumberFormat") {
      const target = resolveFieldDisplays(
        inventory,
        operation.target.fieldName,
      );
      if (
        operation.target.fieldName === "Revenue" &&
        target.reportItemNames.length !== 3
      )
        throw new RdlMutationError(
          "TARGET_COUNT_MISMATCH",
          `Expected exactly three Revenue displays, found ${target.reportItemNames.length}`,
        );
      fields.set(operation.target.fieldName, target);
    }
  return { title, fields };
};

const mutationAllowlist = (
  plan: EditPlan,
  title: ResolvedReportItemTarget | null,
  fields: Map<string, ResolvedFieldDisplayTarget>,
): MutationAllowlist => {
  const style = plan.operations.find(({ type }) => type === "setTextStyle");
  const numberFormats = plan.operations.flatMap((operation) => {
    if (operation.type !== "setNumberFormat") return [];
    const resolved = fields.get(operation.target.fieldName);
    if (!resolved) return [];
    return resolved.reportItemNames.map((reportItemName, index) => ({
      reportItemName,
      expression: resolved.expressions[index]!,
    }));
  });
  return {
    reportTitleItemName: title?.reportItemName ?? null,
    titleText: plan.operations.some(({ type }) => type === "setText"),
    titleFontSize:
      style?.type === "setTextStyle" && style.fontSize !== undefined,
    titleFontWeight:
      style?.type === "setTextStyle" && style.fontWeight !== undefined,
    titleTextAlign:
      style?.type === "setTextStyle" && style.textAlign !== undefined,
    pageOrientation: plan.operations.some(
      ({ type }) => type === "setPageOrientation",
    ),
    numberFormats,
  };
};

const titleRunAndStyle = (
  document: XmlDocument,
  target: ResolvedReportItemTarget,
): { run: XmlElement; style: XmlElement; textbox: XmlElement } => {
  const textbox = textboxByName(document, target.reportItemName);
  const runs = textbox.find(`.//${local("TextRun")}`) as XmlElement[];
  if (runs.length !== 1)
    throw new RdlMutationError(
      "MUTATION_TARGET_MISSING",
      `Expected one title TextRun, found ${runs.length}`,
    );
  const run = runs[0]!;
  const style = directChild(run, "Style");
  if (!style)
    throw new RdlMutationError(
      "MUTATION_TARGET_MISSING",
      "Title Style is missing",
    );
  return { run, style, textbox };
};

const applyPlan = (
  document: XmlDocument,
  plan: EditPlan,
  title: ResolvedReportItemTarget | null,
  fields: Map<string, ResolvedFieldDisplayTarget>,
): void => {
  for (const operation of plan.operations) {
    if (operation.type === "setText") {
      if (!title)
        throw new RdlMutationError(
          "MUTATION_TARGET_MISSING",
          "Title target is missing",
        );
      const { run } = titleRunAndStyle(document, title);
      const value = directChild(run, "Value");
      if (!value)
        throw new RdlMutationError(
          "MUTATION_TARGET_MISSING",
          "Title Value is missing",
        );
      setElementText(value, operation.value);
    } else if (operation.type === "setTextStyle") {
      if (!title)
        throw new RdlMutationError(
          "MUTATION_TARGET_MISSING",
          "Title target is missing",
        );
      const { style, textbox } = titleRunAndStyle(document, title);
      if (operation.fontSize)
        ensureStyleProperty(style, "FontSize", operation.fontSize);
      if (operation.fontWeight)
        ensureStyleProperty(style, "FontWeight", operation.fontWeight);
      if (operation.textAlign) {
        const paragraphStyle = textbox.get(
          `.//${local("Paragraph")}/${local("Style")}`,
        ) as XmlElement | null;
        if (!paragraphStyle)
          throw new RdlMutationError(
            "MUTATION_TARGET_MISSING",
            "Title paragraph Style is missing",
          );
        ensureStyleProperty(paragraphStyle, "TextAlign", operation.textAlign);
      }
    } else if (operation.type === "setPageOrientation") {
      const pages = document.find(`//${local("Page")}`) as XmlElement[];
      if (pages.length === 0)
        throw new RdlMutationError("MUTATION_TARGET_MISSING", "No Page found");
      for (const page of pages) {
        const width = directChild(page, "PageWidth");
        const height = directChild(page, "PageHeight");
        if (!width || !height)
          throw new RdlMutationError(
            "MUTATION_TARGET_MISSING",
            "PageWidth or PageHeight is missing",
          );
        const widthValue = width.content.trim();
        const heightValue = height.content.trim();
        const widthNumber = Number.parseFloat(widthValue);
        const heightNumber = Number.parseFloat(heightValue);
        const isLandscape = widthNumber > heightNumber;
        if (
          (operation.orientation === "landscape" && !isLandscape) ||
          (operation.orientation === "portrait" && isLandscape)
        ) {
          setElementText(width, heightValue);
          setElementText(height, widthValue);
        }
      }
    } else {
      const resolved = fields.get(operation.target.fieldName);
      if (!resolved)
        throw new RdlMutationError(
          "MUTATION_TARGET_MISSING",
          `Field target is missing: ${operation.target.fieldName}`,
        );
      for (const [
        index,
        reportItemName,
      ] of resolved.reportItemNames.entries()) {
        const expression = resolved.expressions[index]!;
        const textbox = textboxByName(document, reportItemName);
        const runs = (
          textbox.find(`.//${local("TextRun")}`) as XmlElement[]
        ).filter(
          (run) => directChild(run, "Value")?.content.trim() === expression,
        );
        if (runs.length !== 1)
          throw new RdlMutationError(
            "MUTATION_TARGET_MISSING",
            `Expected one ${reportItemName} run for ${expression}`,
          );
        const style = directChild(runs[0]!, "Style");
        if (!style)
          throw new RdlMutationError(
            "MUTATION_TARGET_MISSING",
            `Style missing for ${reportItemName}`,
          );
        ensureStyleProperty(style, "Format", operation.format);
      }
    }
  }
};

const verifyOperations = (
  source: RdlInventory,
  output: RdlInventory,
  plan: EditPlan,
  title: ResolvedReportItemTarget | null,
  fields: Map<string, ResolvedFieldDisplayTarget>,
): void => {
  for (const operation of plan.operations) {
    if (operation.type === "setText") {
      const edited = output.textboxes.find(
        ({ name }) => name === title?.reportItemName,
      );
      if (edited?.staticText[0] !== operation.value)
        throw new RdlMutationError(
          "POST_MUTATION_VERIFICATION_FAILED",
          "Title text did not match the plan",
        );
    } else if (operation.type === "setTextStyle") {
      const edited = output.textboxes.find(
        ({ name }) => name === title?.reportItemName,
      );
      if (operation.fontSize && !edited?.fontSizes.includes(operation.fontSize))
        throw new RdlMutationError(
          "POST_MUTATION_VERIFICATION_FAILED",
          "Title FontSize did not match the plan",
        );
      if (
        operation.fontWeight &&
        !edited?.fontWeights.includes(operation.fontWeight)
      )
        throw new RdlMutationError(
          "POST_MUTATION_VERIFICATION_FAILED",
          "Title FontWeight did not match the plan",
        );
      if (
        operation.textAlign &&
        !edited?.textAlignments.includes(operation.textAlign)
      )
        throw new RdlMutationError(
          "POST_MUTATION_VERIFICATION_FAILED",
          "Title TextAlign did not match the plan",
        );
    } else if (operation.type === "setPageOrientation") {
      for (const [index, section] of output.reportSections.entries()) {
        if (section.orientation !== operation.orientation)
          throw new RdlMutationError(
            "POST_MUTATION_VERIFICATION_FAILED",
            `ReportSection ${index} orientation did not match the plan`,
          );
        const before = source.reportSections[index];
        if (
          !before ||
          section.pageWidth !== before.pageHeight ||
          section.pageHeight !== before.pageWidth ||
          section.bodyWidth !== before.bodyWidth ||
          JSON.stringify(section.margins) !== JSON.stringify(before.margins)
        )
          throw new RdlMutationError(
            "POST_MUTATION_VERIFICATION_FAILED",
            `ReportSection ${index} did not preserve page family, body, or margins`,
          );
      }
    } else {
      const resolved = fields.get(operation.target.fieldName)!;
      for (const reportItemName of resolved.reportItemNames) {
        const textbox = output.textboxes.find(
          ({ name }) => name === reportItemName,
        );
        const bindings = textbox?.fieldBindings.filter(
          ({ fieldName }) => fieldName === operation.target.fieldName,
        );
        if (
          !bindings?.length ||
          bindings.some(({ format }) => format !== operation.format)
        )
          throw new RdlMutationError(
            "POST_MUTATION_VERIFICATION_FAILED",
            `Format did not match the plan for ${reportItemName}`,
          );
      }
    }
  }
};

export const mutateExistingRdl = async (input: {
  source: Uint8Array;
  sourceFileName: string;
  expectedSourceSha256: string;
  plan: EditPlan;
  schema: Uint8Array;
}) => {
  const plan = editPlanSchema.parse(input.plan);
  const sourceSha256 = sha256(input.source);
  if (sourceSha256 !== input.expectedSourceSha256)
    throw new RdlMutationError(
      "SOURCE_CHECKSUM_MISMATCH",
      `Expected source ${input.expectedSourceSha256}, received ${sourceSha256}`,
    );
  const sourceInventory = await inspectRdlBytes(
    input.source,
    input.sourceFileName,
  );
  const resolved = resolveTargets(sourceInventory, plan);
  const allowlist = mutationAllowlist(plan, resolved.title, resolved.fields);
  const { ParseOption, XmlDocument } = await import("libxml2-wasm");
  const document = XmlDocument.fromBuffer(input.source, {
    option: ParseOption.XML_PARSE_NONET | ParseOption.XML_PARSE_NO_XXE,
  });
  let output: Buffer;
  try {
    applyPlan(document, plan, resolved.title, resolved.fields);
    output = Buffer.from(document.toString(), "utf8");
  } finally {
    document.dispose();
  }

  const outputInventory = await inspectRdlBytes(output, input.sourceFileName);
  if (
    outputInventory.namespace !== sourceInventory.namespace ||
    outputInventory.namespaceVersion !== sourceInventory.namespaceVersion
  )
    throw new RdlMutationError(
      "POST_MUTATION_VERIFICATION_FAILED",
      "RDL namespace changed",
    );
  verifyOperations(
    sourceInventory,
    outputInventory,
    plan,
    resolved.title,
    resolved.fields,
  );
  const preservation = await assertStructuralPreservation(
    input.source,
    output,
    allowlist,
  );
  const xsd = await validateXmlAgainstXsd(output, input.schema);
  await inspectRdlBytes(output, input.sourceFileName);

  return {
    output,
    sourceSha256,
    outputSha256: sha256(output),
    plan,
    resolvedTargets: {
      reportTitle: resolved.title,
      fieldDisplays: Object.fromEntries(resolved.fields),
    },
    allowlist,
    preservation,
    validation: {
      editPlan: "PASS",
      xmlParse: "PASS",
      xsd: xsd.status,
      xsdEngine: xsd.engine,
      namespace: "PASS",
      targetCounts: "PASS",
      operationVerification: "PASS",
      structuralDiff: "PASS",
      embeddedData: "PASS",
      reparse: "PASS",
    } as const,
    sourceInventory,
    outputInventory,
  };
};

export const applyEditPlanToFile = async (
  input: {
    sourcePath: string;
    expectedSourceSha256: string;
    plan: EditPlan;
    schemaPath: string;
    outputDirectory: string;
    outputFileName: string;
  },
  dependencies: { beforeSourceRecheck?: () => Promise<void> } = {},
) => {
  if (
    basename(input.outputFileName) !== input.outputFileName ||
    extname(input.outputFileName).toLowerCase() !== ".rdl"
  )
    throw new RdlMutationError(
      "INVALID_OUTPUT",
      "Output must be one .rdl filename inside the controlled directory",
    );
  const sourcePath = resolve(input.sourcePath);
  const outputDirectory = resolve(input.outputDirectory);
  const outputPath = resolve(outputDirectory, input.outputFileName);
  if (sourcePath === outputPath)
    throw new RdlMutationError(
      "INVALID_OUTPUT",
      "Source RDL cannot be overwritten",
    );
  const source = await readFile(sourcePath);
  const result = await mutateExistingRdl({
    source,
    sourceFileName: basename(sourcePath),
    expectedSourceSha256: input.expectedSourceSha256,
    plan: input.plan,
    schema: await readFile(input.schemaPath),
  });
  await dependencies.beforeSourceRecheck?.();
  const currentSource = await readFile(sourcePath);
  if (sha256(currentSource) !== result.sourceSha256)
    throw new RdlMutationError(
      "SOURCE_CHANGED",
      "Source RDL changed after inspection; no output was written",
    );
  await mkdir(outputDirectory, { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, result.output, { flag: "wx" });
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
  return { ...result, outputPath };
};
