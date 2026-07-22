import {
  rdlDetailFields,
  rdlReportSpecificationSchema,
  type RdlReportSpecification,
} from "@powerbi-copilot/domain";

const titlePattern = /\btitle(?:d)?\s+(?:as\s+)?[“"]([^”"]+)[”"]/iu;

export const parseNaturalLanguageReportRequest = (
  request: string,
): RdlReportSpecification => {
  const title = titlePattern.exec(request)?.[1]?.trim();
  if (!title) throw new Error('Request must contain title "..."');
  if (!/production(?:-|\s+)pagination(?:-|\s+)template/iu.test(request))
    throw new Error(
      "Only the accepted production-pagination template is allowed",
    );

  const dataStart = request.indexOf("[");
  const dataEnd = request.lastIndexOf("]");
  if (dataStart < 0 || dataEnd <= dataStart)
    throw new Error("Request must contain a JSON array of synthetic rows");

  let rows: unknown;
  try {
    rows = JSON.parse(request.slice(dataStart, dataEnd + 1));
  } catch {
    throw new Error("Request dataset is not valid JSON");
  }

  return rdlReportSpecificationSchema.parse({
    version: 1,
    template: "production-pagination-letter",
    title,
    fields: rdlDetailFields,
    labels: { regionSubtotal: "Region Total", grandTotal: "Grand Total" },
    rows,
  });
};
