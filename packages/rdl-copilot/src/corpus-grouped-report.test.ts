import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectCorpusRdlBytes } from "./corpus-source-inventory";
import { inspectRdlFile } from "./inspection";
import { validateXmlAgainstXsd } from "./xsd-validator";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const fixtureRoot = resolve(
  repositoryRoot,
  "examples/rdl-structure-corpus/grouped-report",
);
const sourcePath = resolve(
  fixtureRoot,
  "source/synthetic-department-sales.rdl",
);
const inventoryPath = resolve(fixtureRoot, "inventory/source-inventory.json");
const schemaPath = resolve(
  repositoryRoot,
  "packages/rdl-spike/schema/ReportDefinition-2016.xsd",
);
const expectedSha256 =
  "03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b";
const sha256 = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

interface CommittedGroupedInventory {
  source: unknown;
  xml: unknown;
  counts: unknown;
  reportItems: { textboxNames: string[] };
  tablix: {
    bodyColumnCount: number;
    bodyRowCount: number;
    bodyRows: Array<{ classification: string }>;
    rowHierarchy: Array<{
      path: string;
      kind: string;
      groupName?: string;
      groupExpression?: string | null;
    }>;
  };
  aggregateExpressions: Array<{
    textboxName: string;
    expression: string;
    format: string;
    scopeEvidence: string;
  }>;
  pagination: unknown;
}

async function fixtureEvidence() {
  const source = await readFile(sourcePath);
  return {
    source,
    text: source.toString("utf8"),
    inventory: await inspectCorpusRdlBytes(
      source,
      "synthetic-department-sales.rdl",
    ),
    committed: JSON.parse(
      await readFile(inventoryPath, "utf8"),
    ) as CommittedGroupedInventory,
  };
}

describe("Gate 2C grouped-report authored fixture", () => {
  it("pins the exact immutable source identity", async () => {
    const source = await readFile(sourcePath);
    expect((await stat(sourcePath)).size).toBe(52_651);
    expect(sha256(source)).toBe(expectedSha256);
  });

  it("parses safely and derives deterministic committed inventory facts", async () => {
    const first = await fixtureEvidence();
    const second = await inspectCorpusRdlBytes(
      await readFile(sourcePath),
      "synthetic-department-sales.rdl",
    );
    expect(second).toEqual(first.inventory);
    expect(first.committed).toMatchObject({
      source: first.inventory.source,
      xml: first.inventory.xml,
      counts: first.inventory.counts,
    });
    expect(first.committed.reportItems.textboxNames).toEqual(
      first.inventory.textboxes.map(({ name }) => name),
    );
  });

  it("passes XML and XSD validation without changing authored bytes", async () => {
    const before = await readFile(sourcePath);
    const inventory = await inspectCorpusRdlBytes(
      before,
      "synthetic-department-sales.rdl",
    );
    expect(inventory.xml).toEqual({
      wellFormed: true,
      namespace:
        "http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition",
      reportBuilderName: "PBIRB",
      reportBuilderVersion: "15.7.1819.28",
    });
    await expect(
      validateXmlAgainstXsd(before, await readFile(schemaPath)),
    ).resolves.toEqual({ engine: "libxml2-wasm", status: "PASS" });
    expect(sha256(await readFile(sourcePath))).toBe(sha256(before));
  });

  it("records eight typed rows across four Departments", async () => {
    const { inventory, text } = await fixtureEvidence();
    expect(inventory.datasets).toEqual([
      {
        name: "DepartmentSales",
        provider: "ENTERDATA",
        fields: [
          ["SaleDate", "System.DateTime"],
          ["Department", "System.String"],
          ["Representative", "System.String"],
          ["Units", "System.Int32"],
          ["Revenue", "System.Double"],
        ].map(([name, typeName]) => ({ name, typeName, dataField: name })),
        designerState: {
          rowCount: 8,
          columnCount: 5,
          columns: [
            ["SaleDate", "Date"],
            ["Department", "String"],
            ["Representative", "String"],
            ["Units", "Integer"],
            ["Revenue", "Float"],
          ].map(([name, dataType]) => ({ name, dataType })),
        },
      },
    ]);
    const departments = [
      ...text.matchAll(
        /<Data ColumnIndex="1" RowIndex="\d+">([^<]+)<\/Data>/gu,
      ),
    ].map((match) => match[1]);
    expect(departments).toEqual([
      "Design",
      "Design",
      "Field Services",
      "Field Services",
      "Operations",
      "Operations",
      "Research",
      "Research",
    ]);
  });

  it("distinguishes Department, Details, subtotal, and Grand Total hierarchy", async () => {
    const { inventory, committed, text } = await fixtureEvidence();
    expect(inventory.groups).toEqual([
      {
        name: "Department",
        expressions: ["=Fields!Department.Value"],
        kind: "group",
      },
      { name: "Details", expressions: [], kind: "details" },
    ]);
    expect(inventory.tablixes).toEqual([
      {
        name: "DepartmentSalesTable",
        datasetName: "DepartmentSales",
        columnCount: 4,
        rowCount: 5,
      },
    ]);
    expect(committed.tablix.bodyColumnCount).toBe(4);
    expect(committed.tablix.bodyRowCount).toBe(5);
    expect(
      committed.tablix.bodyRows.map(({ classification }) => classification),
    ).toEqual([
      "staticColumnHeaders",
      "departmentHeaderCompanion",
      "details",
      "departmentSubtotal",
      "grandTotal",
    ]);
    expect(committed.tablix.rowHierarchy).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "1",
          groupName: "Department",
          groupExpression: "=Fields!Department.Value",
        }),
        expect.objectContaining({ path: "1.1.0", groupName: "Details" }),
        expect.objectContaining({
          path: "1.2",
          kind: "departmentSubtotal",
        }),
        expect.objectContaining({
          path: "2",
          kind: "grandTotalOutsideDepartment",
        }),
      ]),
    );
    expect(text.match(/<Value>Grand Total<\/Value>/gu)).toHaveLength(1);
  });

  it("pins subtotal and Grand Total aggregate evidence by hierarchy position", async () => {
    const { committed, inventory } = await fixtureEvidence();
    expect(inventory.counts.aggregateExpressions).toBe(4);
    expect(committed.aggregateExpressions).toEqual([
      {
        textboxName: "Textbox54",
        expression: "=Sum(Fields!Units.Value)",
        format: "0",
        scopeEvidence: "body row 3 and hierarchy member 1.2 beneath Department",
      },
      {
        textboxName: "DepartmentRevenueSubtotal",
        expression: "=Sum(Fields!Revenue.Value)",
        format: "C2",
        scopeEvidence: "body row 3 and hierarchy member 1.2 beneath Department",
      },
      {
        textboxName: "Textbox67",
        expression: "=Sum(Fields!Units.Value)",
        format: "0",
        scopeEvidence: "body row 4 and hierarchy member 2 outside Department",
      },
      {
        textboxName: "ReportRevenueTotal",
        expression: "=Sum(Fields!Revenue.Value)",
        format: "C2",
        scopeEvidence: "body row 4 and hierarchy member 2 outside Department",
      },
    ]);
  });

  it("pins page breaks and actual repeated-heading serialization", async () => {
    const { committed, text } = await fixtureEvidence();
    expect(text).toContain("<BreakLocation>Between</BreakLocation>");
    expect(text).toContain("<RepeatRowHeaders>true</RepeatRowHeaders>");
    expect(text).toContain("<FixedRowHeaders>true</FixedRowHeaders>");
    expect(text).not.toContain("<RepeatOnNewPage>");
    expect(committed.pagination).toEqual({
      departmentPageBreak: {
        groupName: "Department",
        breakLocation: "Between",
      },
      repeatedHeadingSerialization: {
        repeatRowHeaders: true,
        fixedRowHeaders: true,
        repeatOnNewPageElements: 0,
      },
    });
  });

  it("records title, date, Units, and Revenue display evidence", async () => {
    const { inventory } = await fixtureEvidence();
    expect(inventory.textboxes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "ReportTitle",
          values: ["Synthetic Department Sales Summary"],
          fontSizes: ["18pt"],
          fontWeights: ["Bold"],
        }),
        expect.objectContaining({
          name: "DetailSaleDate",
          values: ["=Fields!SaleDate.Value"],
          formats: [],
        }),
        expect.objectContaining({
          name: "DetailUnits",
          values: ["=Fields!Units.Value"],
          formats: ["0"],
        }),
        expect.objectContaining({
          name: "DetailRevenue",
          values: ["=Fields!Revenue.Value"],
          formats: ["C2"],
        }),
      ]),
    );
  });

  it("contains no parameters and records the generic inspector dimension stop", async () => {
    const { inventory } = await fixtureEvidence();
    expect(inventory.counts.parameters).toBe(0);
    expect(inventory.reportSections).toEqual([
      {
        bodyWidth: "7.08333in",
        serializedPageWidth: null,
        serializedPageHeight: null,
        margins: {
          left: "0.5in",
          right: "0.5in",
          top: "0.5in",
          bottom: "0.5in",
        },
      },
    ]);
    await expect(inspectRdlFile(sourcePath)).rejects.toThrow(
      "ReportSection 0 lacks PageWidth",
    );
  });
});
