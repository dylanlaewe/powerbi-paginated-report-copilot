import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  assertReportBuilderGrandTotalStructure,
  compareGrandTotalStructures,
} from "./grand-total-forensics";

let candidate04c = "";
let seed = "";
beforeAll(async () => {
  [candidate04c, seed] = await Promise.all([
    readFile(
      resolve(
        "artifacts/rdl-compatibility-ladder/04c-template-instantiated-subtotal.rdl",
      ),
      "utf8",
    ),
    readFile(
      resolve("samples/report-builder-seeds/KnownGoodGrandTotal.rdl"),
      "utf8",
    ),
  ]);
});
describe("Report Builder grand-total regression", () => {
  it("accepts the Report Builder-authored seed", () => {
    expect(() => assertReportBuilderGrandTotalStructure(seed)).not.toThrow();
  });
  it("distinguishes Candidate 04c without a grand total", () => {
    expect(() => assertReportBuilderGrandTotalStructure(candidate04c)).toThrow(
      "requires four body rows and four hierarchy leaves",
    );
  });
  it("records the exact row, hierarchy, and aggregate delta", () => {
    const comparison = compareGrandTotalStructures(candidate04c, seed);
    expect(comparison.acceptedCandidate04c).toMatchObject({
      tablixBodyRows: 3,
      rowHierarchyLeaves: 3,
    });
    expect(comparison.reportBuilderGrandTotalSeed).toMatchObject({
      tablixBodyRows: 4,
      rowHierarchyLeaves: 4,
      finalRowPhysicalCells: 8,
      finalRowColSpans: [],
      finalRowAggregateScopes: [null, null, null],
      keepWithGroupBeforeCount: 2,
      tablixHeight: "1.05in",
    });
  });
});
