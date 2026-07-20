import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCollectionConsistency } from "./compatibility";
import { assertWellFormed } from "./index";
import { sha256 } from "./ladder";

export const candidate01Path = resolve(
  "artifacts/rdl-compatibility-ladder/01-minimal-enter-data-table.rdl",
);
export const candidate01Sha256 =
  "151274f425f20e1bd88a7a8f892fca799f9efe9184b1df42e9cec53ab2e016a7";
export const candidate02FileName = "02-detail-columns.rdl";

export interface DetailRow {
  SaleDate: string;
  Region: string;
  Salesperson: string;
  Customer: string;
  Product: string;
  Category: string;
  Quantity: number;
  Revenue: number;
  GrossProfit: number;
}

export const detailFields = [
  "SaleDate",
  "Region",
  "Salesperson",
  "Customer",
  "Product",
  "Category",
  "Quantity",
  "Revenue",
  "GrossProfit",
] as const;

export const detailRows: DetailRow[] = [
  {
    SaleDate: "2026-01-05",
    Region: "Central",
    Salesperson: "Avery Brooks",
    Customer: "Northwind Health",
    Product: "Ergo Desk",
    Category: "Furniture",
    Quantity: 2,
    Revenue: 1750,
    GrossProfit: 560,
  },
  {
    SaleDate: "2026-02-03",
    Region: "Central",
    Salesperson: "Jordan Lee",
    Customer: "Bright Labs",
    Product: "Analytics License",
    Category: "Software",
    Quantity: 15,
    Revenue: 2100,
    GrossProfit: 1380,
  },
  {
    SaleDate: "2026-01-07",
    Region: "East",
    Salesperson: "Morgan Chen",
    Customer: "Atlas Finance",
    Product: "Laptop Pro",
    Category: "Technology",
    Quantity: 4,
    Revenue: 5920,
    GrossProfit: 1640,
  },
  {
    SaleDate: "2026-02-06",
    Region: "East",
    Salesperson: "Riley Patel",
    Customer: "Metro Legal",
    Product: "File Cabinet",
    Category: "Furniture",
    Quantity: 7,
    Revenue: 2310,
    GrossProfit: 700,
  },
  {
    SaleDate: "2026-01-09",
    Region: "West",
    Salesperson: "Casey Rivera",
    Customer: "Pioneer Energy",
    Product: "Mobile Workstation",
    Category: "Technology",
    Quantity: 3,
    Revenue: 5460,
    GrossProfit: 1490,
  },
  {
    SaleDate: "2026-02-14",
    Region: "West",
    Salesperson: "Taylor Kim",
    Customer: "Orchard Markets",
    Product: "Label Roll",
    Category: "Office Supplies",
    Quantity: 40,
    Revenue: 720,
    GrossProfit: 330,
  },
];

const fieldTypes: Record<
  (typeof detailFields)[number],
  { elementPath: string; clr: string; designer: string }
> = {
  SaleDate: {
    elementPath: "Date",
    clr: "System.DateTime",
    designer: "DateTime",
  },
  Region: { elementPath: "String", clr: "System.String", designer: "String" },
  Salesperson: {
    elementPath: "String",
    clr: "System.String",
    designer: "String",
  },
  Customer: { elementPath: "String", clr: "System.String", designer: "String" },
  Product: { elementPath: "String", clr: "System.String", designer: "String" },
  Category: { elementPath: "String", clr: "System.String", designer: "String" },
  Quantity: { elementPath: "Integer", clr: "System.Int32", designer: "Int32" },
  Revenue: {
    elementPath: "Decimal",
    clr: "System.Decimal",
    designer: "Decimal",
  },
  GrossProfit: {
    elementPath: "Decimal",
    clr: "System.Decimal",
    designer: "Decimal",
  },
};

const escapeXml = (value: unknown): string =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const escapeCommand = (value: string): string =>
  escapeXml(value).replaceAll('"', "&quot;");

const replaceElement = (
  source: string,
  startMarker: string,
  endMarker: string,
  replacement: string,
  label: string,
): string => {
  const start = source.indexOf(startMarker);
  const second = source.indexOf(startMarker, start + startMarker.length);
  if (start < 0 || second >= 0)
    throw new Error(
      `Accepted Candidate 01 does not contain exactly one ${label}`,
    );
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Accepted Candidate 01 has no closing ${label}`);
  return `${source.slice(0, start)}${replacement}${source.slice(end + endMarker.length)}`;
};

const designerGrid = (): string => {
  const columns = detailFields
    .map(
      (field, index) =>
        `  <ColumnName ColumnIndex="${index}" ColumnWidth="100" DataType="${fieldTypes[field].designer}">${field}</ColumnName>`,
    )
    .join("\n");
  const data = detailRows
    .flatMap((row, rowIndex) =>
      detailFields.map(
        (field, columnIndex) =>
          `  <Data ColumnIndex="${columnIndex}" RowIndex="${rowIndex}">${escapeXml(row[field])}</Data>`,
      ),
    )
    .join("\n");
  return `<DataGrid xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="">
  <RowNumber>${detailRows.length}</RowNumber>
  <ColumnNumber>${detailFields.length}</ColumnNumber>
${columns}
${data}
</DataGrid>`;
};

const queryXml = (): string => `<Query>
  <XmlData>
    <Data>
${detailRows
  .map(
    (row) => `      <Row>
${detailFields.map((field) => `        <${field}>${escapeXml(row[field])}</${field}>`).join("\n")}
      </Row>`,
  )
  .join("\n")}
    </Data>
  </XmlData>
  <ElementPath>Data{}/Row{${detailFields.map((field) => `${field}(${fieldTypes[field].elementPath})`).join(",")}}</ElementPath>
</Query>`;

const fieldsXml = (): string => `<Fields>
${detailFields
  .map(
    (field) => `        <Field Name="${field}">
          <rd:TypeName>${fieldTypes[field].clr}</rd:TypeName>
          <DataField>${field}</DataField>
        </Field>`,
  )
  .join("\n")}
      </Fields>`;

const textbox = (
  name: string,
  contents: string,
  options: {
    bold?: boolean;
    align?: string | undefined;
    format?: string | undefined;
  } = {},
): string => `<Textbox Name="${name}">
                          <rd:DefaultName>${name}</rd:DefaultName>
                          <CanGrow>true</CanGrow>
                          <KeepTogether>true</KeepTogether>
                          <Paragraphs>
                            <Paragraph>
                              <TextRuns>
                                <TextRun>
                                  <Value>${contents}</Value>
                                  <Style>${options.bold ? "<FontWeight>Bold</FontWeight>" : ""}${options.format ? `<Format>${options.format}</Format>` : ""}</Style>
                                </TextRun>
                              </TextRuns>
                              <Style>${options.align ? `<TextAlign>${options.align}</TextAlign>` : ""}</Style>
                            </Paragraph>
                          </Paragraphs>
                          <Style>
                            <Border><Style>None</Style></Border>
                            <PaddingLeft>2pt</PaddingLeft><PaddingRight>2pt</PaddingRight><PaddingTop>2pt</PaddingTop><PaddingBottom>2pt</PaddingBottom>
                          </Style>
                        </Textbox>`;

const cell = (contents: string): string =>
  `                <TablixCell><CellContents>${contents}</CellContents></TablixCell>`;

const tablixXml = (): string => {
  const bodyFields = detailFields.filter((field) => field !== "Region");
  const widths = [
    "0.65in",
    "0.7in",
    "0.75in",
    "0.8in",
    "0.65in",
    "0.45in",
    "0.6in",
    "0.6in",
  ];
  const labels: Record<(typeof bodyFields)[number], string> = {
    SaleDate: "Date",
    Salesperson: "Salesperson",
    Customer: "Customer",
    Product: "Product",
    Category: "Category",
    Quantity: "Qty",
    Revenue: "Revenue",
    GrossProfit: "Gross Profit",
  };
  const formats: Partial<Record<(typeof bodyFields)[number], string>> = {
    SaleDate: "yyyy-MM-dd",
    Quantity: "N0",
    Revenue: "C2",
    GrossProfit: "C2",
  };
  return `<Tablix Name="Tablix1">
            <TablixBody>
              <TablixColumns>
${widths.map((width) => `                <TablixColumn><Width>${width}</Width></TablixColumn>`).join("\n")}
              </TablixColumns>
              <TablixRows>
                <TablixRow>
                  <Height>0.3in</Height>
                  <TablixCells>
${bodyFields.map((field) => cell(textbox(`Header${field}`, labels[field], { bold: true }))).join("\n")}
                  </TablixCells>
                </TablixRow>
                <TablixRow>
                  <Height>0.25in</Height>
                  <TablixCells>
${bodyFields.map((field) => cell(textbox(field, `=Fields!${field}.Value`, { align: ["Quantity", "Revenue", "GrossProfit"].includes(field) ? "Right" : undefined, format: formats[field] }))).join("\n")}
                  </TablixCells>
                </TablixRow>
              </TablixRows>
            </TablixBody>
            <TablixColumnHierarchy><TablixMembers>${bodyFields.map(() => "<TablixMember />").join("")}</TablixMembers></TablixColumnHierarchy>
            <TablixRowHierarchy>
              <TablixMembers>
                <TablixMember>
                  <TablixHeader><Size>0.8in</Size><CellContents>${textbox("HeaderRegion", "Region", { bold: true })}</CellContents></TablixHeader>
                  <TablixMembers><TablixMember /></TablixMembers>
                  <KeepWithGroup>After</KeepWithGroup>
                </TablixMember>
                <TablixMember>
                  <Group Name="Region"><GroupExpressions><GroupExpression>=Fields!Region.Value</GroupExpression></GroupExpressions></Group>
                  <SortExpressions><SortExpression><Value>=Fields!Region.Value</Value></SortExpression></SortExpressions>
                  <TablixHeader><Size>0.8in</Size><CellContents>${textbox("Region", "=Fields!Region.Value")}</CellContents></TablixHeader>
                  <TablixMembers><TablixMember><Group Name="Details" /><Visibility><Hidden>false</Hidden><ToggleItem>Region</ToggleItem></Visibility></TablixMember></TablixMembers>
                </TablixMember>
              </TablixMembers>
            </TablixRowHierarchy>
            <DataSetName>SeedData</DataSetName>
            <Top>0.5in</Top><Height>0.55in</Height><Width>6in</Width>
            <Style><Border><Style>None</Style></Border></Style>
          </Tablix>`;
};

export const deriveCandidate02 = (candidate01: string): string => {
  if (sha256(candidate01) !== candidate01Sha256)
    throw new Error("Accepted Candidate 01 SHA-256 differs from the baseline");
  let candidate = replaceElement(
    candidate01,
    '<DataGrid xmlns:xsd="http://www.w3.org/2001/XMLSchema"',
    "</DataGrid>",
    designerGrid(),
    "DesignerState DataGrid",
  );
  candidate = replaceElement(
    candidate,
    "<CommandText>",
    "</CommandText>",
    `<CommandText>${escapeCommand(queryXml())}</CommandText>`,
    "CommandText",
  );
  candidate = replaceElement(
    candidate,
    "<Fields>",
    "</Fields>",
    fieldsXml(),
    "Fields",
  );
  candidate = replaceElement(
    candidate,
    '<Tablix Name="Tablix1">',
    "</Tablix>",
    tablixXml(),
    "Tablix1",
  );
  return candidate;
};

const atomicWrite = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, { flag: "wx" });
  await rename(temporary, path);
};

export const runCandidate02 = async (outputDirectory: string) => {
  const candidate01 = await readFile(candidate01Path, "utf8");
  const originalCandidate01Hash = sha256(candidate01);
  const candidate = deriveCandidate02(candidate01);
  assertWellFormed(candidate);
  const consistency = validateCollectionConsistency(candidate);
  const output = resolve(outputDirectory);
  const reportPath = join(output, candidate02FileName);
  await atomicWrite(reportPath, candidate);
  if (sha256(await readFile(candidate01Path)) !== originalCandidate01Hash)
    throw new Error(
      "Accepted Candidate 01 changed during Candidate 02 generation",
    );
  const schemaPath = fileURLToPath(
    new URL("../schema/ReportDefinition-2016.xsd", import.meta.url),
  );
  const xsdOutput = execFileSync(
    "xmllint",
    ["--noout", "--schema", schemaPath, reportPath],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const manifest = {
    candidate: candidate02FileName,
    candidateSha256: sha256(candidate),
    derivedDirectlyFrom: "01-minimal-enter-data-table.rdl",
    candidate01Sha256,
    fields: detailFields,
    rows: detailRows,
    validation: {
      xmlWellFormedness: "PASS",
      existingXsd: "PASS",
      xsdOutput: xsdOutput || `${candidate02FileName} validates`,
      collectionConsistency: "PASS",
      candidate01Unchanged: "PASS",
      consistency,
      reportBuilderOpen: "PENDING_INDEPENDENT_WINDOWS",
      reportBuilderPreview: "PENDING_INDEPENDENT_WINDOWS",
    },
  };
  await atomicWrite(
    join(output, "02-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await atomicWrite(
    join(output, "02-CONSISTENCY.json"),
    `${JSON.stringify(
      {
        command:
          "pnpm spike:rdl-compatibility-02 artifacts/rdl-compatibility-ladder",
        derivedFrom: {
          path: "artifacts/rdl-compatibility-ladder/01-minimal-enter-data-table.rdl",
          sha256: candidate01Sha256,
          unchanged: "PASS",
        },
        candidate: {
          path: `artifacts/rdl-compatibility-ladder/${candidate02FileName}`,
          sha256: manifest.candidateSha256,
        },
        consistency,
      },
      null,
      2,
    )}\n`,
  );
  return { reportPath, manifest };
};
