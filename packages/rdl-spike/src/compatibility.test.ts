import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { validateCollectionConsistency } from "./compatibility";

let seed = "";
let rejected = "";
beforeAll(async () => {
  [seed, rejected] = await Promise.all([
    readFile(
      resolve("samples/report-builder-seeds/KnownGoodEnterDataTable.rdl"),
      "utf8",
    ),
    readFile(
      resolve("artifacts/first-real-rdl-spike/Regional Sales Detail.rdl"),
      "utf8",
    ),
  ]);
});

describe("RDL collection consistency", () => {
  it("records the canonical seed relationships", () => {
    const result = validateCollectionConsistency(seed);
    expect(result.fields).toEqual(["Region", "Revenue"]);
    expect(result.embeddedRows).toBe(2);
    expect(result.tablixes[0]).toMatchObject({
      columns: 1,
      rows: 4,
      columnHierarchyLeaves: 1,
      rowHierarchyLeaves: 4,
      rowCellWidths: [1, 1, 1, 1],
    });
  });

  it("shows the rejected artifact has internally consistent collection counts", () => {
    const result = validateCollectionConsistency(rejected);
    expect(result.fields).toHaveLength(11);
    expect(result.embeddedRows).toBe(24);
    expect(result.tablixes[0]).toMatchObject({
      columns: 8,
      rows: 5,
      columnHierarchyLeaves: 8,
      rowHierarchyLeaves: 5,
      rowCellWidths: [8, 8, 8, 8, 8],
    });
  });

  it("rejects a missing tablix cell", () => {
    expect(() =>
      validateCollectionConsistency(
        seed.replace(/<TablixCell>[\s\S]*?<\/TablixCell>/, ""),
      ),
    ).toThrow(/spans 0 columns/);
  });

  it("rejects hierarchy and body count disagreement", () => {
    expect(() =>
      validateCollectionConsistency(
        seed.replace(
          "<TablixColumnHierarchy>\n              <TablixMembers>\n                <TablixMember />",
          "<TablixColumnHierarchy>\n              <TablixMembers>\n                <TablixMember />\n                <TablixMember />",
        ),
      ),
    ).toThrow();
  });

  it("rejects duplicate field sources", () => {
    expect(() =>
      validateCollectionConsistency(
        seed.replace(
          "<DataField>Revenue</DataField>",
          "<DataField>Region</DataField>",
        ),
      ),
    ).toThrow("Duplicate DataField source");
  });

  it("rejects dataset and embedded-row field-order disagreement", () => {
    expect(() =>
      validateCollectionConsistency(
        seed.replace(
          "&lt;Region&gt;East&lt;/Region&gt;\n        &lt;Revenue&gt;100&lt;/Revenue&gt;",
          "&lt;Revenue&gt;100&lt;/Revenue&gt;\n        &lt;Region&gt;East&lt;/Region&gt;",
        ),
      ),
    ).toThrow("Embedded row 0 field order");
  });

  it("rejects incomplete designer-grid coordinates", () => {
    expect(() =>
      validateCollectionConsistency(
        seed.replace('<Data ColumnIndex="1" RowIndex="1">200</Data>', ""),
      ),
    ).toThrow("DesignerState data cell count is incomplete");
  });

  it("rejects unsupported ElementPath declarations", () => {
    expect(() =>
      validateCollectionConsistency(
        seed.replace("Revenue(String)", "Revenue(DateTime)"),
      ),
    ).toThrow("Unsupported ElementPath declaration");
  });

  it("rejects references to fields outside the dataset", () => {
    expect(() =>
      validateCollectionConsistency(
        seed.replace("Fields!Revenue.Value", "Fields!Missing.Value"),
      ),
    ).toThrow("Invalid field reference Missing");
  });

  it("rejects group expressions that reference missing fields", () => {
    expect(() =>
      validateCollectionConsistency(
        seed.replace(
          "<GroupExpression>=Fields!Region.Value</GroupExpression>",
          "<GroupExpression>=Fields!Missing.Value</GroupExpression>",
        ),
      ),
    ).toThrow("Invalid field reference Missing");
  });

  it("rejects empty group names", () => {
    expect(() =>
      validateCollectionConsistency(
        seed.replace('<Group Name="Details" />', "<Group />"),
      ),
    ).toThrow("Group Name is empty");
  });

  it("rejects incompatible ElementPath and CLR field types", () => {
    expect(() =>
      validateCollectionConsistency(
        seed.replace("Revenue(String)", "Revenue(Decimal)"),
      ),
    ).toThrow("TypeName System.String is incompatible with Decimal");
  });

  it("rejects invalid embedded numeric values", () => {
    expect(() =>
      validateCollectionConsistency(
        seed
          .replace("Revenue(String)", "Revenue(Decimal)")
          .replace(
            "<rd:TypeName>System.String</rd:TypeName>\n          <DataField>Revenue</DataField>",
            "<rd:TypeName>System.Decimal</rd:TypeName>\n          <DataField>Revenue</DataField>",
          )
          .replace(
            "&lt;Revenue&gt;100&lt;/Revenue&gt;",
            "&lt;Revenue&gt;not-a-number&lt;/Revenue&gt;",
          ),
      ),
    ).toThrow("invalid Decimal value not-a-number");
  });

  it("rejects a body wider than the printable page", () => {
    expect(() =>
      validateCollectionConsistency(
        seed.replace("<Width>6in</Width>", "<Width>7in</Width>"),
      ),
    ).toThrow("Body width exceeds printable page width");
  });
});
