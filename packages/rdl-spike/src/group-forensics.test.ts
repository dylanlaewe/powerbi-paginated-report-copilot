import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  assertReportBuilderGroupedHierarchy,
  compareGroupHierarchies,
  fingerprintGroupHierarchy,
} from "./group-forensics";

let candidate02 = "";
let candidate03 = "";
let groupedSeed = "";
beforeAll(async () => {
  [candidate02, candidate03, groupedSeed] = await Promise.all([
    readFile(
      resolve("artifacts/rdl-compatibility-ladder/02-detail-columns.rdl"),
      "utf8",
    ),
    readFile(
      resolve("artifacts/rdl-compatibility-ladder/03-region-group.rdl"),
      "utf8",
    ),
    readFile(
      resolve("samples/report-builder-seeds/KnownGoodRegionGroup.rdl"),
      "utf8",
    ),
  ]);
});

describe("Report Builder grouped hierarchy regression", () => {
  it("accepts the exact Report Builder-authored grouped seed", () => {
    expect(() =>
      assertReportBuilderGroupedHierarchy(groupedSeed),
    ).not.toThrow();
  });

  it("distinguishes and rejects the failed Candidate 03 hierarchy", () => {
    expect(() => assertReportBuilderGroupedHierarchy(candidate03)).toThrow(
      "requires two body rows and two hierarchy leaves",
    );
  });

  it("distinguishes the ungrouped Candidate 02 baseline", () => {
    expect(() => assertReportBuilderGroupedHierarchy(candidate02)).toThrow(
      "group nesting is absent",
    );
  });

  it("records the body-row and header-placement differences", () => {
    const comparison = compareGroupHierarchies(
      candidate02,
      candidate03,
      groupedSeed,
    );
    expect(comparison.rejectedCandidate03).toMatchObject({
      tablixBodyRows: 3,
      rowHierarchyLeaves: 3,
      groupNames: ["Region", "Details"],
      groupHeaderPlacement: "BODY_ROW",
    });
    expect(comparison.reportBuilderGroupedSeed).toMatchObject({
      tablixBodyRows: 2,
      rowHierarchyLeaves: 2,
      groupNames: ["Region", "Region1", "Details"],
      groupHeaderPlacement: "ROW_HIERARCHY_HEADER",
    });
  });

  it("records optional-member and designer-marker differences", () => {
    expect(fingerprintGroupHierarchy(candidate03)).toMatchObject({
      keepWithGroupCount: 2,
      explicitHiddenCount: 1,
      selectedDesignerMarkerCount: 0,
    });
    expect(fingerprintGroupHierarchy(groupedSeed)).toMatchObject({
      keepWithGroupCount: 1,
      explicitHiddenCount: 0,
      selectedDesignerMarkerCount: 1,
    });
  });
});
