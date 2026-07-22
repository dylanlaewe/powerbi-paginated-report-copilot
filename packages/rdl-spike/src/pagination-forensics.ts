import { validateCollectionConsistency } from "./compatibility";

export interface PaginationFingerprint {
  bodyWidthInches: number;
  pageWidthInches: number;
  pageHeightInches: number | null;
  leftMarginInches: number;
  rightMarginInches: number;
  printableWidthInches: number;
  printSafe: boolean;
  repeatOnNewPageCount: number;
  fixedDataCount: number;
  regionPageBreakLocation: string | null;
  pageNumberExpressionCount: number;
  executionTimeExpressionCount: number;
  footerTextboxCount: number;
  tablixBodyRows: number;
  rowHierarchyLeaves: number;
  embeddedRows: number;
}

const count = (xml: string, token: string): number =>
  xml.split(token).length - 1;
const inches = (
  xml: string,
  element: string,
  fallback: number | null,
): number | null => {
  const value = xml.match(
    new RegExp(`<${element}>([0-9.]+)in</${element}>`),
  )?.[1];
  return value === undefined ? fallback : Number(value);
};

export const fingerprintPagination = (xml: string): PaginationFingerprint => {
  const consistency = validateCollectionConsistency(xml, {
    requirePrintSafe: false,
  });
  const pageWidth = inches(xml, "PageWidth", 8.5)!;
  const pageHeight = inches(xml, "PageHeight", null);
  const left = inches(xml, "LeftMargin", 1)!;
  const right = inches(xml, "RightMargin", 1)!;
  const printable = pageWidth - left - right;
  const footer = xml.match(/<PageFooter>([\s\S]*?)<\/PageFooter>/)?.[1] ?? "";
  return {
    bodyWidthInches: consistency.bodyWidthInches,
    pageWidthInches: pageWidth,
    pageHeightInches: pageHeight,
    leftMarginInches: left,
    rightMarginInches: right,
    printableWidthInches: printable,
    printSafe: consistency.bodyWidthInches <= printable,
    repeatOnNewPageCount: count(xml, "<RepeatOnNewPage>true</RepeatOnNewPage>"),
    fixedDataCount: count(xml, "<FixedData>true</FixedData>"),
    regionPageBreakLocation:
      xml.match(
        /<Group Name="Region">[\s\S]*?<PageBreak>[\s\S]*?<BreakLocation>([^<]+)<\/BreakLocation>/,
      )?.[1] ?? null,
    pageNumberExpressionCount:
      count(xml, "Globals!PageNumber") + count(xml, "Globals!TotalPages"),
    executionTimeExpressionCount: count(footer, "Globals!ExecutionTime"),
    footerTextboxCount: count(footer, "<Textbox Name="),
    tablixBodyRows: consistency.tablixes[0]!.rows,
    rowHierarchyLeaves: consistency.tablixes[0]!.rowHierarchyLeaves,
    embeddedRows: consistency.embeddedRows,
  };
};

export const assertReportBuilderPaginationStructure = (xml: string): void => {
  const value = fingerprintPagination(xml);
  if (value.repeatOnNewPageCount !== 1)
    throw new Error("Report Builder repeating-header marker is absent");
  if (value.regionPageBreakLocation !== "Between")
    throw new Error("Report Builder outer-Region page break is absent");
  if (value.pageNumberExpressionCount !== 2)
    throw new Error("Page N of M expression is absent");
  if (
    value.tablixBodyRows !== 4 ||
    value.rowHierarchyLeaves !== 4 ||
    value.embeddedRows !== 6
  )
    throw new Error("Accepted Candidate 05 report structure is not preserved");
};

export const comparePaginationStructures = (
  candidate05: string,
  seed: string,
) => ({
  acceptedCandidate05: fingerprintPagination(candidate05),
  reportBuilderProductionSeed: fingerprintPagination(seed),
  observedDeltas: [
    "Report Builder adds RepeatOnNewPage=true to the existing static header member; it does not add FixedData.",
    "Report Builder adds BreakLocation=Between inside the outer Region group.",
    "Report Builder adds a second footer textbox containing Page N of M while retaining the execution-time textbox.",
    "Margins change from 1in to 0.5in and an explicit PageWidth=2in is added; PageHeight remains unspecified.",
  ],
  blockingFinding:
    "The seed's 7in body plus 0.5in left/right margins requires at least 8in page width, but explicit PageWidth is 2in. Static print-safe validation fails, and the submitted horizontal-clipping/blank-page fields were placeholders.",
  conclusion:
    "Pagination structures are proven, but Candidate 06 cannot preserve this page dimension and also satisfy the required print-safe-width condition. A corrected Report Builder-authored seed is required.",
});
