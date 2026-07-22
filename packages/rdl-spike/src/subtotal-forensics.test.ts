import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  assertReportBuilderSubtotalStructure,
  compareSubtotalStructures,
} from "./subtotal-forensics";

let grouped = "";
let rejected = "";
let seed = "";
beforeAll(async () => {
  [grouped, rejected, seed] = await Promise.all([
    readFile(
      resolve(
        "artifacts/rdl-compatibility-ladder/03b-region-group-from-seed.rdl",
      ),
      "utf8",
    ),
    readFile(
      resolve("artifacts/rdl-compatibility-ladder/04-region-subtotal.rdl"),
      "utf8",
    ),
    readFile(
      resolve("samples/report-builder-seeds/KnownGoodRegionSubtotal.rdl"),
      "utf8",
    ),
  ]);
});

describe("Report Builder subtotal regression", () => {
  it("accepts the Report Builder-authored subtotal seed", () => {
    expect(() => assertReportBuilderSubtotalStructure(seed)).not.toThrow();
  });
  it("distinguishes the rejected Candidate 04", () => {
    expect(() => assertReportBuilderSubtotalStructure(rejected)).toThrow(
      "requires eight unmerged physical cells",
    );
  });
  it("distinguishes the accepted grouped baseline without a subtotal", () => {
    expect(() => assertReportBuilderSubtotalStructure(grouped)).toThrow(
      "requires three body rows and three hierarchy leaves",
    );
  });
  it("records body-cell, hierarchy-header, and scope differences", () => {
    const comparison = compareSubtotalStructures(grouped, rejected, seed);
    expect(comparison.rejectedCandidate04).toMatchObject({
      subtotalPhysicalCells: 4,
      subtotalColSpans: [5],
      subtotalHeaderPlacement: "BODY_CELL",
      aggregateScopes: ["Region", "Region", "Region"],
    });
    expect(comparison.reportBuilderSubtotalSeed).toMatchObject({
      subtotalPhysicalCells: 8,
      subtotalColSpans: [],
      subtotalHeaderPlacement: "ROW_HIERARCHY_HEADER",
      aggregateScopes: [null, null, null],
    });
  });
});
