import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RdlInspectionError,
  inspectRdlBytes,
  inspectRdlFile,
  rdlInventorySchema,
  resolveFieldDisplays,
  resolveInventoryTargets,
  resolveReportTitle,
} from "./inspection";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const sourceArtifact = resolve(
  repositoryRoot,
  "artifacts/rdl-compatibility-ladder/06b-production-pagination-letter.rdl",
);
const fixture = resolve(
  repositoryRoot,
  "examples/existing-rdl-sidecar/source/regional-sales-existing.rdl",
);
const inventoryEvidence = resolve(
  repositoryRoot,
  "examples/existing-rdl-sidecar/inventory/gate-1-inventory.json",
);

const expectInspectionCode = (
  operation: () => unknown,
  code: RdlInspectionError["code"],
) => {
  try {
    operation();
    throw new Error("Expected RDL inspection operation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(RdlInspectionError);
    expect((error as RdlInspectionError).code).toBe(code);
  }
};

describe("existing RDL inspection", () => {
  it("uses an unchanged copy of the accepted Report Builder-authored artifact", async () => {
    expect(await readFile(fixture)).toEqual(await readFile(sourceArtifact));
  });

  it("returns a runtime-validated stable structural inventory", async () => {
    const inventory = await inspectRdlFile(fixture);
    expect(rdlInventorySchema.parse(inventory)).toEqual(inventory);
    expect(inventory).toMatchObject({
      version: 1,
      fileName: "regional-sales-existing.rdl",
      sourceSha256:
        "c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a",
      namespace:
        "http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition",
      namespaceVersion: "2016/01",
      reportParameters: [],
      datasets: [
        {
          name: "SeedData",
          fields: [
            "SaleDate",
            "Region",
            "Salesperson",
            "Customer",
            "Product",
            "Category",
            "Quantity",
            "Revenue",
            "GrossProfit",
          ],
        },
      ],
      tablixes: [{ name: "Tablix1", datasetName: "SeedData" }],
      groups: [
        { name: "Region", expressions: ["=Fields!Region.Value"] },
        { name: "Region1", expressions: ["=Fields!Region.Value"] },
        { name: "Details", expressions: [] },
      ],
      reportSections: [
        {
          index: 0,
          bodyWidth: "7in",
          pageWidth: "8.5in",
          pageHeight: "11in",
          orientation: "portrait",
          margins: {
            left: "0.5in",
            right: "0.5in",
            top: "0.5in",
            bottom: "0.5in",
          },
        },
      ],
    });
    expect(inventory.textboxes.map(({ name }) => name)).toContain(
      "ReportTitle",
    );
    expect(inventory.textboxes).toHaveLength(42);
    expect(
      inventory.textboxes.find(({ name }) => name === "ReportTitle"),
    ).toMatchObject({
      container: "reportBody",
      staticText: ["Regional Sales Subtotal Compatibility Test"],
      expressions: [],
      fontSizes: ["28pt"],
    });
  });

  it("matches the committed deterministic Gate 1 inventory evidence", async () => {
    const inventory = await inspectRdlFile(fixture);
    const evidence = JSON.parse(
      await readFile(inventoryEvidence, "utf8"),
    ) as unknown;
    expect(evidence).toEqual({
      gate: 1,
      status: "PASS",
      inventory,
      resolvedTargets: resolveInventoryTargets(inventory),
    });
  });

  it("discovers static text and exact field expressions without matching labels", async () => {
    const inventory = await inspectRdlFile(fixture);
    const header = inventory.textboxes.find(
      ({ name }) => name === "HeaderRevenue",
    );
    expect(header?.staticText).toEqual(["Revenue"]);
    expect(header?.fieldBindings).toEqual([]);
    expect(
      inventory.textboxes.find(({ name }) => name === "Revenue")?.fieldBindings,
    ).toEqual([
      {
        expression: "=Fields!Revenue.Value",
        fieldName: "Revenue",
        bindingKind: "direct",
        format: "C2",
      },
    ]);
  });

  it("resolves the configured title and conservatively falls back to one top title", async () => {
    const inventory = await inspectRdlFile(fixture);
    expect(resolveInventoryTargets(inventory).reportTitle.reportItemName).toBe(
      "ReportTitle",
    );
    expect(resolveReportTitle(inventory, "ReportTitle")).toEqual({
      kind: "reportItem",
      semanticRole: "reportTitle",
      reportItemName: "ReportTitle",
      evidence: [
        "configured exact report-item name: ReportTitle",
        "existing static text: Regional Sales Subtotal Compatibility Test",
      ],
    });
    expect(resolveReportTitle(inventory).reportItemName).toBe("ReportTitle");
  });

  it("rejects ambiguous and missing title targets", async () => {
    const inventory = await inspectRdlFile(fixture);
    const title = inventory.textboxes.find(
      ({ name }) => name === "ReportTitle",
    );
    expect(title).toBeDefined();
    const ambiguous = {
      ...inventory,
      textboxes: [
        ...inventory.textboxes,
        { ...title!, name: "AnotherTopTitle", staticText: ["Another title"] },
      ],
    };
    expectInspectionCode(
      () => resolveReportTitle(ambiguous),
      "TITLE_AMBIGUOUS",
    );
    const missing = {
      ...inventory,
      textboxes: inventory.textboxes.map((textbox) => ({
        ...textbox,
        staticText: [],
      })),
    };
    expectInspectionCode(() => resolveReportTitle(missing), "TITLE_NOT_FOUND");
  });

  it("resolves only the direct and aggregate Revenue displays", async () => {
    const inventory = await inspectRdlFile(fixture);
    expect(resolveFieldDisplays(inventory, "Revenue")).toEqual({
      kind: "fieldDisplay",
      fieldName: "Revenue",
      reportItemNames: ["Revenue", "Textbox10", "Textbox19"],
      expressions: [
        "=Fields!Revenue.Value",
        "=Sum(Fields!Revenue.Value)",
        "=Sum(Fields!Revenue.Value)",
      ],
      evidence: [
        "Revenue: exact direct expression =Fields!Revenue.Value, format C2",
        "Textbox10: exact sum expression =Sum(Fields!Revenue.Value), format C2",
        "Textbox19: exact sum expression =Sum(Fields!Revenue.Value), format C2",
      ],
    });
  });

  it("rejects a missing field and a field with no supported display", async () => {
    const inventory = await inspectRdlFile(fixture);
    expectInspectionCode(
      () => resolveFieldDisplays(inventory, "Missing"),
      "FIELD_NOT_FOUND",
    );
    const undisplayed = {
      ...inventory,
      datasets: inventory.datasets.map((dataset) => ({
        ...dataset,
        fields: [...dataset.fields, "Undisplayed"],
      })),
    };
    expectInspectionCode(
      () => resolveFieldDisplays(undisplayed, "Undisplayed"),
      "FIELD_DISPLAY_NOT_FOUND",
    );
  });

  it("rejects non-RDL files and malformed report roots", async () => {
    await expect(inspectRdlFile(`${fixture}.txt`)).rejects.toMatchObject({
      code: "NOT_RDL",
    });
    await expect(
      inspectRdlBytes(Buffer.from("<NotAReport />"), "bad.rdl"),
    ).rejects.toMatchObject({ code: "INVALID_REPORT" });
  });
});
