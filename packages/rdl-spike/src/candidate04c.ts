import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { subtotalSeedPath, subtotalSeedSha256 } from "./candidate04b";
import { DetailRow, detailFields } from "./candidate02";
import { validateCollectionConsistency } from "./compatibility";
import { assertWellFormed } from "./index";
import { sha256 } from "./ladder";
import { assertReportBuilderSubtotalStructure } from "./subtotal-forensics";

export const candidate04cFileName = "04c-template-instantiated-subtotal.rdl";
export const candidate04cTitle = "Regional Sales Subtotal Compatibility Test";
export const replacementRows: DetailRow[] = [
  {
    SaleDate: "2026-03-02",
    Region: "Central",
    Salesperson: "Dana Ortiz",
    Customer: "Cedar Clinic",
    Product: "Standing Desk",
    Category: "Furniture",
    Quantity: 5,
    Revenue: 2400,
    GrossProfit: 900,
  },
  {
    SaleDate: "2026-04-11",
    Region: "Central",
    Salesperson: "Eli Turner",
    Customer: "Summit Foods",
    Product: "Cloud Seats",
    Category: "Software",
    Quantity: 12,
    Revenue: 1650,
    GrossProfit: 710,
  },
  {
    SaleDate: "2026-03-08",
    Region: "East",
    Salesperson: "Fran Okafor",
    Customer: "Harbor Schools",
    Product: "Tablet Kit",
    Category: "Technology",
    Quantity: 8,
    Revenue: 3200,
    GrossProfit: 1280,
  },
  {
    SaleDate: "2026-04-19",
    Region: "East",
    Salesperson: "Gale Singh",
    Customer: "Elm Logistics",
    Product: "Storage Rack",
    Category: "Furniture",
    Quantity: 6,
    Revenue: 2750,
    GrossProfit: 990,
  },
  {
    SaleDate: "2026-03-15",
    Region: "West",
    Salesperson: "Harper Wu",
    Customer: "Mesa Transit",
    Product: "Docking Station",
    Category: "Technology",
    Quantity: 9,
    Revenue: 4100,
    GrossProfit: 1530,
  },
  {
    SaleDate: "2026-04-27",
    Region: "West",
    Salesperson: "Indigo Ross",
    Customer: "Juniper Arts",
    Product: "Archive Box",
    Category: "Office Supplies",
    Quantity: 21,
    Revenue: 1890,
    GrossProfit: 840,
  },
];

export interface RegionSubtotal {
  Quantity: number;
  Revenue: number;
  GrossProfit: number;
}
export const calculateSubtotals = (
  rows: DetailRow[],
): Record<string, RegionSubtotal> => {
  const totals: Record<string, RegionSubtotal> = {};
  for (const row of rows) {
    const subtotal = totals[row.Region] ?? {
      Quantity: 0,
      Revenue: 0,
      GrossProfit: 0,
    };
    subtotal.Quantity += row.Quantity;
    subtotal.Revenue += row.Revenue;
    subtotal.GrossProfit += row.GrossProfit;
    totals[row.Region] = subtotal;
  }
  return totals;
};

const escapeXml = (value: unknown): string =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const replaceSingle = (
  source: string,
  start: string,
  end: string,
  replacement: string,
  label: string,
): string => {
  const offset = source.indexOf(start);
  if (offset < 0 || source.indexOf(start, offset + start.length) >= 0)
    throw new Error(`Subtotal template does not contain exactly one ${label}`);
  const close = source.indexOf(end, offset);
  if (close < 0) throw new Error(`Subtotal template has no closing ${label}`);
  return (
    source.slice(0, offset) + replacement + source.slice(close + end.length)
  );
};
const withEol = (value: string, eol: string): string =>
  value.replaceAll("\n", eol);
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

const designerGrid = (eol: string): string =>
  withEol(
    `<DataGrid xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="">
            <RowNumber>6</RowNumber>
            <ColumnNumber>9</ColumnNumber>
${detailFields.map((field, index) => `            <ColumnName ColumnIndex="${index}" ColumnWidth="100" DataType="${designerTypes[index]}">${field}</ColumnName>`).join("\n")}
${replacementRows.flatMap((row, rowIndex) => detailFields.map((field, columnIndex) => `            <Data ColumnIndex="${columnIndex}" RowIndex="${rowIndex}">${escapeXml(row[field])}</Data>`)).join("\n")}
          </DataGrid>`,
    eol,
  );

const query = (): string => `<Query>
  <XmlData>
    <Data>
${replacementRows
  .map(
    (row) => `      <Row>
${detailFields.map((field) => `        <${field}>${escapeXml(row[field])}</${field}>`).join("\n")}
      </Row>`,
  )
  .join("\n")}
    </Data>
  </XmlData>
  <ElementPath>Data{}/Row{SaleDate(Date),Region(String),Salesperson(String),Customer(String),Product(String),Category(String),Quantity(Integer),Revenue(Decimal),GrossProfit(Decimal)}</ElementPath>
</Query>`;
const commandText = (eol: string): string =>
  `<CommandText>${escapeXml(withEol(query(), eol))}</CommandText>`;

export const protectedTablix = (xml: string): string => {
  const start = xml.indexOf('<Tablix Name="Tablix1">');
  const end = xml.indexOf("</Tablix>", start);
  if (start < 0 || end < 0) throw new Error("Tablix1 subtree is absent");
  return xml.slice(start, end + "</Tablix>".length);
};

export const deriveCandidate04c = (seed: string): string => {
  if (sha256(seed) !== subtotalSeedSha256)
    throw new Error(
      "Canonical subtotal seed SHA-256 differs from the baseline",
    );
  const eol = seed.includes("\r\n") ? "\r\n" : "\n";
  let candidate = replaceSingle(
    seed,
    '<DataGrid xmlns:xsd="http://www.w3.org/2001/XMLSchema"',
    "</DataGrid>",
    designerGrid(eol),
    "DesignerState DataGrid",
  );
  candidate = replaceSingle(
    candidate,
    "<CommandText>",
    "</CommandText>",
    commandText(eol),
    "CommandText",
  );
  candidate = candidate.replace(
    "<Value>RDL Compatibility Test</Value>",
    `<Value>${candidate04cTitle}</Value>`,
  );
  if (!candidate.includes(`<Value>${candidate04cTitle}</Value>`))
    throw new Error("Report title was not instantiated");
  if (candidate === seed)
    throw new Error("Instantiated candidate is byte-identical to seed");
  if (protectedTablix(candidate) !== protectedTablix(seed))
    throw new Error("Protected Report Builder Tablix subtree changed");
  assertWellFormed(candidate);
  assertReportBuilderSubtotalStructure(candidate);
  return candidate;
};

const atomicWrite = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, { flag: "wx" });
  await rename(temporary, path);
};

export const runCandidate04c = async (outputDirectory: string) => {
  const seed = await readFile(subtotalSeedPath, "utf8");
  const candidate = deriveCandidate04c(seed);
  const consistency = validateCollectionConsistency(candidate, {
    requirePrintSafe: false,
  });
  if (
    consistency.embeddedRows !== 6 ||
    consistency.fields.join("|") !== detailFields.join("|")
  )
    throw new Error("Replacement embedded data is inconsistent");
  const reportPath = join(resolve(outputDirectory), candidate04cFileName);
  await atomicWrite(reportPath, candidate);
  const schemaPath = fileURLToPath(
    new URL("../schema/ReportDefinition-2016.xsd", import.meta.url),
  );
  const xsdOutput = execFileSync(
    "xmllint",
    ["--noout", "--schema", schemaPath, reportPath],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const manifest = {
    candidate: candidate04cFileName,
    candidateSha256: sha256(candidate),
    template: "samples/report-builder-seeds/KnownGoodRegionSubtotal.rdl",
    templateSha256: subtotalSeedSha256,
    derivation: "TEMPLATE_CONTENT_INSTANTIATION",
    title: candidate04cTitle,
    rows: replacementRows,
    expectedSubtotals: calculateSubtotals(replacementRows),
    validation: {
      outputDiffersFromSeed: "PASS",
      protectedTablixSubtreeByteIdentity: "PASS",
      embeddedDataReplacement: "PASS",
      nineFieldDefinitionsPreserved: "PASS",
      fieldReferences: "PASS",
      contextualRegionAggregateStructurePreserved: "PASS",
      expectedTotalsCalculated: "PASS",
      noGrandTotal: "PASS",
      noPageBreaks: "PASS",
      noParameters: "PASS",
      crossPlatformRdlBytePolicy: "PASS",
      xmlWellFormedness: "PASS",
      existingXsd: "PASS",
      xsdOutput: xsdOutput || `${candidate04cFileName} validates`,
      reportBuilderOpen: "PENDING_INDEPENDENT_WINDOWS",
      reportBuilderPreview: "PENDING_INDEPENDENT_WINDOWS",
    },
    consistency,
  };
  await atomicWrite(
    join(resolve(outputDirectory), "04c-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return { reportPath, manifest };
};
