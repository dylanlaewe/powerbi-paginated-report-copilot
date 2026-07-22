import { validateCollectionConsistency } from "./compatibility";

export interface GrandTotalFingerprint {
  tablixBodyRows: number;
  rowHierarchyLeaves: number;
  groupNames: string[];
  rowHeights: string[];
  finalRowPhysicalCells: number;
  finalRowColSpans: number[];
  finalRowAggregateExpressions: string[];
  finalRowAggregateScopes: (string | null)[];
  totalHeaderValues: string[];
  keepWithGroupBeforeCount: number;
  tablixHeight: string | null;
  pageBreakCount: number;
  parameterCount: number;
}

const count = (value: string, token: string): number =>
  value.split(token).length - 1;
const tablix = (xml: string): string => {
  const match = xml.match(/<Tablix Name="Tablix1">([\s\S]*?)<\/Tablix>/);
  if (!match) throw new Error("Tablix1 is absent");
  return match[0];
};
const rows = (xml: string): string[] => {
  const body =
    tablix(xml).match(/<TablixBody>([\s\S]*?)<\/TablixBody>/)?.[1] ?? "";
  return [...body.matchAll(/<TablixRow>([\s\S]*?)<\/TablixRow>/g)].map(
    (match) => match[1]!,
  );
};

export const fingerprintGrandTotal = (xml: string): GrandTotalFingerprint => {
  const consistency = validateCollectionConsistency(xml, {
    requirePrintSafe: false,
  });
  const bodyRows = rows(xml);
  const finalRow = bodyRows.at(-1) ?? "";
  const aggregates = [
    ...finalRow.matchAll(
      /=Sum\(Fields!([A-Za-z0-9_]+)\.Value(?:,\s*"([^"]+)")?\)/g,
    ),
  ];
  const value = tablix(xml);
  return {
    tablixBodyRows: consistency.tablixes[0]!.rows,
    rowHierarchyLeaves: consistency.tablixes[0]!.rowHierarchyLeaves,
    groupNames: [...value.matchAll(/<Group Name="([^"]+)"/g)].map(
      (match) => match[1]!,
    ),
    rowHeights: bodyRows.map(
      (row) => row.match(/<Height>([^<]+)<\/Height>/)?.[1] ?? "",
    ),
    finalRowPhysicalCells: count(finalRow, "<TablixCell>"),
    finalRowColSpans: [...finalRow.matchAll(/<ColSpan>(\d+)<\/ColSpan>/g)].map(
      (match) => Number(match[1]),
    ),
    finalRowAggregateExpressions: aggregates.map((match) => match[0]),
    finalRowAggregateScopes: aggregates.map((match) => match[2] ?? null),
    totalHeaderValues: [
      ...value.matchAll(
        /<TablixHeader>[\s\S]*?<Value>(Total|Grand Total)<\/Value>[\s\S]*?<\/TablixHeader>/g,
      ),
    ].map((match) => match[1]!),
    keepWithGroupBeforeCount: count(
      value,
      "<KeepWithGroup>Before</KeepWithGroup>",
    ),
    tablixHeight:
      value.match(/<Top>[^<]+<\/Top>\s*<Height>([^<]+)<\/Height>/)?.[1] ?? null,
    pageBreakCount: count(xml, "<PageBreak>"),
    parameterCount: count(xml, "<ReportParameters>"),
  };
};

export const assertReportBuilderGrandTotalStructure = (
  xml: string,
  options: { allowPageBreaks?: boolean } = {},
): void => {
  const value = fingerprintGrandTotal(xml);
  if (value.tablixBodyRows !== 4 || value.rowHierarchyLeaves !== 4)
    throw new Error(
      "Report Builder grand-total baseline requires four body rows and four hierarchy leaves",
    );
  if (value.groupNames.join("|") !== "Region|Region1|Details")
    throw new Error("Accepted Region hierarchy is absent");
  if (value.finalRowPhysicalCells !== 8 || value.finalRowColSpans.length !== 0)
    throw new Error(
      "Report Builder grand-total row requires eight unmerged physical cells",
    );
  if (
    value.finalRowAggregateExpressions.join("|") !==
      "=Sum(Fields!Quantity.Value)|=Sum(Fields!Revenue.Value)|=Sum(Fields!GrossProfit.Value)" ||
    value.finalRowAggregateScopes.some(Boolean)
  )
    throw new Error(
      "Report Builder dataset-context grand-total expressions differ",
    );
  if (value.keepWithGroupBeforeCount !== 2)
    throw new Error("Report Builder grand-total KeepWithGroup shape differs");
  for (const token of [
    '<Textbox Name="Textbox2">',
    '<Textbox Name="Textbox12">',
    "<Height>1.05in</Height>",
  ])
    if (!xml.includes(token))
      throw new Error(
        `Report Builder grand-total structure is missing ${token}`,
      );
  if (
    (!options.allowPageBreaks && value.pageBreakCount !== 0) ||
    value.parameterCount !== 0
  )
    throw new Error("Grand-total seed contains a prohibited later capability");
};

export const compareGrandTotalStructures = (
  candidate04c: string,
  seed: string,
) => ({
  acceptedCandidate04c: fingerprintGrandTotal(candidate04c),
  reportBuilderGrandTotalSeed: fingerprintGrandTotal(seed),
  highConfidenceDiscriminators: [
    "Report Builder adds a fourth eight-cell TablixBody row without merged cells.",
    "Report Builder adds a fourth top-level row-hierarchy leaf after the dynamic Region member; the existing Region > Region1 > Details and Region subtotal subtree remains present.",
    "The three final-row sums have no explicit group scope and therefore evaluate in dataset/report context outside the Region member.",
    "The authored grand-total hierarchy uses Textbox2 with the value Total and a nested blank Textbox12 header, plus KeepWithGroup=Before.",
    "The Tablix height changes from 0.8in to 1.05in; embedded data and the nine field definitions remain unchanged.",
  ],
  conclusion:
    "The accepted seed supplies the exact Report Builder-authored arrangement required for Candidate 05; no hierarchy construction is inferred.",
});
