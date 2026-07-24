import { createHash } from "node:crypto";
import type { XmlElement, XmlNode } from "libxml2-wasm";
import { z } from "zod";

const local = (name: string): string => `*[local-name()='${name}']`;
const elements = (node: XmlNode, xpath: string): XmlElement[] =>
  node.find(xpath) as XmlElement[];
const content = (node: XmlNode, xpath: string): string | null =>
  node.get(xpath)?.content.trim() || null;
const name = (element: XmlElement): string =>
  element.attr("Name")?.value.trim() ?? "";

const inventoryTextboxSchema = z
  .object({
    name: z.string(),
    container: z.enum(["body", "tablix", "pageHeader", "pageFooter", "other"]),
    values: z.array(z.string()),
    formats: z.array(z.string()),
    fontSizes: z.array(z.string()),
    fontWeights: z.array(z.string()),
    top: z.string().nullable(),
    left: z.string().nullable(),
  })
  .strict();

export const corpusSourceInventorySchema = z
  .object({
    version: z.literal(1),
    source: z
      .object({
        fileName: z.string().endsWith(".rdl"),
        byteSize: z.number().int().positive(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/u),
        utf8Bom: z.boolean(),
        lineEndings: z.enum(["CRLF", "LF", "mixed"]),
      })
      .strict(),
    xml: z
      .object({
        wellFormed: z.literal(true),
        namespace: z.string().url(),
        reportBuilderName: z.string().nullable(),
        reportBuilderVersion: z.string().nullable(),
      })
      .strict(),
    counts: z
      .object({
        dataSources: z.number().int().nonnegative(),
        datasets: z.number().int().nonnegative(),
        parameters: z.number().int().nonnegative(),
        tablixes: z.number().int().nonnegative(),
        serializedGroups: z.number().int().nonnegative(),
        nonDetailGroups: z.number().int().nonnegative(),
        textboxes: z.number().int().nonnegative(),
        aggregateExpressions: z.number().int().nonnegative(),
        pageBreaks: z.number().int().nonnegative(),
      })
      .strict(),
    datasets: z.array(
      z
        .object({
          name: z.string(),
          provider: z.string().nullable(),
          fields: z.array(
            z
              .object({
                name: z.string(),
                typeName: z.string().nullable(),
                dataField: z.string().nullable(),
              })
              .strict(),
          ),
          designerState: z
            .object({
              rowCount: z.number().int().nonnegative(),
              columnCount: z.number().int().nonnegative(),
              columns: z.array(
                z
                  .object({
                    name: z.string(),
                    dataType: z.string(),
                  })
                  .strict(),
              ),
            })
            .strict(),
        })
        .strict(),
    ),
    reportSections: z.array(
      z
        .object({
          bodyWidth: z.string().nullable(),
          serializedPageWidth: z.string().nullable(),
          serializedPageHeight: z.string().nullable(),
          margins: z
            .object({
              left: z.string().nullable(),
              right: z.string().nullable(),
              top: z.string().nullable(),
              bottom: z.string().nullable(),
            })
            .strict(),
        })
        .strict(),
    ),
    tablixes: z.array(
      z
        .object({
          name: z.string(),
          datasetName: z.string().nullable(),
          columnCount: z.number().int().nonnegative(),
          rowCount: z.number().int().nonnegative(),
        })
        .strict(),
    ),
    groups: z.array(
      z
        .object({
          name: z.string(),
          expressions: z.array(z.string()),
          kind: z.enum(["details", "group"]),
        })
        .strict(),
    ),
    textboxes: z.array(inventoryTextboxSchema),
  })
  .strict();

export type CorpusSourceInventory = z.infer<typeof corpusSourceInventorySchema>;

const lineEndingKind = (source: Uint8Array): "CRLF" | "LF" | "mixed" => {
  const text = Buffer.from(source).toString("utf8");
  const crlf = (text.match(/\r\n/gu) ?? []).length;
  const loneLf = (text.match(/(?<!\r)\n/gu) ?? []).length;
  return crlf > 0 && loneLf === 0 ? "CRLF" : crlf === 0 ? "LF" : "mixed";
};

const textboxContainer = (
  textbox: XmlElement,
): z.infer<typeof inventoryTextboxSchema>["container"] => {
  if (textbox.get(`ancestor::${local("PageHeader")}`)) return "pageHeader";
  if (textbox.get(`ancestor::${local("PageFooter")}`)) return "pageFooter";
  if (textbox.get(`ancestor::${local("Tablix")}`)) return "tablix";
  if (textbox.get(`ancestor::${local("Body")}`)) return "body";
  return "other";
};

export const inspectCorpusRdlBytes = async (
  source: Uint8Array,
  fileName: string,
): Promise<CorpusSourceInventory> => {
  const { ParseOption, XmlDocument } = await import("libxml2-wasm");
  const document = XmlDocument.fromBuffer(source, {
    option: ParseOption.XML_PARSE_NONET | ParseOption.XML_PARSE_NO_XXE,
  });
  try {
    const root = document.get("/*") as XmlElement | null;
    if (!root || root.name !== "Report" || !root.namespaceUri)
      throw new Error("Root element must be a namespaced Report");

    const datasets = elements(
      root,
      `./${local("DataSets")}/${local("DataSet")}`,
    ).map((dataset) => {
      const designer = dataset.get(
        `./${local("Query")}/*[local-name()='DesignerState']/*[local-name()='DataGrid']`,
      ) as XmlElement | null;
      return {
        name: name(dataset),
        provider: content(
          root,
          `./${local("DataSources")}/${local("DataSource")}[1]/${local("ConnectionProperties")}/${local("DataProvider")}`,
        ),
        fields: elements(dataset, `./${local("Fields")}/${local("Field")}`).map(
          (field) => ({
            name: name(field),
            typeName: content(field, `./*[local-name()='TypeName']`),
            dataField: content(field, `./${local("DataField")}`),
          }),
        ),
        designerState: {
          rowCount: Number(
            content(designer ?? dataset, `./${local("RowNumber")}`) ?? 0,
          ),
          columnCount: Number(
            content(designer ?? dataset, `./${local("ColumnNumber")}`) ?? 0,
          ),
          columns: designer
            ? elements(designer, `./${local("ColumnName")}`).map((column) => ({
                name: column.content.trim(),
                dataType: column.attr("DataType")?.value.trim() ?? "",
              }))
            : [],
        },
      };
    });

    const groups = elements(root, `.//${local("Group")}`).map((group) => {
      const expressions = elements(
        group,
        `./${local("GroupExpressions")}/${local("GroupExpression")}`,
      ).map((expression) => expression.content.trim());
      return {
        name: name(group),
        expressions,
        kind:
          expressions.length === 0 ? ("details" as const) : ("group" as const),
      };
    });
    const textboxes = elements(root, `.//${local("Textbox")}`).map(
      (textbox) => ({
        name: name(textbox),
        container: textboxContainer(textbox),
        values: elements(textbox, `.//${local("TextRun")}/${local("Value")}`)
          .map((value) => value.content.trim())
          .filter(Boolean),
        formats: elements(textbox, `.//${local("Format")}`)
          .map((format) => format.content.trim())
          .filter(Boolean),
        fontSizes: elements(textbox, `.//${local("FontSize")}`)
          .map((size) => size.content.trim())
          .filter(Boolean),
        fontWeights: elements(textbox, `.//${local("FontWeight")}`)
          .map((weight) => weight.content.trim())
          .filter(Boolean),
        top: content(textbox, `./${local("Top")}`),
        left: content(textbox, `./${local("Left")}`),
      }),
    );
    const textValues = textboxes.flatMap(({ values }) => values);

    return corpusSourceInventorySchema.parse({
      version: 1,
      source: {
        fileName,
        byteSize: source.byteLength,
        sha256: createHash("sha256").update(source).digest("hex"),
        utf8Bom: source[0] === 0xef && source[1] === 0xbb && source[2] === 0xbf,
        lineEndings: lineEndingKind(source),
      },
      xml: {
        wellFormed: true,
        namespace: root.namespaceUri,
        reportBuilderName: content(
          root,
          `./*[local-name()='AuthoringMetadata']/*[local-name()='CreatedBy']/*[local-name()='Name']`,
        ),
        reportBuilderVersion: content(
          root,
          `./*[local-name()='AuthoringMetadata']/*[local-name()='CreatedBy']/*[local-name()='Version']`,
        ),
      },
      counts: {
        dataSources: elements(
          root,
          `./${local("DataSources")}/${local("DataSource")}`,
        ).length,
        datasets: datasets.length,
        parameters: elements(
          root,
          `./${local("ReportParameters")}/${local("ReportParameter")}`,
        ).length,
        tablixes: elements(root, `.//${local("Tablix")}`).length,
        serializedGroups: groups.length,
        nonDetailGroups: groups.filter(({ kind }) => kind === "group").length,
        textboxes: textboxes.length,
        aggregateExpressions: textValues.filter((value) =>
          /^=(?:Sum|Avg|Count|Min|Max)\(/iu.test(value),
        ).length,
        pageBreaks: elements(root, `.//${local("PageBreak")}`).length,
      },
      datasets,
      reportSections: elements(
        root,
        `./${local("ReportSections")}/${local("ReportSection")}`,
      ).map((section) => {
        const page = section.get(`./${local("Page")}`) as XmlElement | null;
        return {
          bodyWidth: content(section, `./${local("Width")}`),
          serializedPageWidth: page
            ? content(page, `./${local("PageWidth")}`)
            : null,
          serializedPageHeight: page
            ? content(page, `./${local("PageHeight")}`)
            : null,
          margins: {
            left: page ? content(page, `./${local("LeftMargin")}`) : null,
            right: page ? content(page, `./${local("RightMargin")}`) : null,
            top: page ? content(page, `./${local("TopMargin")}`) : null,
            bottom: page ? content(page, `./${local("BottomMargin")}`) : null,
          },
        };
      }),
      tablixes: elements(root, `.//${local("Tablix")}`).map((tablix) => ({
        name: name(tablix),
        datasetName: content(tablix, `./${local("DataSetName")}`),
        columnCount: elements(
          tablix,
          `./${local("TablixBody")}/${local("TablixColumns")}/${local("TablixColumn")}`,
        ).length,
        rowCount: elements(
          tablix,
          `./${local("TablixBody")}/${local("TablixRows")}/${local("TablixRow")}`,
        ).length,
      })),
      groups,
      textboxes,
    });
  } finally {
    document.dispose();
  }
};
