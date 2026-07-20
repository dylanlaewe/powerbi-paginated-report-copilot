import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  candidate02Sha256,
  deriveCandidate03,
  validateCandidate03Group,
} from "./candidate03";
import { validateCollectionConsistency } from "./compatibility";
import { sha256 } from "./ladder";

let candidate02 = "";
let candidate03 = "";
beforeAll(async () => {
  candidate02 = await readFile(
    resolve("artifacts/rdl-compatibility-ladder/02-detail-columns.rdl"),
    "utf8",
  );
  candidate03 = deriveCandidate03(candidate02);
});

describe("RDL compatibility candidate 03", () => {
  it("derives from the accepted Candidate 02 checksum", () => {
    expect(sha256(candidate02)).toBe(candidate02Sha256);
  });

  it("preserves all nine fields and six rows", () => {
    const result = validateCollectionConsistency(candidate03);
    expect(result.fields).toEqual([
      "SaleDate",
      "Region",
      "Salesperson",
      "Customer",
      "Product",
      "Category",
      "Quantity",
      "Revenue",
      "GrossProfit",
    ]);
    expect(result.embeddedRows).toBe(6);
  });

  it("adds a consistent Region group-header row", () => {
    const evidence = validateCandidate03Group(candidate03);
    expect(evidence).toMatchObject({
      groupName: "Region",
      groupExpression: "=Fields!Region.Value",
      detailsReachableBeneathGroup: "PASS",
      aggregateExpressions: "NONE",
      pageBreakDefinitions: "NONE",
    });
    expect(evidence.consistency.tablixes[0]).toMatchObject({
      columns: 8,
      rows: 3,
      columnHierarchyLeaves: 8,
      rowHierarchyLeaves: 3,
      rowCellWidths: [8, 8, 8],
    });
  });

  it("sorts Region, then details by SaleDate and Salesperson", () => {
    expect(validateCandidate03Group(candidate03)).toMatchObject({
      regionSort: ["=Fields!Region.Value"],
      detailSort: ["=Fields!SaleDate.Value", "=Fields!Salesperson.Value"],
    });
  });

  it("keeps existing detail formats without later-stage features", () => {
    expect(candidate03).toContain("<Format>yyyy-MM-dd</Format>");
    expect(candidate03).toContain("<Format>N0</Format>");
    expect(candidate03.match(/<Format>C2<\/Format>/g)).toHaveLength(2);
    expect(candidate03).not.toContain("Sum(");
    expect(candidate03).not.toContain("<PageBreak>");
    expect(candidate03).not.toContain("<RepeatOnNewPage>");
  });

  it("preserves data, page, parameter, and footer structures", () => {
    for (const token of [
      "<CommandText>",
      '<DataSource Name="SeedData">',
      "<ReportParametersLayout>",
      '<Textbox Name="ExecutionTime">',
      "<Width>6in</Width>",
    ])
      expect(candidate03.split(token).length).toBe(
        candidate02.split(token).length,
      );
  });

  it("fails closed for a changed Candidate 02 baseline", () => {
    expect(() =>
      deriveCandidate03(candidate02.replace("SeedData", "Other")),
    ).toThrow("Accepted Candidate 02 SHA-256 differs");
  });
});
