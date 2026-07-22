import { validateCollectionConsistency } from "./compatibility";

export interface SubtotalFingerprint {
  tablixBodyRows: number;
  rowHierarchyLeaves: number;
  groupNames: string[];
  rowHeights: string[];
  subtotalPhysicalCells: number;
  subtotalColSpans: number[];
  subtotalHeaderPlacement: "ROW_HIERARCHY_HEADER" | "BODY_CELL" | "NONE";
  subtotalHeaderValue: string | null;
  aggregateExpressions: string[];
  aggregateScopes: (string | null)[];
  keepWithGroupBeforeCount: number;
  repeatOnNewPageCount: number;
  dataElementOutputCount: number;
  selectedDesignerMarkerCount: number;
  designerRows: number | null;
  designerColumns: number | null;
}

const count = (xml: string, token: string): number =>
  xml.split(token).length - 1;

const bodyRows = (xml: string): string[] => {
  const body = xml.match(/<TablixBody>([\s\S]*?)<\/TablixBody>/)?.[1] ?? "";
  return [...body.matchAll(/<TablixRow>([\s\S]*?)<\/TablixRow>/g)].map(
    (match) => match[1]!,
  );
};

export const fingerprintSubtotal = (xml: string): SubtotalFingerprint => {
  const consistency = validateCollectionConsistency(xml, {
    requirePrintSafe: false,
  });
  const rows = bodyRows(xml);
  const subtotal = rows[2] ?? "";
  const aggregates = [
    ...subtotal.matchAll(
      /=Sum\(Fields!([A-Za-z0-9_]+)\.Value(?:,\s*"([^"]+)")?\)/g,
    ),
  ];
  const hierarchyHasTotal =
    /<TablixHeader>[\s\S]*?<Value>Total<\/Value>[\s\S]*?<\/TablixHeader>/.test(
      xml,
    );
  const bodyHasTotal = /<Value>[^<]*Total[^<]*<\/Value>/.test(subtotal);
  const designer = xml.match(
    /<rd:TablixDesignerState>[\s\S]*?<rd:NumberOfRows>(\d+)<\/rd:NumberOfRows>[\s\S]*?<rd:NumberOfColumns>(\d+)<\/rd:NumberOfColumns>/,
  );
  return {
    tablixBodyRows: consistency.tablixes[0]!.rows,
    rowHierarchyLeaves: consistency.tablixes[0]!.rowHierarchyLeaves,
    groupNames: [...xml.matchAll(/<Group Name="([^"]+)"/g)].map(
      (match) => match[1]!,
    ),
    rowHeights: rows.map(
      (row) => row.match(/<Height>([^<]+)<\/Height>/)?.[1] ?? "",
    ),
    subtotalPhysicalCells: count(subtotal, "<TablixCell>"),
    subtotalColSpans: [...subtotal.matchAll(/<ColSpan>(\d+)<\/ColSpan>/g)].map(
      (match) => Number(match[1]),
    ),
    subtotalHeaderPlacement: hierarchyHasTotal
      ? "ROW_HIERARCHY_HEADER"
      : bodyHasTotal
        ? "BODY_CELL"
        : "NONE",
    subtotalHeaderValue: hierarchyHasTotal
      ? "Total"
      : bodyHasTotal
        ? "BODY_TOTAL_LABEL"
        : null,
    aggregateExpressions: aggregates.map((match) => match[0]),
    aggregateScopes: aggregates.map((match) => match[2] ?? null),
    keepWithGroupBeforeCount: count(
      xml,
      "<KeepWithGroup>Before</KeepWithGroup>",
    ),
    repeatOnNewPageCount: count(xml, "<RepeatOnNewPage>"),
    dataElementOutputCount: count(xml, "<DataElementOutput>"),
    selectedDesignerMarkerCount: count(xml, "<rd:Selected>true</rd:Selected>"),
    designerRows: designer ? Number(designer[1]) : null,
    designerColumns: designer ? Number(designer[2]) : null,
  };
};

export const assertReportBuilderSubtotalStructure = (xml: string): void => {
  const value = fingerprintSubtotal(xml);
  if (value.tablixBodyRows !== 3 || value.rowHierarchyLeaves !== 3)
    throw new Error(
      "Report Builder subtotal baseline requires three body rows and three hierarchy leaves",
    );
  if (value.groupNames.join("|") !== "Region|Region1|Details")
    throw new Error("Report Builder subtotal group nesting is absent");
  if (value.subtotalPhysicalCells !== 8 || value.subtotalColSpans.length !== 0)
    throw new Error(
      "Report Builder subtotal row requires eight unmerged physical cells",
    );
  if (value.subtotalHeaderPlacement !== "ROW_HIERARCHY_HEADER")
    throw new Error(
      "Report Builder subtotal header is not placed in the row hierarchy",
    );
  if (value.keepWithGroupBeforeCount !== 1)
    throw new Error("Report Builder subtotal KeepWithGroup shape differs");
  if (
    value.aggregateExpressions.length !== 3 ||
    value.aggregateScopes.some(Boolean)
  )
    throw new Error(
      "Report Builder subtotal aggregate expression shape differs",
    );
  if (value.repeatOnNewPageCount !== 0)
    throw new Error(
      "Report Builder subtotal baseline contains repeating-page behavior",
    );
};

export const compareSubtotalStructures = (
  acceptedGrouped: string,
  rejectedSubtotal: string,
  reportBuilderSubtotal: string,
) => ({
  acceptedCandidate03b: fingerprintSubtotal(acceptedGrouped),
  rejectedCandidate04: fingerprintSubtotal(rejectedSubtotal),
  reportBuilderSubtotalSeed: fingerprintSubtotal(reportBuilderSubtotal),
  highConfidenceDiscriminators: [
    "The rejected Candidate 04 subtotal body row has four physical cells and a five-column span; the Report Builder-authored seed has eight unmerged physical cells.",
    "The rejected Candidate 04 places its subtotal label in the body row; Report Builder places the Total header in a static row-hierarchy member.",
    "The rejected Candidate 04 uses explicitly Region-scoped aggregate expressions; the Report Builder-authored seed uses unscoped aggregates in the nested member context.",
    "Both subtotal structures have three body rows, three row-hierarchy leaves, and Region > Region1 > Details groups, so collection counts alone do not establish compatibility.",
  ],
  conclusion:
    "The structures are observably different, but no individual difference is proven to cause the Report Builder exception.",
});
