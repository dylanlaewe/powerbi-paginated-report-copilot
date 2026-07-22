import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { deriveCandidate03b, groupedSeedSha256 } from "./candidate03b";
import { validateCollectionConsistency } from "./compatibility";
import { assertReportBuilderGroupedHierarchy } from "./group-forensics";
import { sha256 } from "./ladder";

let groupedSeed = "";
let candidate = "";
beforeAll(async () => {
  groupedSeed = await readFile(
    resolve("samples/report-builder-seeds/KnownGoodRegionGroup.rdl"),
    "utf8",
  );
  candidate = deriveCandidate03b(groupedSeed);
});

describe("RDL compatibility candidate 03b", () => {
  it("is byte-for-byte identical to the canonical grouped seed", () => {
    expect(candidate).toBe(groupedSeed);
    expect(sha256(candidate)).toBe(groupedSeedSha256);
  });

  it("preserves all nine fields and six embedded rows", () => {
    const result = validateCollectionConsistency(candidate, {
      requirePrintSafe: false,
    });
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

  it("matches the accepted Report Builder group regression", () => {
    expect(() => assertReportBuilderGroupedHierarchy(candidate)).not.toThrow();
  });

  it("contains no later-stage totals, page breaks, or repeat changes", () => {
    expect(candidate).not.toContain("Sum(");
    expect(candidate).not.toContain("<PageBreak>");
    expect(candidate).not.toContain("<RepeatOnNewPage>");
  });

  it("fails closed if the grouped seed changes", () => {
    expect(() =>
      deriveCandidate03b(groupedSeed.replace("Region1", "Region2")),
    ).toThrow("Canonical grouped seed SHA-256 differs");
  });
});
