import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  corpusSourceInventorySchema,
  inspectCorpusRdlBytes,
} from "./corpus-source-inventory";
import { inspectRdlFile } from "./inspection";
import { validateXmlAgainstXsd } from "./xsd-validator";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const fixtureRoot = resolve(
  repositoryRoot,
  "examples/rdl-structure-corpus/simple-table",
);
const sourcePath = resolve(
  fixtureRoot,
  "source/synthetic-inventory-detail.rdl",
);
const inventoryPath = resolve(fixtureRoot, "inventory/source-inventory.json");
const schemaPath = resolve(
  repositoryRoot,
  "packages/rdl-spike/schema/ReportDefinition-2016.xsd",
);
const expectedSha256 =
  "e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3";
const sha256 = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

async function inspectFixture() {
  const source = await readFile(sourcePath);
  return {
    source,
    inventory: await inspectCorpusRdlBytes(
      source,
      "synthetic-inventory-detail.rdl",
    ),
  };
}

describe("Gate 2B simple-table authored fixture", () => {
  it("pins the exact immutable source identity", async () => {
    const source = await readFile(sourcePath);
    expect((await stat(sourcePath)).size).toBe(21_402);
    expect(sha256(source)).toBe(expectedSha256);
  });

  it("parses safely and reproduces the committed inventory deterministically", async () => {
    const { inventory } = await inspectFixture();
    const committed = corpusSourceInventorySchema.parse(
      JSON.parse(await readFile(inventoryPath, "utf8")),
    );
    expect(inventory).toEqual(committed);
    expect(
      await inspectCorpusRdlBytes(
        await readFile(sourcePath),
        inventory.source.fileName,
      ),
    ).toEqual(inventory);
  });

  it("passes XML and Microsoft RDL 2016 XSD validation without changing bytes", async () => {
    const before = await readFile(sourcePath);
    const inventory = await inspectCorpusRdlBytes(
      before,
      "synthetic-inventory-detail.rdl",
    );
    expect(inventory.xml).toMatchObject({
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

  it("records the embedded data and actual serialized field types", async () => {
    const { inventory } = await inspectFixture();
    expect(inventory.datasets).toEqual([
      {
        name: "InventoryData",
        provider: "ENTERDATA",
        fields: ["Item", "Warehouse", "Units", "UnitCost"].map((name) => ({
          name,
          typeName: "System.String",
          dataField: name,
        })),
        designerState: {
          rowCount: 5,
          columnCount: 4,
          columns: ["Item", "Warehouse", "Units", "UnitCost"].map((name) => ({
            name,
            dataType: "String",
          })),
        },
      },
    ]);
  });

  it("has one detail table and no semantic groups, parameters, totals, or page breaks", async () => {
    const { inventory } = await inspectFixture();
    expect(inventory.counts).toMatchObject({
      datasets: 1,
      parameters: 0,
      tablixes: 1,
      serializedGroups: 1,
      nonDetailGroups: 0,
      textboxes: 10,
      aggregateExpressions: 0,
      pageBreaks: 0,
    });
    expect(inventory.tablixes).toEqual([
      {
        name: "InventoryTable",
        datasetName: "InventoryData",
        columnCount: 4,
        rowCount: 2,
      },
    ]);
    expect(inventory.groups).toEqual([
      { name: "Details", expressions: [], kind: "details" },
    ]);
  });

  it("records title and numeric candidates without invoking resolution", async () => {
    const { inventory } = await inspectFixture();
    expect(
      inventory.textboxes.filter(({ values }) =>
        values.some((value) =>
          ["InventoryReportTitle", "Synthetic Inventory Detail"].includes(
            value,
          ),
        ),
      ),
    ).toEqual([
      expect.objectContaining({
        name: "ReportTitle",
        values: ["InventoryReportTitle"],
        fontSizes: ["18pt"],
        fontWeights: ["Bold"],
      }),
      expect.objectContaining({
        name: "Textbox9",
        values: ["Synthetic Inventory Detail"],
      }),
    ]);
    expect(inventory.textboxes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "DetailUnit",
          values: ["=Fields!Units.Value"],
          formats: ["0"],
        }),
        expect.objectContaining({
          name: "DetailUnitCose",
          values: ["=Fields!UnitCost.Value"],
          formats: ["'$'0.00;('$'0.00)"],
        }),
      ]),
    );
  });

  it("documents why generic sidecar inspection remains unevaluated", async () => {
    await expect(inspectRdlFile(sourcePath)).rejects.toThrow(
      "ReportSection 0 lacks PageWidth",
    );
  });
});
