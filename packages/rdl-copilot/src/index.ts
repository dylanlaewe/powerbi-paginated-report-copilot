import {
  rdlDetailFields,
  rdlReportSpecificationSchema,
  type RdlReportSpecification,
} from "@powerbi-copilot/domain";

const titlePattern = /\btitle(?:d)?\s+(?:as\s+)?[“"]([^”"]+)[”"]/iu;

const rejectDuplicateJsonKeys = (json: string): void => {
  const stack: Array<{ type: "object" | "array"; keys: Set<string> }> = [];
  let index = 0;
  let expectingKey = false;
  while (index < json.length) {
    const character = json[index];
    if (/\s/u.test(character ?? "")) {
      index += 1;
      continue;
    }
    if (character === "{") {
      stack.push({ type: "object", keys: new Set() });
      expectingKey = true;
      index += 1;
      continue;
    }
    if (character === "[") {
      stack.push({ type: "array", keys: new Set() });
      expectingKey = false;
      index += 1;
      continue;
    }
    if (character === "}" || character === "]") {
      stack.pop();
      expectingKey = false;
      index += 1;
      continue;
    }
    if (character === ",") {
      expectingKey = stack.at(-1)?.type === "object";
      index += 1;
      continue;
    }
    if (character === '"') {
      const start = index;
      index += 1;
      while (index < json.length) {
        if (json[index] === "\\") index += 2;
        else if (json[index] === '"') {
          index += 1;
          break;
        } else index += 1;
      }
      if (expectingKey && stack.at(-1)?.type === "object") {
        const key = JSON.parse(json.slice(start, index)) as string;
        const keys = stack.at(-1)?.keys;
        if (keys?.has(key)) throw new Error(`Duplicate JSON key: ${key}`);
        keys?.add(key);
        expectingKey = false;
      }
      continue;
    }
    index += 1;
  }
};

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
  const json = request.slice(dataStart, dataEnd + 1);
  rejectDuplicateJsonKeys(json);
  try {
    rows = JSON.parse(json);
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

export * from "./generator";
export * from "./approved-resources";
export * from "./xsd-validator";
export * from "./inspection";
export * from "./edit-plan";
export * from "./edit-planner";
export * from "./structural-guard";
export * from "./mutation";
