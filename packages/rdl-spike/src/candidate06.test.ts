import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  deriveCandidate06,
  printSafePaginationSeedSha256,
} from "./candidate06";
import { validateCollectionConsistency } from "./compatibility";
import { assertReportBuilderGrandTotalStructure } from "./grand-total-forensics";
import { sha256 } from "./ladder";
import {
  assertReportBuilderPaginationStructure,
  fingerprintPagination,
} from "./pagination-forensics";

let seed = "";
beforeAll(async () => {
  seed = await readFile(
    resolve(
      "samples/report-builder-seeds/KnownGoodProductionPaginationPrintSafe.rdl",
    ),
    "utf8",
  );
});
describe("Candidate 06", () => {
  it("is a byte-identical copy of the corrected Report Builder seed", () => {
    const candidate = deriveCandidate06(seed);
    expect(candidate).toBe(seed);
    expect(sha256(candidate)).toBe(printSafePaginationSeedSha256);
  });
  it("preserves data, subtotal, grand-total, and pagination structures", () => {
    const candidate = deriveCandidate06(seed);
    expect(() =>
      assertReportBuilderGrandTotalStructure(candidate, {
        allowPageBreaks: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertReportBuilderPaginationStructure(candidate),
    ).not.toThrow();
    expect(validateCollectionConsistency(candidate)).toMatchObject({
      embeddedRows: 6,
      bodyWidthInches: 7,
      availablePageWidthInches: 7.5,
    });
  });
  it("uses effective Letter portrait dimensions and half-inch margins", () => {
    expect(fingerprintPagination(deriveCandidate06(seed))).toMatchObject({
      pageWidthInches: 8.5,
      pageHeightInches: 11,
      leftMarginInches: 0.5,
      rightMarginInches: 0.5,
      printableWidthInches: 7.5,
      printSafe: true,
      repeatOnNewPageCount: 1,
      regionPageBreakLocation: "Between",
      pageNumberExpressionCount: 2,
    });
  });
  it("rejects any seed mutation", () => {
    expect(() =>
      deriveCandidate06(seed.replace("Textbox21", "Changed21")),
    ).toThrow("SHA-256 differs");
  });
});
