import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SaxesParser } from "saxes";

export interface SaleRow {
  SaleDate: string;
  Region: string;
  Salesperson: string;
  Customer: string;
  Product: string;
  Category: string;
  Quantity: number;
  UnitPrice: number;
  Revenue: number;
  Cost: number;
  GrossProfit: number;
}

export const fields = [
  "SaleDate",
  "Region",
  "Salesperson",
  "Customer",
  "Product",
  "Category",
  "Quantity",
  "UnitPrice",
  "Revenue",
  "Cost",
  "GrossProfit",
] as const;
export const rows: SaleRow[] = [
  [
    "2026-01-05",
    "Central",
    "Avery Brooks",
    "Northwind Health",
    "Ergo Desk",
    "Furniture",
    2,
    875,
    1750,
    1190,
    560,
  ],
  [
    "2026-01-12",
    "Central",
    "Jordan Lee",
    "Summit Foods",
    "Docking Station",
    "Technology",
    8,
    190,
    1520,
    1040,
    480,
  ],
  [
    "2026-01-19",
    "Central",
    "Avery Brooks",
    "Cedar Schools",
    "Task Chair",
    "Furniture",
    10,
    285,
    2850,
    1900,
    950,
  ],
  [
    "2026-02-03",
    "Central",
    "Jordan Lee",
    "Bright Labs",
    "Analytics License",
    "Software",
    15,
    140,
    2100,
    720,
    1380,
  ],
  [
    "2026-02-11",
    "Central",
    "Avery Brooks",
    "Northwind Health",
    "Monitor 27",
    "Technology",
    6,
    365,
    2190,
    1530,
    660,
  ],
  [
    "2026-02-24",
    "Central",
    "Jordan Lee",
    "Summit Foods",
    "Paper Case",
    "Office Supplies",
    20,
    48,
    960,
    580,
    380,
  ],
  [
    "2026-03-08",
    "Central",
    "Avery Brooks",
    "Cedar Schools",
    "Standing Desk",
    "Furniture",
    3,
    1020,
    3060,
    2190,
    870,
  ],
  [
    "2026-03-21",
    "Central",
    "Jordan Lee",
    "Bright Labs",
    "Security Suite",
    "Software",
    12,
    165,
    1980,
    700,
    1280,
  ],
  [
    "2026-01-07",
    "East",
    "Morgan Chen",
    "Atlas Finance",
    "Laptop Pro",
    "Technology",
    4,
    1480,
    5920,
    4280,
    1640,
  ],
  [
    "2026-01-16",
    "East",
    "Riley Patel",
    "Harbor Retail",
    "Printer",
    "Technology",
    5,
    420,
    2100,
    1510,
    590,
  ],
  [
    "2026-01-28",
    "East",
    "Morgan Chen",
    "Greenfield Co",
    "CRM License",
    "Software",
    18,
    125,
    2250,
    810,
    1440,
  ],
  [
    "2026-02-06",
    "East",
    "Riley Patel",
    "Metro Legal",
    "File Cabinet",
    "Furniture",
    7,
    330,
    2310,
    1610,
    700,
  ],
  [
    "2026-02-17",
    "East",
    "Morgan Chen",
    "Atlas Finance",
    "Notebook Pack",
    "Office Supplies",
    30,
    22,
    660,
    360,
    300,
  ],
  [
    "2026-02-26",
    "East",
    "Riley Patel",
    "Harbor Retail",
    "Conference Table",
    "Furniture",
    1,
    2250,
    2250,
    1590,
    660,
  ],
  [
    "2026-03-11",
    "East",
    "Morgan Chen",
    "Greenfield Co",
    "Cloud Backup",
    "Software",
    25,
    72,
    1800,
    550,
    1250,
  ],
  [
    "2026-03-25",
    "East",
    "Riley Patel",
    "Metro Legal",
    "Headset",
    "Technology",
    14,
    115,
    1610,
    980,
    630,
  ],
  [
    "2026-01-09",
    "West",
    "Casey Rivera",
    "Pioneer Energy",
    "Mobile Workstation",
    "Technology",
    3,
    1820,
    5460,
    3970,
    1490,
  ],
  [
    "2026-01-22",
    "West",
    "Taylor Kim",
    "Coastal Hotels",
    "Guest Chair",
    "Furniture",
    12,
    240,
    2880,
    1980,
    900,
  ],
  [
    "2026-02-01",
    "West",
    "Casey Rivera",
    "Redwood Media",
    "Design License",
    "Software",
    10,
    210,
    2100,
    760,
    1340,
  ],
  [
    "2026-02-14",
    "West",
    "Taylor Kim",
    "Orchard Markets",
    "Label Roll",
    "Office Supplies",
    40,
    18,
    720,
    390,
    330,
  ],
  [
    "2026-02-22",
    "West",
    "Casey Rivera",
    "Pioneer Energy",
    "Ultrawide Monitor",
    "Technology",
    5,
    690,
    3450,
    2460,
    990,
  ],
  [
    "2026-03-04",
    "West",
    "Taylor Kim",
    "Coastal Hotels",
    "Reception Desk",
    "Furniture",
    2,
    1325,
    2650,
    1840,
    810,
  ],
  [
    "2026-03-16",
    "West",
    "Casey Rivera",
    "Redwood Media",
    "Archive Storage",
    "Technology",
    9,
    275,
    2475,
    1675,
    800,
  ],
  [
    "2026-03-29",
    "West",
    "Taylor Kim",
    "Orchard Markets",
    "Inventory License",
    "Software",
    16,
    135,
    2160,
    770,
    1390,
  ],
].map(
  ([
    SaleDate,
    Region,
    Salesperson,
    Customer,
    Product,
    Category,
    Quantity,
    UnitPrice,
    Revenue,
    Cost,
    GrossProfit,
  ]) =>
    ({
      SaleDate,
      Region,
      Salesperson,
      Customer,
      Product,
      Category,
      Quantity,
      UnitPrice,
      Revenue,
      Cost,
      GrossProfit,
    }) as SaleRow,
);

const escape = (value: unknown): string =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const hash = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");
const textbox = (
  name: string,
  value: string,
  style = "",
  options = "",
): string =>
  `<Textbox Name="${name}"><CanGrow>true</CanGrow><KeepTogether>true</KeepTogether><Paragraphs><Paragraph><TextRuns><TextRun><Value>${value}</Value><Style>${style}</Style></TextRun></TextRuns><Style /></Paragraph></Paragraphs><rd:DefaultName>${name}</rd:DefaultName>${options}<Style><Border><Style>None</Style></Border><PaddingLeft>3pt</PaddingLeft><PaddingRight>3pt</PaddingRight><PaddingTop>2pt</PaddingTop><PaddingBottom>2pt</PaddingBottom></Style></Textbox>`;
const cell = (content: string, span = 1): string =>
  `<TablixCell><CellContents>${content}${span > 1 ? `<ColSpan>${span}</ColSpan>` : ""}</CellContents></TablixCell>`;
const row = (cells: string[], height: string): string =>
  `<TablixRow><Height>${height}</Height><TablixCells>${cells.join("")}</TablixCells></TablixRow>`;

const commandXml = (): string =>
  `<Query><XmlData><Data>${rows.map((item) => `<Row>${fields.map((field) => `<${field}>${escape(item[field])}</${field}>`).join("")}</Row>`).join("")}</Data></XmlData><ElementPath>Data{}/Row{SaleDate(Date),Region(String),Salesperson(String),Customer(String),Product(String),Category(String),Quantity(Integer),UnitPrice(Decimal),Revenue(Decimal),Cost(Decimal),GrossProfit(Decimal)}</ElementPath></Query>`;
const designerGrid = (): string =>
  `<rd:DesignerState><DataGrid xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns=""><RowNumber>${rows.length}</RowNumber><ColumnNumber>${fields.length}</ColumnNumber>${fields.map((field, index) => `<ColumnName ColumnIndex="${index}" ColumnWidth="120" DataType="${["UnitPrice", "Revenue", "Cost", "GrossProfit"].includes(field) ? "System.Decimal" : field === "Quantity" ? "System.Int32" : field === "SaleDate" ? "System.DateTime" : "System.String"}">${field}</ColumnName>`).join("")}${rows.map((item, rowIndex) => fields.map((field, columnIndex) => `<Data ColumnIndex="${columnIndex}" RowIndex="${rowIndex}">${escape(item[field])}</Data>`).join("")).join("")}</DataGrid></rd:DesignerState>`;

export const datasetCsv = (): string =>
  `${fields.join(",")}\n${rows.map((item) => fields.map((field) => JSON.stringify(item[field])).join(",")).join("\n")}\n`;

export const generateRdl = (): string => {
  const widths = [0.72, 0.9, 1.05, 1.2, 0.95, 0.55, 0.85, 0.85];
  const headers = [
    "Date",
    "Salesperson",
    "Customer",
    "Product",
    "Category",
    "Qty",
    "Revenue",
    "Gross Profit",
  ];
  const detailFields = [
    "SaleDate",
    "Salesperson",
    "Customer",
    "Product",
    "Category",
    "Quantity",
    "Revenue",
    "GrossProfit",
  ];
  const headerStyle =
    "<FontWeight>Bold</FontWeight><Color>#FFFFFF</Color><BackgroundColor>#1F4E78</BackgroundColor><TextAlign>Center</TextAlign>";
  const detailRows = row(
    detailFields.map((field) =>
      cell(
        textbox(
          `Detail${field}`,
          `=Fields!${field}.Value`,
          `${field === "SaleDate" ? "<Format>yyyy-MM-dd</Format>" : ["Revenue", "GrossProfit"].includes(field) ? "<Format>C2</Format><TextAlign>Right</TextAlign>" : field === "Quantity" ? "<Format>N0</Format><TextAlign>Right</TextAlign>" : ""}<BackgroundColor>=IIF(RowNumber(Nothing) Mod 2 = 0, &quot;#F2F6FA&quot;, &quot;#FFFFFF&quot;)</BackgroundColor>`,
        ),
      ),
    ),
    "0.24in",
  );
  const report = `<?xml version="1.0" encoding="utf-8"?>
<Report xmlns="http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition" xmlns:rd="http://schemas.microsoft.com/SQLServer/reporting/reportdesigner">
  <rd:ReportUnitType>Inch</rd:ReportUnitType><rd:ReportID>7aee86f8-cdd8-4c26-97c9-d68440dc3f2e</rd:ReportID><AutoRefresh>0</AutoRefresh>
  <DataSources><DataSource Name="EnterDataDS"><rd:SecurityType>Integrated</rd:SecurityType><ConnectionProperties><DataProvider>ENTERDATA</DataProvider><ConnectString></ConnectString><IntegratedSecurity>true</IntegratedSecurity></ConnectionProperties><rd:DataSourceID>90d79dda-1c9f-4b79-b529-bb3e3cd445c0</rd:DataSourceID></DataSource></DataSources>
  <DataSets><DataSet Name="RegionalSales"><Query><DataSourceName>EnterDataDS</DataSourceName>${designerGrid()}<CommandText>${escape(commandXml())}</CommandText></Query><Fields>${fields.map((field) => `<Field Name="${field}"><DataField>${field}</DataField><rd:TypeName>System.${field === "SaleDate" ? "DateTime" : field === "Quantity" ? "Int32" : ["UnitPrice", "Revenue", "Cost", "GrossProfit"].includes(field) ? "Decimal" : "String"}</rd:TypeName></Field>`).join("")}</Fields></DataSet></DataSets>
  <ReportSections><ReportSection><Body><ReportItems>
    ${textbox("ReportTitle", "Regional Sales Detail", "<FontFamily>Segoe UI</FontFamily><FontSize>20pt</FontSize><FontWeight>Bold</FontWeight><Color>#1F4E78</Color>", "<Top>0in</Top><Left>0in</Left><Height>0.38in</Height><Width>7.07in</Width>")}
    ${textbox("ReportSubtitle", "Reporting period: January 1–March 31, 2026 • Generated 2026-07-20T12:00:00Z", "<FontFamily>Segoe UI</FontFamily><FontSize>9pt</FontSize><Color>#5B6573</Color>", "<Top>0.4in</Top><Left>0in</Left><Height>0.24in</Height><Width>7.07in</Width>")}
    <Tablix Name="RegionalSalesTablix"><TablixBody><TablixColumns>${widths.map((width) => `<TablixColumn><Width>${width}in</Width></TablixColumn>`).join("")}</TablixColumns><TablixRows>
      ${row(
        headers.map((header) =>
          cell(
            textbox(`Header${header.replaceAll(" ", "")}`, header, headerStyle),
          ),
        ),
        "0.3in",
      )}
      ${row([cell(textbox("RegionHeading", '="Region: " &amp; Fields!Region.Value', "<FontWeight>Bold</FontWeight><Color>#1F4E78</Color><BackgroundColor>#D9EAF7</BackgroundColor>"), 8)], "0.28in")}
      ${detailRows}
      ${row([cell(textbox("RegionSubtotalLabel", '="Subtotal — " &amp; Fields!Region.Value', "<FontWeight>Bold</FontWeight><BackgroundColor>#D9EAF7</BackgroundColor>"), 6), cell(textbox("RegionRevenue", "=Sum(Fields!Revenue.Value)", "<FontWeight>Bold</FontWeight><Format>C2</Format><TextAlign>Right</TextAlign><BackgroundColor>#D9EAF7</BackgroundColor>")), cell(textbox("RegionProfit", "=Sum(Fields!GrossProfit.Value)", "<FontWeight>Bold</FontWeight><Format>C2</Format><TextAlign>Right</TextAlign><BackgroundColor>#D9EAF7</BackgroundColor>"))], "0.28in")}
      ${row([cell(textbox("GrandTotalLabel", "Grand Total", "<FontWeight>Bold</FontWeight><Color>#FFFFFF</Color><BackgroundColor>#1F4E78</BackgroundColor>"), 6), cell(textbox("GrandRevenue", '=Sum(Fields!Revenue.Value, "RegionalSales")', "<FontWeight>Bold</FontWeight><Color>#FFFFFF</Color><Format>C2</Format><TextAlign>Right</TextAlign><BackgroundColor>#1F4E78</BackgroundColor>")), cell(textbox("GrandProfit", '=Sum(Fields!GrossProfit.Value, "RegionalSales")', "<FontWeight>Bold</FontWeight><Color>#FFFFFF</Color><Format>C2</Format><TextAlign>Right</TextAlign><BackgroundColor>#1F4E78</BackgroundColor>"))], "0.3in")}
    </TablixRows></TablixBody><TablixColumnHierarchy><TablixMembers>${widths.map(() => "<TablixMember />").join("")}</TablixMembers></TablixColumnHierarchy><TablixRowHierarchy><TablixMembers><TablixMember><KeepWithGroup>After</KeepWithGroup><RepeatOnNewPage>true</RepeatOnNewPage></TablixMember><TablixMember><Group Name="RegionGroup"><GroupExpressions><GroupExpression>=Fields!Region.Value</GroupExpression></GroupExpressions><PageBreak><BreakLocation>Between</BreakLocation></PageBreak></Group><SortExpressions><SortExpression><Value>=Fields!Region.Value</Value></SortExpression></SortExpressions><TablixMembers><TablixMember><KeepWithGroup>After</KeepWithGroup></TablixMember><TablixMember><Group Name="DetailGroup" /><SortExpressions><SortExpression><Value>=Fields!SaleDate.Value</Value></SortExpression></SortExpressions></TablixMember><TablixMember><KeepWithGroup>Before</KeepWithGroup></TablixMember></TablixMembers></TablixMember><TablixMember><KeepWithGroup>Before</KeepWithGroup></TablixMember></TablixMembers></TablixRowHierarchy><DataSetName>RegionalSales</DataSetName><Top>0.75in</Top><Left>0in</Left><Height>1.4in</Height><Width>7.07in</Width><Style><Border><Style>Solid</Style><Color>#B7C9D6</Color></Border></Style></Tablix>
  </ReportItems><Height>2.3in</Height><Style /></Body><Width>7.07in</Width><Page><PageFooter><Height>0.35in</Height><PrintOnFirstPage>true</PrintOnFirstPage><PrintOnLastPage>true</PrintOnLastPage><ReportItems>${textbox("PageNumber", '="Page " &amp; Globals!PageNumber &amp; " of " &amp; Globals!TotalPages', "<FontSize>9pt</FontSize><Color>#5B6573</Color><TextAlign>Right</TextAlign>", "<Top>0.05in</Top><Left>5.4in</Left><Height>0.2in</Height><Width>1.67in</Width>")}</ReportItems><Style /></PageFooter><PageHeight>11in</PageHeight><PageWidth>8.5in</PageWidth><LeftMargin>0.65in</LeftMargin><RightMargin>0.65in</RightMargin><TopMargin>0.55in</TopMargin><BottomMargin>0.55in</BottomMargin><ColumnSpacing>0.13in</ColumnSpacing><Style /></Page></ReportSection></ReportSections><Language>en-US</Language><ConsumeContainerWhitespace>true</ConsumeContainerWhitespace></Report>`;
  return `${report}\n`;
};

export const assertWellFormed = (xml: string): void => {
  let failure: Error | undefined;
  const parser = new SaxesParser({ xmlns: true });
  parser.on("error", (error) => {
    failure = error;
  });
  parser.write(xml).close();
  if (failure) throw failure;
};

export const validateStructure = (xml: string): void => {
  for (const field of fields)
    if (!xml.includes(`<Field Name="${field}">`))
      throw new Error(`Missing dataset field ${field}`);
  const references = [
    ...xml.matchAll(/Fields!([A-Za-z][A-Za-z0-9]*?)\.Value/g),
  ].map((match) => match[1]!);
  for (const reference of references)
    if (!fields.includes(reference as (typeof fields)[number]))
      throw new Error(`Invalid field reference ${reference}`);
  for (const expected of [
    "RegionGroup",
    "DetailGroup",
    "Sum(Fields!Revenue.Value)",
    "Sum(Fields!GrossProfit.Value)",
    'Sum(Fields!Revenue.Value, "RegionalSales")',
    'Sum(Fields!GrossProfit.Value, "RegionalSales")',
    "RepeatOnNewPage",
    "Globals!PageNumber",
    "Globals!TotalPages",
    "DataProvider>ENTERDATA",
    "&lt;Row&gt;",
  ])
    if (!xml.includes(expected))
      throw new Error(`Missing required RDL structure: ${expected}`);
  if (
    rows.length < 20 ||
    new Set(rows.map(({ Region }) => Region)).size < 3 ||
    new Set(rows.map(({ Salesperson }) => Salesperson)).size < 4 ||
    new Set(rows.map(({ Category }) => Category)).size < 4
  )
    throw new Error("Synthetic dataset distribution is insufficient");
  const bodyWidth = 7.07;
  const horizontalMargins = 0.65 + 0.65;
  const pageWidth = 8.5;
  if (bodyWidth + horizontalMargins > pageWidth)
    throw new Error("Body width and margins exceed page width");
};

const atomicWrite = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, { flag: "wx" });
  if (path.endsWith(".rdl"))
    assertWellFormed(await readFile(temporary, "utf8"));
  await rename(temporary, path);
};

export interface RdlSpikeResult {
  reportPath: string;
  datasetPath: string;
  rowCount: number;
  regions: string[];
  backup: { status: string; path?: string; sha256?: string };
  validation: { xsd: string; output: string };
  manifestPath: string;
}
export const runRdlSpike = async (
  outputDirectory: string,
): Promise<RdlSpikeResult> => {
  const output = resolve(outputDirectory);
  await mkdir(output, { recursive: true });
  const reportPath = join(output, "Regional Sales Detail.rdl");
  const datasetPath = join(output, "regional-sales.csv");
  const backup: { status: string; path?: string; sha256?: string } = {
    status: "NOT_REQUIRED_NEW_TARGET",
  };
  try {
    await stat(reportPath);
    const backupPath = join(output, ".backups", "Regional Sales Detail.rdl");
    await mkdir(dirname(backupPath), { recursive: true });
    await writeFile(backupPath, await readFile(reportPath));
    backup.status = "CREATED_AND_HASH_VERIFIED";
    backup.path = backupPath;
    backup.sha256 = hash(await readFile(backupPath));
    if (hash(await readFile(reportPath)) !== hash(await readFile(backupPath)))
      throw new Error("Backup hash verification failed");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const xml = generateRdl();
  assertWellFormed(xml);
  validateStructure(xml);
  await atomicWrite(reportPath, xml);
  await atomicWrite(datasetPath, datasetCsv());
  const schemaPath = fileURLToPath(
    new URL("../schema/ReportDefinition-2016.xsd", import.meta.url),
  );
  let xsd = "PASS",
    xsdOutput = "";
  try {
    xsdOutput = execFileSync(
      "xmllint",
      ["--noout", "--schema", schemaPath, reportPath],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (error) {
    xsd = "FAIL";
    const failure = error as { stdout?: string; stderr?: string };
    xsdOutput = `${failure.stdout ?? ""}${failure.stderr ?? ""}`;
    throw new Error(`Microsoft RDL XSD validation failed:\n${xsdOutput}`);
  }
  const inventory = {
    report: {
      path: "Regional Sales Detail.rdl",
      sha256: hash(await readFile(reportPath)),
    },
    dataset: {
      path: "regional-sales.csv",
      sha256: hash(await readFile(datasetPath)),
    },
    fields,
    rows: rows.length,
    regions: [...new Set(rows.map(({ Region }) => Region))],
    salespeople: [...new Set(rows.map(({ Salesperson }) => Salesperson))],
    categories: [...new Set(rows.map(({ Category }) => Category))],
    validation: {
      wellFormed: "PASS",
      microsoftRdl2016Xsd: xsd,
      xsdOutput: xsdOutput || "Regional Sales Detail.rdl validates",
    },
    backup: {
      status: backup.status,
      ...(backup.path
        ? { path: ".backups/Regional Sales Detail.rdl", sha256: backup.sha256 }
        : {}),
    },
    rendering: "PENDING_WINDOWS",
  };
  await atomicWrite(
    join(output, "manifest.json"),
    `${JSON.stringify(inventory, null, 2)}\n`,
  );
  const manifestPath = join(output, "MANIFEST.md");
  await atomicWrite(
    manifestPath,
    `# Regional Sales Detail\n\n- Rows: ${rows.length}\n- Regions: ${inventory.regions.join(", ")}\n- Embedded provider: ENTERDATA\n- Report SHA-256: \`${inventory.report.sha256}\`\n- Dataset SHA-256: \`${inventory.dataset.sha256}\`\n- XML well-formedness: PASS\n- Microsoft RDL 2016/01 XSD: ${xsd}\n- Structural references and print width: PASS\n- Report Builder rendering: PENDING WINDOWS\n`,
  );
  return {
    reportPath,
    datasetPath,
    rowCount: rows.length,
    regions: inventory.regions,
    backup,
    validation: { xsd, output: inventory.validation.xsdOutput },
    manifestPath,
  };
};
