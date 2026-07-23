import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { XmlElement, XmlNode } from "libxml2-wasm";
import { z } from "zod";

const fieldBindingSchema = z
  .object({
    expression: z.string(),
    fieldName: z.string(),
    bindingKind: z.enum(["direct", "sum"]),
    format: z.string().nullable(),
  })
  .strict();

const textboxSchema = z
  .object({
    name: z.string(),
    container: z.enum([
      "reportBody",
      "tablix",
      "pageHeader",
      "pageFooter",
      "other",
    ]),
    top: z.string().nullable(),
    left: z.string().nullable(),
    staticText: z.array(z.string()),
    expressions: z.array(z.string()),
    fieldBindings: z.array(fieldBindingSchema),
    fontSizes: z.array(z.string()),
    fontWeights: z.array(z.string()),
    textAlignments: z.array(z.string()),
  })
  .strict();

export const rdlInventorySchema = z
  .object({
    version: z.literal(1),
    fileName: z.string(),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    namespace: z.string().url(),
    namespaceVersion: z.string(),
    reportSections: z.array(
      z
        .object({
          index: z.number().int().nonnegative(),
          bodyWidth: z.string().nullable(),
          pageWidth: z.string(),
          pageHeight: z.string(),
          orientation: z.enum(["portrait", "landscape", "square"]),
          margins: z
            .object({
              left: z.string(),
              right: z.string(),
              top: z.string(),
              bottom: z.string(),
            })
            .strict(),
        })
        .strict(),
    ),
    datasets: z.array(
      z.object({ name: z.string(), fields: z.array(z.string()) }).strict(),
    ),
    reportParameters: z.array(z.string()),
    tablixes: z.array(
      z
        .object({
          name: z.string(),
          datasetName: z.string().nullable(),
        })
        .strict(),
    ),
    groups: z.array(
      z.object({ name: z.string(), expressions: z.array(z.string()) }).strict(),
    ),
    textboxes: z.array(textboxSchema),
  })
  .strict();

export type RdlInventory = z.infer<typeof rdlInventorySchema>;
export type RdlTextboxInventory = z.infer<typeof textboxSchema>;

export class RdlInspectionError extends Error {
  constructor(
    public readonly code:
      | "NOT_RDL"
      | "NOT_REGULAR_FILE"
      | "FILE_TOO_LARGE"
      | "INVALID_REPORT"
      | "TITLE_NOT_FOUND"
      | "TITLE_AMBIGUOUS"
      | "FIELD_NOT_FOUND"
      | "FIELD_AMBIGUOUS"
      | "FIELD_DISPLAY_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "RdlInspectionError";
  }
}

export const maximumRdlBytes = 20 * 1024 * 1024;

const local = (name: string): string => `*[local-name()='${name}']`;
const elements = (node: XmlNode, xpath: string): XmlElement[] =>
  node.find(xpath) as XmlElement[];
const firstContent = (node: XmlNode, xpath: string): string | null =>
  node.get(xpath)?.content.trim() || null;
const nameAttribute = (element: XmlElement): string =>
  element.attr("Name")?.value.trim() ?? "";

const parseInches = (value: string): number => {
  const match = /^([0-9]+(?:\.[0-9]+)?)in$/u.exec(value.trim());
  if (!match)
    throw new RdlInspectionError(
      "INVALID_REPORT",
      `Invalid inch size: ${value}`,
    );
  return Number(match[1]);
};

const namespaceVersion = (namespace: string): string => {
  const match = /reporting\/(\d{4}\/\d{2})\/reportdefinition$/u.exec(namespace);
  return match?.[1] ?? "unknown";
};

const textboxContainer = (
  textbox: XmlElement,
): RdlTextboxInventory["container"] => {
  if (textbox.get(`ancestor::${local("PageHeader")}`)) return "pageHeader";
  if (textbox.get(`ancestor::${local("PageFooter")}`)) return "pageFooter";
  if (textbox.get(`ancestor::${local("Tablix")}`)) return "tablix";
  if (textbox.get(`ancestor::${local("Body")}`)) return "reportBody";
  return "other";
};

const bindingFromExpression = (
  expression: string,
  format: string | null,
): RdlTextboxInventory["fieldBindings"][number] | null => {
  const direct = /^=Fields!([A-Za-z_][A-Za-z0-9_]*)\.Value$/u.exec(expression);
  if (direct?.[1])
    return { expression, fieldName: direct[1], bindingKind: "direct", format };
  const sum = /^=Sum\(Fields!([A-Za-z_][A-Za-z0-9_]*)\.Value\)$/u.exec(
    expression,
  );
  return sum?.[1]
    ? { expression, fieldName: sum[1], bindingKind: "sum", format }
    : null;
};

const inspectTextbox = (textbox: XmlElement): RdlTextboxInventory => {
  const textRuns = elements(textbox, `.//${local("TextRun")}`);
  const values = textRuns
    .map((run) => firstContent(run, `./${local("Value")}`))
    .filter((value): value is string => value !== null);
  const staticText = values.filter((value) => !value.startsWith("="));
  const expressions = values.filter((value) => value.startsWith("="));
  const fieldBindings = textRuns.flatMap((run) => {
    const expression = firstContent(run, `./${local("Value")}`);
    if (!expression?.startsWith("=")) return [];
    const binding = bindingFromExpression(
      expression,
      firstContent(run, `./${local("Style")}/${local("Format")}`),
    );
    return binding ? [binding] : [];
  });
  const styleValues = (styleName: string): string[] =>
    elements(textbox, `.//${local(styleName)}`)
      .map((element) => element.content.trim())
      .filter(Boolean);
  return textboxSchema.parse({
    name: nameAttribute(textbox),
    container: textboxContainer(textbox),
    top: firstContent(textbox, `./${local("Top")}`),
    left: firstContent(textbox, `./${local("Left")}`),
    staticText,
    expressions,
    fieldBindings,
    fontSizes: styleValues("FontSize"),
    fontWeights: styleValues("FontWeight"),
    textAlignments: styleValues("TextAlign"),
  });
};

export const inspectRdlBytes = async (
  source: Uint8Array,
  fileName: string,
): Promise<RdlInventory> => {
  const { ParseOption, XmlDocument } = await import("libxml2-wasm");
  const document = XmlDocument.fromBuffer(source, {
    option: ParseOption.XML_PARSE_NONET | ParseOption.XML_PARSE_NO_XXE,
  });
  try {
    const root = document.get("/*") as XmlElement | null;
    if (!root || root.name !== "Report" || !root.namespaceUri)
      throw new RdlInspectionError(
        "INVALID_REPORT",
        "Root element must be a namespaced Report",
      );
    const sections = elements(
      root,
      `./${local("ReportSections")}/${local("ReportSection")}`,
    ).map((section, index) => {
      const page = section.get(`./${local("Page")}`) as XmlElement | null;
      const required = (name: string): string => {
        const value = page ? firstContent(page, `./${local(name)}`) : null;
        if (!value)
          throw new RdlInspectionError(
            "INVALID_REPORT",
            `ReportSection ${index} lacks ${name}`,
          );
        return value;
      };
      const pageWidth = required("PageWidth");
      const pageHeight = required("PageHeight");
      const width = parseInches(pageWidth);
      const height = parseInches(pageHeight);
      return {
        index,
        bodyWidth: firstContent(section, `./${local("Width")}`),
        pageWidth,
        pageHeight,
        orientation:
          width === height
            ? "square"
            : width > height
              ? "landscape"
              : "portrait",
        margins: {
          left: required("LeftMargin"),
          right: required("RightMargin"),
          top: required("TopMargin"),
          bottom: required("BottomMargin"),
        },
      } as const;
    });
    return rdlInventorySchema.parse({
      version: 1,
      fileName,
      sourceSha256: createHash("sha256").update(source).digest("hex"),
      namespace: root.namespaceUri,
      namespaceVersion: namespaceVersion(root.namespaceUri),
      reportSections: sections,
      datasets: elements(
        root,
        `./${local("DataSets")}/${local("DataSet")}`,
      ).map((dataset) => ({
        name: nameAttribute(dataset),
        fields: elements(dataset, `./${local("Fields")}/${local("Field")}`).map(
          nameAttribute,
        ),
      })),
      reportParameters: elements(
        root,
        `./${local("ReportParameters")}/${local("ReportParameter")}`,
      ).map(nameAttribute),
      tablixes: elements(root, `.//${local("Tablix")}`).map((tablix) => ({
        name: nameAttribute(tablix),
        datasetName: firstContent(tablix, `./${local("DataSetName")}`),
      })),
      groups: elements(root, `.//${local("Group")}`).map((group) => ({
        name: nameAttribute(group),
        expressions: elements(
          group,
          `./${local("GroupExpressions")}/${local("GroupExpression")}`,
        ).map((expression) => expression.content.trim()),
      })),
      textboxes: elements(root, `.//${local("Textbox")}`).map(inspectTextbox),
    });
  } finally {
    document.dispose();
  }
};

export const inspectRdlFile = async (path: string): Promise<RdlInventory> => {
  if (extname(path).toLowerCase() !== ".rdl")
    throw new RdlInspectionError("NOT_RDL", "Only .rdl files can be inspected");
  const canonicalPath = await realpath(path);
  const metadata = await stat(canonicalPath);
  if (!metadata.isFile())
    throw new RdlInspectionError(
      "NOT_REGULAR_FILE",
      "Selected RDL is not a regular file",
    );
  if (metadata.size > maximumRdlBytes)
    throw new RdlInspectionError(
      "FILE_TOO_LARGE",
      `Selected RDL exceeds ${maximumRdlBytes} bytes`,
    );
  return inspectRdlBytes(
    await readFile(canonicalPath),
    basename(canonicalPath),
  );
};

export interface ResolvedReportItemTarget {
  kind: "reportItem";
  semanticRole: "reportTitle";
  reportItemName: string;
  evidence: string[];
}

export interface ResolvedFieldDisplayTarget {
  kind: "fieldDisplay";
  fieldName: string;
  reportItemNames: string[];
  expressions: string[];
  evidence: string[];
}

const configuredTitleNamesBySourceSha256: Readonly<Record<string, string>> = {
  c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a:
    "ReportTitle",
};

export const resolveInventoryTargets = (inventory: RdlInventory) => ({
  reportTitle: resolveReportTitle(
    inventory,
    configuredTitleNamesBySourceSha256[inventory.sourceSha256],
  ),
  revenueDisplays: resolveFieldDisplays(inventory, "Revenue"),
});

export const resolveReportTitle = (
  inventory: RdlInventory,
  configuredExactName?: string,
): ResolvedReportItemTarget => {
  if (configuredExactName) {
    const exact = inventory.textboxes.filter(
      (textbox) => textbox.name === configuredExactName,
    );
    if (exact.length === 1 && exact[0]?.staticText.length)
      return {
        kind: "reportItem",
        semanticRole: "reportTitle",
        reportItemName: configuredExactName,
        evidence: [
          `configured exact report-item name: ${configuredExactName}`,
          `existing static text: ${exact[0].staticText.join(" | ")}`,
        ],
      };
    if (exact.length > 1)
      throw new RdlInspectionError(
        "TITLE_AMBIGUOUS",
        `Duplicate title item: ${configuredExactName}`,
      );
  }

  const candidates = inventory.textboxes.filter((textbox) => {
    if (textbox.container !== "reportBody" || textbox.staticText.length !== 1)
      return false;
    if (textbox.expressions.length || textbox.fieldBindings.length)
      return false;
    return textbox.top === null || parseInches(textbox.top) <= 0.5;
  });
  if (candidates.length === 0)
    throw new RdlInspectionError(
      "TITLE_NOT_FOUND",
      "No conservative report-title candidate found",
    );
  if (candidates.length !== 1)
    throw new RdlInspectionError(
      "TITLE_AMBIGUOUS",
      `Multiple report-title candidates: ${candidates.map(({ name }) => name).join(", ")}`,
    );
  const title = candidates[0];
  if (!title)
    throw new RdlInspectionError("TITLE_NOT_FOUND", "Report title not found");
  return {
    kind: "reportItem",
    semanticRole: "reportTitle",
    reportItemName: title.name,
    evidence: [
      "single top-level body textbox with one static value and no expression",
      `existing static text: ${title.staticText[0]}`,
      `top: ${title.top ?? "implicit 0in"}`,
    ],
  };
};

export const resolveFieldDisplays = (
  inventory: RdlInventory,
  fieldName: string,
): ResolvedFieldDisplayTarget => {
  const declaringDatasets = inventory.datasets.filter((dataset) =>
    dataset.fields.includes(fieldName),
  );
  if (declaringDatasets.length === 0)
    throw new RdlInspectionError(
      "FIELD_NOT_FOUND",
      `Field does not exist: ${fieldName}`,
    );
  if (declaringDatasets.length !== 1)
    throw new RdlInspectionError(
      "FIELD_AMBIGUOUS",
      `Field ${fieldName} exists in multiple datasets: ${declaringDatasets.map(({ name }) => name).join(", ")}`,
    );
  const matches = inventory.textboxes.flatMap((textbox) =>
    textbox.fieldBindings
      .filter((binding) => binding.fieldName === fieldName)
      .map((binding) => ({ textbox, binding })),
  );
  if (matches.length === 0)
    throw new RdlInspectionError(
      "FIELD_DISPLAY_NOT_FOUND",
      `No direct or Sum display found for field: ${fieldName}`,
    );
  return {
    kind: "fieldDisplay",
    fieldName,
    reportItemNames: matches.map(({ textbox }) => textbox.name),
    expressions: matches.map(({ binding }) => binding.expression),
    evidence: matches.map(
      ({ textbox, binding }) =>
        `${textbox.name}: exact ${binding.bindingKind} expression ${binding.expression}, format ${binding.format ?? "none"}`,
    ),
  };
};
