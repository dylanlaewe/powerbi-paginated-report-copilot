import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  candidate04cTitle,
  calculateSubtotals,
  deriveCandidate04c,
  protectedTablix,
  replacementRows,
} from "./candidate04c";
import { subtotalSeedSha256 } from "./candidate04b";
import { validateCollectionConsistency } from "./compatibility";
import { sha256 } from "./ladder";

let seed = "";
beforeAll(async () => {
  seed = await readFile(
    resolve("samples/report-builder-seeds/KnownGoodRegionSubtotal.rdl"),
    "utf8",
  );
});
describe("Candidate 04c template instantiation", () => {
  it("changes content without reconstructing the protected Tablix", () => {
    const candidate = deriveCandidate04c(seed);
    expect(sha256(seed)).toBe(subtotalSeedSha256);
    expect(candidate).not.toBe(seed);
    expect(protectedTablix(candidate)).toBe(protectedTablix(seed));
    expect(candidate).toContain(`<Value>${candidate04cTitle}</Value>`);
  });
  it("replaces all six rows while preserving fields and references", () => {
    const candidate = deriveCandidate04c(seed);
    const consistency = validateCollectionConsistency(candidate, {
      requirePrintSafe: false,
    });
    expect(consistency.embeddedRows).toBe(6);
    expect(consistency.fields).toHaveLength(9);
    for (const row of replacementRows)
      expect(candidate).toContain(row.Customer);
    expect(candidate).not.toContain("Northwind Health");
  });
  it("independently proves the expected Region totals", () => {
    expect(calculateSubtotals(replacementRows)).toEqual({
      Central: { Quantity: 17, Revenue: 4050, GrossProfit: 1610 },
      East: { Quantity: 14, Revenue: 5950, GrossProfit: 2270 },
      West: { Quantity: 30, Revenue: 5990, GrossProfit: 2370 },
    });
  });
  it("preserves aggregate XML and adds no later capability", () => {
    const candidate = deriveCandidate04c(seed);
    for (const expression of [
      "=Sum(Fields!Quantity.Value)",
      "=Sum(Fields!Revenue.Value)",
      "=Sum(Fields!GrossProfit.Value)",
    ])
      expect(candidate.split(expression)).toHaveLength(2);
    expect(candidate).not.toContain("<PageBreak>");
    expect(candidate).not.toContain("<ReportParameters>");
    expect(candidate).not.toContain("Grand Total");
  });
  it("rejects any template mutation", () => {
    expect(() =>
      deriveCandidate04c(seed.replace("Textbox11", "Changed11")),
    ).toThrow("SHA-256 differs");
  });
});
