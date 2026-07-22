import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { validateCollectionConsistency } from "./compatibility";
import {
  candidateRows,
  canonicalSeedSha256,
  deriveCandidate01,
  sha256,
} from "./ladder";

let seed = "";
let candidate = "";
beforeAll(async () => {
  seed = await readFile(
    resolve("samples/report-builder-seeds/KnownGoodEnterDataTable.rdl"),
    "utf8",
  );
  candidate = deriveCandidate01(seed);
});

describe("RDL compatibility candidate 01", () => {
  it("pins and does not modify the canonical seed", () => {
    expect(sha256(seed)).toBe(canonicalSeedSha256);
  });

  it("contains only Region and Revenue with three synthetic rows", () => {
    const result = validateCollectionConsistency(candidate);
    expect(result.fields).toEqual(["Region", "Revenue"]);
    expect(result.elementPathFields).toEqual(["Region", "Revenue"]);
    expect(result.embeddedRows).toBe(3);
    expect(candidateRows).toEqual([
      { Region: "East", Revenue: "100" },
      { Region: "West", Revenue: "200" },
      { Region: "Central", Revenue: "300" },
    ]);
  });

  it("sets only the requested visible title", () => {
    expect(candidate).toContain("<Value>RDL Compatibility Test</Value>");
    expect(candidate.match(/<Tablix Name=/g)).toHaveLength(1);
  });

  it("introduces no group, subtotal, page-break, expression, or style structure", () => {
    for (const token of [
      "<Group ",
      "<PageBreak>",
      "<RepeatOnNewPage>",
      "<Style>",
      "<SortExpressions>",
    ])
      expect(candidate.split(token).length).toBe(seed.split(token).length);
    expect(candidate).not.toContain("Sum(");
  });

  it("preserves Report Builder metadata and hierarchy markers", () => {
    for (const token of [
      'MustUnderstand="df"',
      "<am:AuthoringMetadata>",
      "<df:DefaultFontFamily>Segoe UI</df:DefaultFontFamily>",
      "<rd:DesignerState>",
      "<TablixColumnHierarchy>",
      "<TablixRowHierarchy>",
      "<ReportParametersLayout>",
    ])
      expect(candidate).toContain(token);
  });

  it("fails closed when the seed digest changes", () => {
    expect(() => deriveCandidate01(seed.replace("East", "North"))).toThrow(
      "Canonical seed SHA-256 differs",
    );
  });
});
