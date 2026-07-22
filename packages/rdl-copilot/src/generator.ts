import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  RdlDatasetRow,
  RdlReportSpecification,
} from "@powerbi-copilot/domain";
import {
  rdlDetailFields,
  rdlReportSpecificationSchema,
} from "@powerbi-copilot/domain";
import { assertWellFormed } from "@powerbi-copilot/rdl-spike";

export const approvedTemplateId = "production-pagination-letter" as const;
export const approvedTemplateSha256 =
  "c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a";
export const approvedTemplatePath = fileURLToPath(
  new URL(
    "../../../artifacts/rdl-compatibility-ladder/06b-production-pagination-letter.rdl",
    import.meta.url,
  ),
);
const schemaPath = fileURLToPath(
  new URL("../../rdl-spike/schema/ReportDefinition-2016.xsd", import.meta.url),
);
const originalTitle = "Regional Sales Subtotal Compatibility Test";

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
const escapeXml = (value: unknown): string =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const replaceOne = (
  source: string,
  start: string,
  end: string,
  replacement: string,
): string => {
  const first = source.indexOf(start);
  if (first < 0 || source.indexOf(start, first + start.length) >= 0)
    throw new Error(
      `Template mutable boundary is missing or duplicated: ${start}`,
    );
  const close = source.indexOf(end, first);
  if (close < 0)
    throw new Error(`Template mutable boundary is unclosed: ${end}`);
  return (
    source.slice(0, first) + replacement + source.slice(close + end.length)
  );
};
const designerTypes = [
  "DateTime",
  "String",
  "String",
  "String",
  "String",
  "String",
  "Int32",
  "Decimal",
  "Decimal",
];
const dataGrid = (rows: RdlDatasetRow[], eol: string): string =>
  `<DataGrid xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="">${eol}            <RowNumber>${rows.length}</RowNumber>${eol}            <ColumnNumber>9</ColumnNumber>${eol}${rdlDetailFields.map((field, index) => `            <ColumnName ColumnIndex="${index}" ColumnWidth="100" DataType="${designerTypes[index]}">${field}</ColumnName>`).join(eol)}${eol}${rows.flatMap((row, rowIndex) => rdlDetailFields.map((field, columnIndex) => `            <Data ColumnIndex="${columnIndex}" RowIndex="${rowIndex}">${escapeXml(row[field])}</Data>`)).join(eol)}${eol}          </DataGrid>`;
const query = (rows: RdlDatasetRow[], eol: string): string =>
  `<Query>${eol}  <XmlData>${eol}    <Data>${eol}${rows.map((row) => `      <Row>${eol}${rdlDetailFields.map((field) => `        <${field}>${escapeXml(row[field])}</${field}>`).join(eol)}${eol}      </Row>`).join(eol)}${eol}    </Data>${eol}  </XmlData>${eol}  <ElementPath>Data{}/Row{SaleDate(Date),Region(String),Salesperson(String),Customer(String),Product(String),Category(String),Quantity(Integer),Revenue(Decimal),GrossProfit(Decimal)}</ElementPath>${eol}</Query>`;

export const protectedProjection = (xml: string): string => {
  let projected = replaceOne(
    xml,
    '<DataGrid xmlns:xsd="http://www.w3.org/2001/XMLSchema"',
    "</DataGrid>",
    "__DATA_GRID__",
  );
  projected = replaceOne(
    projected,
    "<CommandText>",
    "</CommandText>",
    "__COMMAND_TEXT__",
  );
  return projected.replace(
    /(<Textbox Name="ReportTitle">[\s\S]*?<Value>)[^<]*(<\/Value>)/u,
    "$1__REPORT_TITLE__$2",
  );
};

export const calculateTotals = (rows: RdlDatasetRow[]) => {
  const regions: Record<
    string,
    { Quantity: number; Revenue: number; GrossProfit: number }
  > = {};
  const grandTotal = { Quantity: 0, Revenue: 0, GrossProfit: 0 };
  for (const row of rows) {
    const region = regions[row.Region] ?? {
      Quantity: 0,
      Revenue: 0,
      GrossProfit: 0,
    };
    for (const field of ["Quantity", "Revenue", "GrossProfit"] as const) {
      region[field] += row[field];
      grandTotal[field] += row[field];
    }
    regions[row.Region] = region;
  }
  return { regions, grandTotal };
};

export const instantiateApprovedTemplate = (
  template: string,
  input: RdlReportSpecification,
): string => {
  const specification = rdlReportSpecificationSchema.parse(input);
  if (specification.template !== approvedTemplateId)
    throw new Error("Unsupported template");
  if (sha256(template) !== approvedTemplateSha256)
    throw new Error("Approved template checksum mismatch");
  const eol = template.includes("\r\n") ? "\r\n" : "\n";
  let output = replaceOne(
    template,
    '<DataGrid xmlns:xsd="http://www.w3.org/2001/XMLSchema"',
    "</DataGrid>",
    dataGrid(specification.rows, eol),
  );
  output = replaceOne(
    output,
    "<CommandText>",
    "</CommandText>",
    `<CommandText>${escapeXml(query(specification.rows, eol))}</CommandText>`,
  );
  const oldTitle = `<Value>${originalTitle}</Value>`;
  if (output.split(oldTitle).length !== 2)
    throw new Error("Approved title boundary changed");
  output = output.replace(
    oldTitle,
    `<Value>${escapeXml(specification.title)}</Value>`,
  );
  if (!output.includes(`<Value>${escapeXml(specification.title)}</Value>`))
    throw new Error("Generated report title does not match the specification");
  if (!output.includes(dataGrid(specification.rows, eol)))
    throw new Error(
      "Generated DesignerState rows do not match the specification",
    );
  if (!output.includes(escapeXml(query(specification.rows, eol))))
    throw new Error("Generated embedded rows do not match the specification");
  assertWellFormed(output);
  if (protectedProjection(output) !== protectedProjection(template))
    throw new Error("Protected template structure changed");
  return output;
};

const atomicWrite = async (path: string, value: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, value, { flag: "wx" });
  await rename(temporary, path);
};
export const validateOutputPath = (path: string): string => {
  if (
    !isAbsolute(path) ||
    path.split(/[\\/]/u).includes("..") ||
    extname(path).toLowerCase() !== ".rdl" ||
    basename(path) !== basename(resolve(path))
  )
    throw new Error(
      "Output must be an absolute .rdl file path without traversal",
    );
  return resolve(path);
};

export const generateReport = async (
  specification: RdlReportSpecification,
  outputPath: string,
) => {
  const target = validateOutputPath(outputPath);
  const template = await readFile(approvedTemplatePath, "utf8");
  const report = instantiateApprovedTemplate(template, specification);
  for (const literal of [
    "<PageWidth>8.5in</PageWidth>",
    "<PageHeight>11in</PageHeight>",
    "<LeftMargin>0.5in</LeftMargin>",
    "<RightMargin>0.5in</RightMargin>",
    "<TopMargin>0.5in</TopMargin>",
    "<BottomMargin>0.5in</BottomMargin>",
  ])
    if (!report.includes(literal))
      throw new Error(`Required page property missing: ${literal}`);
  execFileSync("xmllint", ["--noout", "--schema", schemaPath, "-"], {
    input: report,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const totals = calculateTotals(specification.rows);
  const manifest = {
    template: approvedTemplateId,
    templateSha256: approvedTemplateSha256,
    reportSha256: sha256(report),
    specification,
    expectedRegionSubtotals: totals.regions,
    expectedGrandTotal: totals.grandTotal,
    validation: {
      xmlWellFormed: "PASS",
      xsd: "PASS",
      protectedStructure: "PASS",
      titleMatchesSpecification: "PASS",
      embeddedRowsMatchSpecification: "PASS",
      aggregateScopesPreserved: "PASS",
      explicitLetterPage: "PASS",
    },
  };
  await atomicWrite(target, report);
  const manifestPath = `${target}.manifest.json`;
  await atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { reportPath: target, manifestPath, manifest };
};
