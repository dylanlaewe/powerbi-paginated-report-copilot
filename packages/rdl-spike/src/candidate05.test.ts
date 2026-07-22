import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  deriveCandidate05,
  expectedGrandTotal,
  grandTotalSeedSha256,
} from "./candidate05";
import { replacementRows } from "./candidate04c";
import { validateCollectionConsistency } from "./compatibility";
import { assertReportBuilderGrandTotalStructure } from "./grand-total-forensics";
import { sha256 } from "./ladder";

let seed = "";
beforeAll(async () => {
  seed = await readFile(
    resolve("samples/report-builder-seeds/KnownGoodGrandTotal.rdl"),
    "utf8",
  );
});
describe("Candidate 05", () => {
  it("uses the pinned Report Builder structure and changes only its report-level label", () => {
    const candidate = deriveCandidate05(seed);
    expect(sha256(seed)).toBe(grandTotalSeedSha256);
    expect(candidate).not.toBe(seed);
    expect(candidate).toContain("<Value>Grand Total</Value>");
    expect(
      candidate.replace("<Value>Grand Total</Value>", "<Value>Total</Value>"),
    ).toBe(seed);
    expect(() =>
      assertReportBuilderGrandTotalStructure(candidate),
    ).not.toThrow();
  });
  it("preserves six details, three Region subtotals, and four hierarchy rows", () => {
    const candidate = deriveCandidate05(seed);
    const result = validateCollectionConsistency(candidate, {
      requirePrintSafe: false,
    });
    expect(result.embeddedRows).toBe(6);
    expect(result.tablixes[0]).toMatchObject({
      rows: 4,
      rowHierarchyLeaves: 4,
      rowCellWidths: [8, 8, 8, 8],
    });
    expect(candidate.match(/=Sum\(Fields!Quantity.Value\)/g)).toHaveLength(2);
  });
  it("independently calculates the required report total", () => {
    const total = replacementRows.reduce(
      (sum, row) => ({
        Quantity: sum.Quantity + row.Quantity,
        Revenue: sum.Revenue + row.Revenue,
        GrossProfit: sum.GrossProfit + row.GrossProfit,
      }),
      { Quantity: 0, Revenue: 0, GrossProfit: 0 },
    );
    expect(total).toEqual(expectedGrandTotal);
  });
  it("adds no page break, parameter, or Candidate 06 feature", () => {
    const candidate = deriveCandidate05(seed);
    expect(candidate).not.toContain("<PageBreak>");
    expect(candidate).not.toContain("<ReportParameters>");
  });
  it("rejects any seed mutation", () => {
    expect(() =>
      deriveCandidate05(seed.replace("Textbox20", "Changed20")),
    ).toThrow("SHA-256 differs");
  });
});
