import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  candidate03bSha256,
  deriveCandidate04,
  validateCandidate04Subtotal,
} from "./candidate04";
import { validateCollectionConsistency } from "./compatibility";
import { sha256 } from "./ladder";

let candidate03b = "";
let candidate04 = "";
beforeAll(async () => {
  candidate03b = await readFile(
    resolve(
      "artifacts/rdl-compatibility-ladder/03b-region-group-from-seed.rdl",
    ),
    "utf8",
  );
  candidate04 = deriveCandidate04(candidate03b);
});

describe("RDL compatibility candidate 04", () => {
  it("derives from the accepted Candidate 03b checksum", () => {
    expect(sha256(candidate03b)).toBe(candidate03bSha256);
  });

  it("preserves the baseline BOM and opening bytes", () => {
    expect(
      candidate03b.startsWith('﻿<?xml version="1.0" encoding="utf-8"?>'),
    ).toBe(true);
  });

  it("preserves nine fields, six rows, and embedded data", () => {
    const base = validateCollectionConsistency(candidate03b, {
      requirePrintSafe: false,
    });
    const candidate = validateCollectionConsistency(candidate04, {
      requirePrintSafe: false,
    });
    expect(candidate.fields).toEqual(base.fields);
    expect(candidate.embeddedRows).toBe(6);
    expect(
      candidate04.slice(
        candidate04.indexOf("<DataSets>"),
        candidate04.indexOf("</DataSets>") + "</DataSets>".length,
      ),
    ).toBe(
      candidate03b.slice(
        candidate03b.indexOf("<DataSets>"),
        candidate03b.indexOf("</DataSets>") + "</DataSets>".length,
      ),
    );
  });

  it("defines one Region subtotal structural row with three scoped sums", () => {
    expect(validateCandidate04Subtotal(candidate04)).toMatchObject({
      runtimeRegionInstances: 3,
      subtotalRowsPerRegion: 1,
      expectedRenderedSubtotalRows: 3,
      aggregateScope: "Region",
      reportLevelTotal: "NONE",
      pageBreakDefinitions: "NONE",
    });
  });

  it("keeps body rows and hierarchy leaves compatible", () => {
    expect(
      validateCandidate04Subtotal(candidate04).consistency.tablixes[0],
    ).toMatchObject({
      columns: 8,
      rows: 3,
      columnHierarchyLeaves: 8,
      rowHierarchyLeaves: 3,
      rowCellWidths: [8, 8, 8],
    });
  });

  it("formats Quantity as whole number and financial totals as currency", () => {
    expect(candidate04).toContain('<Textbox Name="RegionQuantitySubtotal">');
    expect(candidate04).toContain("<Format>N0</Format>");
    expect(candidate04).toContain('<Textbox Name="RegionRevenueSubtotal">');
    expect(candidate04).toContain('<Textbox Name="RegionGrossProfitSubtotal">');
    expect(candidate04.match(/<Format>C2<\/Format>/g)).toHaveLength(4);
  });

  it("adds no grand total, page break, parameter, or later-stage feature", () => {
    expect(candidate04.match(/Sum\(/g)).toHaveLength(3);
    expect(candidate04).not.toContain("<PageBreak>");
    expect(candidate04.split("<ReportParametersLayout>").length).toBe(
      candidate03b.split("<ReportParametersLayout>").length,
    );
    expect(candidate04).not.toContain("Grand Total");
  });

  it("fails closed when Candidate 03b changes", () => {
    expect(() =>
      deriveCandidate04(candidate03b.replace("Region1", "Other")),
    ).toThrow("Accepted Candidate 03b SHA-256 differs");
  });
});
