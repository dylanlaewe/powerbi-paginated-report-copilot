import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  assertReportBuilderPaginationStructure,
  comparePaginationStructures,
  fingerprintPagination,
} from "./pagination-forensics";

let candidate05 = "";
let seed = "";
let correctedSeed = "";
let letterSeed = "";
beforeAll(async () => {
  [candidate05, seed, correctedSeed, letterSeed] = await Promise.all([
    readFile(
      resolve("artifacts/rdl-compatibility-ladder/05-grand-total.rdl"),
      "utf8",
    ),
    readFile(
      resolve("samples/report-builder-seeds/KnownGoodProductionPagination.rdl"),
      "utf8",
    ),
    readFile(
      resolve(
        "samples/report-builder-seeds/KnownGoodProductionPaginationPrintSafe.rdl",
      ),
      "utf8",
    ),
    readFile(
      resolve(
        "samples/report-builder-seeds/KnownGoodProductionPaginationLetter.rdl",
      ),
      "utf8",
    ),
  ]);
});
describe("Report Builder production-pagination forensics", () => {
  it("accepts the authored pagination structure", () => {
    expect(() => assertReportBuilderPaginationStructure(seed)).not.toThrow();
  });
  it("distinguishes Candidate 05 without pagination metadata", () => {
    expect(() => assertReportBuilderPaginationStructure(candidate05)).toThrow(
      "repeating-header marker is absent",
    );
  });
  it("records the unsafe explicit page width", () => {
    expect(fingerprintPagination(seed)).toMatchObject({
      bodyWidthInches: 7,
      pageWidthInches: 2,
      leftMarginInches: 0.5,
      rightMarginInches: 0.5,
      printableWidthInches: 1,
      printSafe: false,
      repeatOnNewPageCount: 1,
      fixedDataCount: 0,
      regionPageBreakLocation: "Between",
      pageNumberExpressionCount: 2,
      footerTextboxCount: 2,
    });
  });
  it("records the blocking conclusion", () => {
    expect(
      comparePaginationStructures(candidate05, seed, correctedSeed, letterSeed)
        .conclusion,
    ).toContain("omit PageWidth and PageHeight");
  });
  it("records that the new Letter seed still omits physical dimensions", () => {
    expect(fingerprintPagination(letterSeed)).toMatchObject({
      pageWidthSource: "RDL_DEFAULT",
      pageHeightSource: "RDL_DEFAULT",
    });
  });
  it("accepts the corrected structure and effective Letter defaults", () => {
    expect(() =>
      assertReportBuilderPaginationStructure(correctedSeed),
    ).not.toThrow();
    expect(fingerprintPagination(correctedSeed)).toMatchObject({
      bodyWidthInches: 7,
      pageWidthInches: 8.5,
      pageHeightInches: 11,
      pageWidthSource: "RDL_DEFAULT",
      pageHeightSource: "RDL_DEFAULT",
      printableWidthInches: 7.5,
      printSafe: true,
      repeatOnNewPageCount: 1,
      regionPageBreakLocation: "Between",
      pageNumberExpressionCount: 2,
    });
  });
});
