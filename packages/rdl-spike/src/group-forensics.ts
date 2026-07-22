import { validateCollectionConsistency } from "./compatibility";

export interface GroupHierarchyFingerprint {
  tablixBodyRows: number;
  rowHierarchyLeaves: number;
  groupNames: string[];
  groupHeaderPlacement: "BODY_ROW" | "ROW_HIERARCHY_HEADER" | "NONE";
  regionHierarchyDepth: number;
  keepWithGroupCount: number;
  repeatOnNewPageCount: number;
  fixedDataCount: number;
  dataElementOutputCount: number;
  visibilityCount: number;
  explicitHiddenCount: number;
  selectedDesignerMarkerCount: number;
  bodyWidthInches: number;
  availablePageWidthInches: number;
}

const count = (xml: string, token: string): number =>
  xml.split(token).length - 1;

export const fingerprintGroupHierarchy = (
  xml: string,
): GroupHierarchyFingerprint => {
  const consistency = validateCollectionConsistency(xml, {
    requirePrintSafe: false,
  });
  const groupNames = [...xml.matchAll(/<Group Name="([^"]+)"/g)].map(
    (match) => match[1]!,
  );
  const hasBodyHeader = xml.includes('<Textbox Name="RegionGroupHeader">');
  const hasHierarchyHeader =
    xml.includes('<Textbox Name="Textbox1">') &&
    xml.includes('<Textbox Name="Region1">');
  return {
    tablixBodyRows: consistency.tablixes[0]!.rows,
    rowHierarchyLeaves: consistency.tablixes[0]!.rowHierarchyLeaves,
    groupNames,
    groupHeaderPlacement: hasBodyHeader
      ? "BODY_ROW"
      : hasHierarchyHeader
        ? "ROW_HIERARCHY_HEADER"
        : "NONE",
    regionHierarchyDepth: groupNames.filter((name) =>
      ["Region", "Region1", "Details"].includes(name),
    ).length,
    keepWithGroupCount: count(xml, "<KeepWithGroup>"),
    repeatOnNewPageCount: count(xml, "<RepeatOnNewPage>"),
    fixedDataCount: count(xml, "<FixedData>"),
    dataElementOutputCount: count(xml, "<DataElementOutput>"),
    visibilityCount: count(xml, "<Visibility>"),
    explicitHiddenCount: count(xml, "<Hidden>"),
    selectedDesignerMarkerCount: count(xml, "<rd:Selected>true</rd:Selected>"),
    bodyWidthInches: consistency.bodyWidthInches,
    availablePageWidthInches: consistency.availablePageWidthInches,
  };
};

export const assertReportBuilderGroupedHierarchy = (xml: string): void => {
  const fingerprint = fingerprintGroupHierarchy(xml);
  if (fingerprint.tablixBodyRows !== 2 || fingerprint.rowHierarchyLeaves !== 2)
    throw new Error(
      "Report Builder grouped baseline requires two body rows and two hierarchy leaves",
    );
  if (fingerprint.groupNames.join("|") !== "Region|Region1|Details")
    throw new Error("Report Builder grouped baseline group nesting is absent");
  if (fingerprint.groupHeaderPlacement !== "ROW_HIERARCHY_HEADER")
    throw new Error("Region group header is not placed in the row hierarchy");
  if (fingerprint.keepWithGroupCount !== 1)
    throw new Error(
      "Report Builder grouped baseline KeepWithGroup count differs",
    );
  if (
    fingerprint.visibilityCount !== 1 ||
    fingerprint.explicitHiddenCount !== 0
  )
    throw new Error("Report Builder grouped baseline Visibility shape differs");
  if (fingerprint.selectedDesignerMarkerCount !== 1)
    throw new Error("Report Builder grouped designer marker is absent");
  for (const token of [
    '<Group Name="Region"><GroupExpressions><GroupExpression>=Fields!Region.Value</GroupExpression></GroupExpressions></Group>',
    '<Group Name="Region1">',
    '<Group Name="Details" />',
    "<SortExpression><Value>=Fields!SaleDate.Value</Value></SortExpression>",
    "<SortExpression><Value>=Fields!Salesperson.Value</Value></SortExpression>",
  ])
    if (!xml.replaceAll(/\s+/g, "").includes(token.replaceAll(/\s+/g, "")))
      throw new Error(`Report Builder grouped structure is missing ${token}`);
};

export const compareGroupHierarchies = (
  candidate02: string,
  candidate03: string,
  groupedSeed: string,
) => ({
  candidate02: fingerprintGroupHierarchy(candidate02),
  rejectedCandidate03: fingerprintGroupHierarchy(candidate03),
  reportBuilderGroupedSeed: fingerprintGroupHierarchy(groupedSeed),
  highConfidenceDiscriminators: [
    "Candidate 03 adds a third TablixBody row; the accepted grouped seed retains Candidate 02's two body rows.",
    "Candidate 03 places the Region group header in a merged body cell; Report Builder places it in nested row-hierarchy headers.",
    "The accepted seed nests Region > Region1 > Details; Candidate 03 nests Region > Details.",
    "The accepted seed has two body rows and two row-hierarchy leaves; Candidate 03 has three of each. Both are count-consistent, so count equality alone does not establish compatibility.",
    "The accepted seed has one KeepWithGroup marker, no explicit Hidden value, and one rd:Selected marker; Candidate 03 has two KeepWithGroup markers, Hidden=false, and no rd:Selected marker.",
  ],
  conclusion:
    "The structures are observably different, but no single difference is proven to cause the Report Builder exception.",
});
