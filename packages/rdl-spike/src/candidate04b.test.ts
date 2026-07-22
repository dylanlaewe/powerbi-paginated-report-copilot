import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { deriveCandidate04b, subtotalSeedSha256 } from "./candidate04b";
import { validateCollectionConsistency } from "./compatibility";
import { sha256 } from "./ladder";
import { assertReportBuilderSubtotalStructure } from "./subtotal-forensics";

let seed = "";
beforeAll(async () => {
  seed = await readFile(
    resolve("samples/report-builder-seeds/KnownGoodRegionSubtotal.rdl"),
    "utf8",
  );
});
describe("Candidate 04b", () => {
  it("is a byte-identical copy of the pinned seed", () => {
    const candidate = deriveCandidate04b(seed);
    expect(candidate).toBe(seed);
    expect(sha256(candidate)).toBe(subtotalSeedSha256);
  });
  it("preserves six rows, nine fields, and the Report Builder subtotal", () => {
    const candidate = deriveCandidate04b(seed);
    const result = validateCollectionConsistency(candidate, {
      requirePrintSafe: false,
    });
    expect(result.embeddedRows).toBe(6);
    expect(result.fields).toHaveLength(9);
    expect(() => assertReportBuilderSubtotalStructure(candidate)).not.toThrow();
  });
  it("adds no later-stage features", () => {
    const candidate = deriveCandidate04b(seed);
    expect(candidate).not.toContain("<PageBreak>");
    expect(candidate).not.toContain("<ReportParameters>");
    expect(candidate).not.toContain("Grand Total");
  });
  it("rejects any seed mutation", () => {
    expect(() =>
      deriveCandidate04b(seed.replace("Textbox11", "Changed11")),
    ).toThrow("SHA-256 differs");
  });
});
