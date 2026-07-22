import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertWellFormed,
  datasetCsv,
  fields,
  generateRdl,
  rows,
  runRdlSpike,
  validateStructure,
} from "./index";

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("Regional Sales Detail RDL", () => {
  it("matches the reviewed deterministic golden RDL", async () => {
    expect(generateRdl()).toBe(
      await readFile(
        resolve(
          "packages/rdl-spike/test-fixtures/Regional Sales Detail.golden.rdl",
        ),
        "utf8",
      ),
    );
  });

  it("is XML well-formed and rejects malformed XML", () => {
    expect(() => assertWellFormed(generateRdl())).not.toThrow();
    expect(() => assertWellFormed("<Report><broken></Report>")).toThrow();
  });

  it("uses the current RDL 2016/01 namespace", () => {
    expect(generateRdl()).toContain(
      'xmlns="http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition"',
    );
  });

  it("embeds all synthetic rows with ENTERDATA and no external connection", () => {
    const xml = generateRdl();
    expect(xml.match(/&lt;Row&gt;/g)).toHaveLength(24);
    expect(xml).toContain("<DataProvider>ENTERDATA</DataProvider>");
    expect(xml).toContain("<ConnectString></ConnectString>");
    expect(xml).toContain("SaleDate(Date)");
    expect(xml).not.toContain("SaleDate(DateTime)");
    expect([...xml.matchAll(/https?:\/\/[^"<]+/g)].map(([url]) => url)).toEqual(
      [
        "http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition",
        "http://schemas.microsoft.com/SQLServer/reporting/reportdesigner",
        "http://www.w3.org/2001/XMLSchema",
        "http://www.w3.org/2001/XMLSchema-instance",
      ],
    );
  });

  it("contains the complete required dataset schema", () => {
    expect(fields).toEqual([
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
    ]);
    for (const field of fields)
      expect(generateRdl()).toContain(`<Field Name="${field}">`);
  });

  it("meets the required data distribution", () => {
    expect(rows).toHaveLength(24);
    expect(
      new Set(rows.map(({ Region }) => Region)).size,
    ).toBeGreaterThanOrEqual(3);
    expect(
      new Set(rows.map(({ Salesperson }) => Salesperson)).size,
    ).toBeGreaterThanOrEqual(4);
    expect(
      new Set(rows.map(({ Category }) => Category)).size,
    ).toBeGreaterThanOrEqual(4);
    expect(new Set(rows.map(({ SaleDate }) => SaleDate)).size).toBeGreaterThan(
      10,
    );
    expect(rows.reduce((total, item) => total + item.Revenue, 0)).toBe(57_205);
    expect(rows.reduce((total, item) => total + item.GrossProfit, 0)).toBe(
      21_820,
    );
  });

  it("contains only valid field references", () => {
    expect(() => validateStructure(generateRdl())).not.toThrow();
    expect(() =>
      validateStructure(
        generateRdl().replace("Fields!Revenue.Value", "Fields!Invented.Value"),
      ),
    ).toThrow("Invalid field reference Invented");
  });

  it("defines region grouping and page breaks", () => {
    const xml = generateRdl();
    expect(xml).toContain('<Group Name="RegionGroup">');
    expect(xml).toContain(
      "<GroupExpression>=Fields!Region.Value</GroupExpression>",
    );
    expect(xml).toContain("<BreakLocation>Between</BreakLocation>");
  });

  it("defines detail rows, repeating headers, and alternating formatting", () => {
    const xml = generateRdl();
    expect(xml).toContain('<Group Name="DetailGroup" />');
    expect(xml).toContain("<RepeatOnNewPage>true</RepeatOnNewPage>");
    expect(xml).toContain("RowNumber(Nothing) Mod 2");
  });

  it("defines region subtotals and report grand totals", () => {
    const xml = generateRdl();
    expect(xml).toContain("=Sum(Fields!Revenue.Value)");
    expect(xml).toContain("=Sum(Fields!GrossProfit.Value)");
    expect(xml).toContain('=Sum(Fields!Revenue.Value, "RegionalSales")');
    expect(xml).toContain('=Sum(Fields!GrossProfit.Value, "RegionalSales")');
  });

  it("defines currency, integer, page-number, and print-safe settings", () => {
    const xml = generateRdl();
    expect(xml.match(/<Format>C2<\/Format>/g)?.length).toBeGreaterThanOrEqual(
      4,
    );
    expect(xml).toContain("<Format>N0</Format>");
    expect(xml).toContain("Globals!PageNumber");
    expect(xml).toContain("Globals!TotalPages");
    expect(xml).toContain("<PageWidth>8.5in</PageWidth>");
    expect(xml).toContain("<Width>7.07in</Width>");
  });

  it("exports the same 24 rows as a reviewable CSV", () => {
    const csv = datasetCsv();
    expect(csv.split("\n")).toHaveLength(26);
    expect(csv).toContain("SaleDate,Region,Salesperson");
    expect(csv).toContain('"2026-01-05","Central","Avery Brooks"');
  });

  it("writes the real RDL, manifests, and schema-valid result", async () => {
    const output = await mkdtemp(join(tmpdir(), "rdl-spike-test-"));
    temporaryDirectories.push(output);
    const result = await runRdlSpike(output);
    expect(result.validation.xsd).toBe("PASS");
    await Promise.all([
      stat(result.reportPath),
      stat(result.datasetPath),
      stat(result.manifestPath),
      stat(join(output, "manifest.json")),
    ]);
  });

  it("creates and hash-verifies a backup before replacement", async () => {
    const output = await mkdtemp(join(tmpdir(), "rdl-backup-test-"));
    temporaryDirectories.push(output);
    await runRdlSpike(output);
    const result = await runRdlSpike(output);
    expect(result.backup.status).toBe("CREATED_AND_HASH_VERIFIED");
    expect(result.backup.sha256).toMatch(/^[a-f0-9]{64}$/);
    await stat(result.backup.path!);
  });
});
