import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { deriveCandidate02, detailFields, detailRows } from "./candidate02";
import { validateCollectionConsistency } from "./compatibility";
import { sha256 } from "./ladder";

let candidate01 = "";
let candidate02 = "";
beforeAll(async () => {
  candidate01 = await readFile(
    resolve(
      "artifacts/rdl-compatibility-ladder/01-minimal-enter-data-table.rdl",
    ),
    "utf8",
  );
  candidate02 = deriveCandidate02(candidate01);
});

describe("RDL compatibility candidate 02", () => {
  it("derives from and does not mutate accepted Candidate 01", () => {
    expect(sha256(candidate01)).toBe(
      "151274f425f20e1bd88a7a8f892fca799f9efe9184b1df42e9cec53ab2e016a7",
    );
  });

  it("contains exactly nine required fields and six complete rows", () => {
    const result = validateCollectionConsistency(candidate02);
    expect(result.fields).toEqual(detailFields);
    expect(result.elementPathFields).toEqual(detailFields);
    expect(result.embeddedRows).toBe(6);
    expect(detailRows).toHaveLength(6);
    for (const row of detailRows)
      expect(Object.keys(row)).toEqual(detailFields);
  });

  it("keeps all tablix body and hierarchy counts consistent", () => {
    expect(
      validateCollectionConsistency(candidate02).tablixes[0],
    ).toMatchObject({
      columns: 8,
      rows: 2,
      columnHierarchyLeaves: 8,
      rowHierarchyLeaves: 2,
      rowCellWidths: [8, 8],
    });
  });

  it("displays every required field with compatible formatting", () => {
    for (const field of detailFields)
      expect(candidate02).toContain(`Fields!${field}.Value`);
    expect(candidate02).toContain("<Format>yyyy-MM-dd</Format>");
    expect(candidate02).toContain("<Format>N0</Format>");
    expect(candidate02.match(/<Format>C2<\/Format>/g)).toHaveLength(2);
  });

  it("adds no totals, page breaks, repeat behavior, parameters, or footer", () => {
    expect(candidate02).not.toContain("Sum(");
    expect(candidate02).not.toContain("<PageBreak>");
    expect(candidate02).not.toContain("<RepeatOnNewPage>");
    expect(candidate02.split("<ReportParametersLayout>").length).toBe(
      candidate01.split("<ReportParametersLayout>").length,
    );
    expect(candidate02.split('<Textbox Name="ExecutionTime">').length).toBe(
      candidate01.split('<Textbox Name="ExecutionTime">').length,
    );
  });

  it("preserves validated root, data source, and footer structures", () => {
    for (const token of [
      'MustUnderstand="df"',
      "<am:AuthoringMetadata>",
      "<df:DefaultFontFamily>Segoe UI</df:DefaultFontFamily>",
      '<DataSource Name="SeedData">',
      "<DataProvider>ENTERDATA</DataProvider>",
      "<PageFooter>",
    ])
      expect(candidate02).toContain(token);
  });

  it("fails closed for a changed Candidate 01 baseline", () => {
    expect(() =>
      deriveCandidate02(candidate01.replace("SeedData", "Other")),
    ).toThrow("Accepted Candidate 01 SHA-256 differs");
  });
});
