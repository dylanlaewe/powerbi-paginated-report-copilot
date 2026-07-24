import { createHash } from "node:crypto";
import type { XmlDocument, XmlElement, XmlNode, XmlText } from "libxml2-wasm";

export interface MutationAllowlist {
  reportTitleItemName: string | null;
  titleText: boolean;
  titleFontSize: boolean;
  titleFontWeight: boolean;
  titleTextAlign: boolean;
  pageOrientation: boolean;
  numberFormats: Array<{
    reportItemName: string;
    expression: string;
  }>;
}

export interface StructuralPreservationEvidence {
  semanticProjectionSha256: string;
  embeddedDataSha256: string;
  datasetsSha256: string;
  tablixHierarchyProjectionSha256: string;
  pageBehaviorSha256: string;
  footerSha256: string;
  checks: {
    fullSemanticAllowlist: "PASS";
    embeddedData: "PASS";
    datasetsAndFields: "PASS";
    tablixAndGroupHierarchy: "PASS";
    pageBreaksAndRepeatingHeaders: "PASS";
    footer: "PASS";
  };
}

export class StructuralDiffError extends Error {
  constructor(public readonly projection: string) {
    super(`Unexpected semantic mutation outside allowlist: ${projection}`);
    this.name = "StructuralDiffError";
  }
}

type SemanticElement = {
  namespace: string;
  name: string;
  attributes: Array<{ namespace: string; name: string; value: string }>;
  children: Array<SemanticElement | { text: string }>;
};

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
const local = (name: string): string => `*[local-name()='${name}']`;
const asElements = (nodes: XmlNode[]): XmlElement[] => nodes as XmlElement[];

const setText = (element: XmlElement, value: string): void => {
  const first = element.firstChild;
  if (!first) {
    element.addText(value);
    return;
  }
  if (first.constructor.name !== "XmlText" || first.next)
    throw new StructuralDiffError(`non-scalar ${element.name}`);
  (first as XmlText).content = value;
};

const directChild = (element: XmlElement, name: string): XmlElement | null =>
  element.get(`./${local(name)}`) as XmlElement | null;

const ensureStyleProperty = (
  style: XmlElement,
  name: string,
  value: string,
): void => {
  const existing = directChild(style, name);
  if (existing) setText(existing, value);
  else style.addElement(name).addText(value);
};

const textboxByName = (document: XmlDocument, name: string): XmlElement => {
  const matches = asElements(
    document.find(`//*[local-name()='Textbox']`),
  ).filter((textbox) => textbox.attr("Name")?.value === name);
  if (matches.length !== 1)
    throw new StructuralDiffError(`textbox identity ${name}`);
  return matches[0]!;
};

const normalizeAllowedProperties = (
  document: XmlDocument,
  allowlist: MutationAllowlist,
): void => {
  if (allowlist.reportTitleItemName) {
    const title = textboxByName(document, allowlist.reportTitleItemName);
    const titleRun = title.get(`.//${local("TextRun")}`) as XmlElement | null;
    const titleStyle = titleRun?.get(
      `./${local("Style")}`,
    ) as XmlElement | null;
    if (!titleRun || !titleStyle)
      throw new StructuralDiffError("report title TextRun/Style");
    if (allowlist.titleText) {
      const value = directChild(titleRun, "Value");
      if (!value) throw new StructuralDiffError("report title Value");
      setText(value, "__ALLOWED_TITLE_TEXT__");
    }
    if (allowlist.titleFontSize)
      ensureStyleProperty(
        titleStyle,
        "FontSize",
        "__ALLOWED_TITLE_FONT_SIZE__",
      );
    if (allowlist.titleFontWeight)
      ensureStyleProperty(
        titleStyle,
        "FontWeight",
        "__ALLOWED_TITLE_FONT_WEIGHT__",
      );
    if (allowlist.titleTextAlign) {
      const paragraphStyle = title.get(
        `.//${local("Paragraph")}/${local("Style")}`,
      ) as XmlElement | null;
      if (!paragraphStyle)
        throw new StructuralDiffError("report title Paragraph Style");
      ensureStyleProperty(
        paragraphStyle,
        "TextAlign",
        "__ALLOWED_TITLE_TEXT_ALIGN__",
      );
    }
  }
  if (allowlist.pageOrientation)
    for (const page of asElements(document.find(`//${local("Page")}`))) {
      const width = directChild(page, "PageWidth");
      const height = directChild(page, "PageHeight");
      if (!width || !height)
        throw new StructuralDiffError("PageWidth/PageHeight");
      setText(width, "__ALLOWED_PAGE_WIDTH__");
      setText(height, "__ALLOWED_PAGE_HEIGHT__");
    }
  for (const target of allowlist.numberFormats) {
    const textbox = textboxByName(document, target.reportItemName);
    const runs = asElements(textbox.find(`.//${local("TextRun")}`)).filter(
      (run) => directChild(run, "Value")?.content.trim() === target.expression,
    );
    if (runs.length !== 1)
      throw new StructuralDiffError(
        `format target ${target.reportItemName}:${target.expression}`,
      );
    const style = directChild(runs[0]!, "Style");
    if (!style)
      throw new StructuralDiffError(`format style ${target.reportItemName}`);
    ensureStyleProperty(style, "Format", "__ALLOWED_NUMBER_FORMAT__");
  }
};

const semanticElement = async (
  element: XmlElement,
): Promise<SemanticElement> => {
  const { XmlElement: XmlElementClass, XmlText: XmlTextClass } =
    await import("libxml2-wasm");
  const children: SemanticElement["children"] = [];
  let child = element.firstChild;
  while (child) {
    if (child instanceof XmlElementClass)
      children.push(await semanticElement(child));
    else if (child instanceof XmlTextClass && child.content.trim() !== "")
      children.push({ text: child.content });
    child = child.next;
  }
  return {
    namespace: element.namespaceUri,
    name: element.name,
    attributes: element.attrs
      .map((attribute) => ({
        namespace: attribute.namespaceUri,
        name: attribute.name,
        value: attribute.value,
      }))
      .sort((left, right) =>
        `${left.namespace}:${left.name}`.localeCompare(
          `${right.namespace}:${right.name}`,
        ),
      ),
    children,
  };
};

const hashElements = async (
  document: XmlDocument,
  xpath: string,
): Promise<string> =>
  sha256(
    JSON.stringify(
      await Promise.all(
        asElements(document.find(xpath)).map((element) =>
          semanticElement(element),
        ),
      ),
    ),
  );

const compareHash = (
  projection: string,
  sourceHash: string,
  outputHash: string,
): string => {
  if (sourceHash !== outputHash) throw new StructuralDiffError(projection);
  return sourceHash;
};

export const assertStructuralPreservation = async (
  source: Uint8Array,
  output: Uint8Array,
  allowlist: MutationAllowlist,
): Promise<StructuralPreservationEvidence> => {
  const { ParseOption, XmlDocument } = await import("libxml2-wasm");
  const options = {
    option: ParseOption.XML_PARSE_NONET | ParseOption.XML_PARSE_NO_XXE,
  };
  const sourceDocument = XmlDocument.fromBuffer(source, options);
  const outputDocument = XmlDocument.fromBuffer(output, options);
  try {
    const embeddedXPath =
      `//*[local-name()='DataSet']/*[local-name()='Query']/*[local-name()='CommandText']` +
      ` | //*[local-name()='DataSet']/*[local-name()='Query']//*[local-name()='DataGrid']`;
    const datasetsXPath = `//*[local-name()='DataSets']`;
    const hierarchyXPath = `//*[local-name()='TablixColumnHierarchy'] | //*[local-name()='TablixRowHierarchy']`;
    const pageBehaviorXPath =
      `//*[local-name()='PageBreak'] | //*[local-name()='RepeatOnNewPage'] | ` +
      `//*[local-name()='KeepWithGroup'] | //*[local-name()='FixedData']`;
    const footerXPath = `//*[local-name()='PageFooter']`;

    const embeddedDataSha256 = compareHash(
      "embedded data",
      await hashElements(sourceDocument, embeddedXPath),
      await hashElements(outputDocument, embeddedXPath),
    );
    const datasetsSha256 = compareHash(
      "datasets and fields",
      await hashElements(sourceDocument, datasetsXPath),
      await hashElements(outputDocument, datasetsXPath),
    );
    const pageBehaviorSha256 = compareHash(
      "page breaks and repeating headers",
      await hashElements(sourceDocument, pageBehaviorXPath),
      await hashElements(outputDocument, pageBehaviorXPath),
    );
    const footerSha256 = compareHash(
      "footer",
      await hashElements(sourceDocument, footerXPath),
      await hashElements(outputDocument, footerXPath),
    );

    normalizeAllowedProperties(sourceDocument, allowlist);
    normalizeAllowedProperties(outputDocument, allowlist);
    const semanticProjectionSha256 = compareHash(
      "full report semantic projection",
      await hashElements(sourceDocument, "/*"),
      await hashElements(outputDocument, "/*"),
    );
    const tablixHierarchyProjectionSha256 = compareHash(
      "tablix and group hierarchy",
      await hashElements(sourceDocument, hierarchyXPath),
      await hashElements(outputDocument, hierarchyXPath),
    );

    return {
      semanticProjectionSha256,
      embeddedDataSha256,
      datasetsSha256,
      tablixHierarchyProjectionSha256,
      pageBehaviorSha256,
      footerSha256,
      checks: {
        fullSemanticAllowlist: "PASS",
        embeddedData: "PASS",
        datasetsAndFields: "PASS",
        tablixAndGroupHierarchy: "PASS",
        pageBreaksAndRepeatingHeaders: "PASS",
        footer: "PASS",
      },
    };
  } finally {
    sourceDocument.dispose();
    outputDocument.dispose();
  }
};
