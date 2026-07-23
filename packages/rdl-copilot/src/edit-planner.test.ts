import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { canonicalGate2EditPlan } from "./edit-plan";
import {
  createEditPlannerContext,
  editPlannerContextSchema,
  LocalSentenceEditPlanner,
  type EditPlannerContext,
} from "./edit-planner";
import { inspectRdlFile } from "./inspection";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const canonicalPath = `${root}/examples/existing-rdl-sidecar/requests/title-style-landscape-format.txt`;
const sourcePath = `${root}/examples/existing-rdl-sidecar/source/regional-sales-existing.rdl`;
const planner = new LocalSentenceEditPlanner();
const context: EditPlannerContext = {
  version: 1,
  existingFieldNames: [
    "SaleDate",
    "Region",
    "Salesperson",
    "Customer",
    "Product",
    "Category",
    "Quantity",
    "Revenue",
    "GrossProfit",
    "MarginPercent",
  ],
  formattingFieldNames: [
    "SaleDate",
    "Region",
    "Salesperson",
    "Customer",
    "Product",
    "Category",
    "Quantity",
    "Revenue",
    "GrossProfit",
    "MarginPercent",
  ],
  supportedSemanticRoles: ["reportTitle"],
  pageOrientation: "portrait",
  currentReportTitle: "Regional Sales Subtotal Compatibility Test",
};

const planned = (request: string, plannerContext = context) => {
  const result = planner.plan(request, plannerContext);
  expect(result.status).toBe("planned");
  if (result.status !== "planned") throw new Error(result.message);
  return result;
};
const rejected = (request: string, plannerContext = context) => {
  const result = planner.plan(request, plannerContext);
  expect(result.status).toBe("rejected");
  if (result.status !== "rejected") throw new Error("Expected rejection");
  return result;
};

describe("LocalSentenceEditPlanner", () => {
  it("produces the accepted Gate 2 plan and stable proposal from the canonical request", async () => {
    const request = await readFile(canonicalPath, "utf8");
    const result = planned(request);
    expect(result.plan).toEqual(canonicalGate2EditPlan);
    expect(result.planSha256).toBe(
      "879e154376816bc9aef823689bc4d9e5a22daf96911965396fddb6a9cb99f5dc",
    );
    expect(result.proposal).toEqual([
      'Change report title from "Regional Sales Subtotal Compatibility Test" to "Weekly Sales Pipeline".',
      "Change report title font size to 18pt.",
      "Make report title bold.",
      "Change page orientation to landscape.",
      "Format Revenue displays as C0.",
    ]);
    expect(result.recognizedClauses).toHaveLength(4);
  });

  it("derives a context containing inventory metadata but no XML, paths, or rows", async () => {
    const derived = createEditPlannerContext(await inspectRdlFile(sourcePath));
    expect(editPlannerContextSchema.parse(derived)).toEqual(derived);
    expect(derived.formattingFieldNames).toContain("GrossProfit");
    expect(JSON.stringify(derived)).not.toMatch(
      /<Report|\.rdl|Weekly|Central/u,
    );
  });

  it.each([
    ['Rename the report to "New Name".', "New Name"],
    ["Change the title to 'Single'.", "Single"],
    ["Rename the title to “Curly Double”.", "Curly Double"],
    ["Rename the title to ‘Curly Single’.", "Curly Single"],
  ])("supports quoted title form %s", (request, title) => {
    expect(planned(request).plan.operations[0]).toMatchObject({ value: title });
  });

  it.each(["18-point", "18 point", "18pt"])(
    "supports %s title-size phrasing",
    (size) => {
      expect(
        planned(`Make the title ${size} bold.`).plan.operations[0],
      ).toMatchObject({ fontSize: "18pt", fontWeight: "Bold" });
    },
  );

  it("merges reversed and separately stated compatible styles", () => {
    expect(
      planned("Make the title bold and 18 pt, and center the report title.")
        .plan.operations,
    ).toEqual([
      {
        type: "setTextStyle",
        target: { kind: "reportItem", semanticRole: "reportTitle" },
        fontSize: "18pt",
        fontWeight: "Bold",
        textAlign: "Center",
      },
    ]);
  });

  it.each([
    ["Switch the page to landscape.", "landscape"],
    ["Change the report to landscape.", "landscape"],
    ["Use landscape orientation.", "landscape"],
    ["Make the page portrait.", "portrait"],
    ["Switch to portrait.", "portrait"],
  ])("supports orientation form %s", (request, orientation) => {
    expect(planned(request).plan.operations[0]).toMatchObject({ orientation });
  });

  it.each([
    ["Format Revenue as currency with no decimal places.", "Revenue", "C0"],
    ["Show Revenue as currency with two decimals.", "Revenue", "C2"],
    ["Format Quantity as a number with no decimals.", "Quantity", "N0"],
    ["Format Quantity as a number with two decimal places.", "Quantity", "N2"],
    [
      "Format MarginPercent as a percentage with no decimals.",
      "MarginPercent",
      "P0",
    ],
    [
      "Format MarginPercent as a percentage with two decimals.",
      "MarginPercent",
      "P2",
    ],
    ["Show Gross Profit as currency with two decimals.", "GrossProfit", "C2"],
  ])("maps number format %s", (request, fieldName, format) => {
    expect(planned(request).plan.operations[0]).toMatchObject({
      target: { fieldName },
      format,
    });
  });

  it("normalizes case, whitespace, line endings, and Unicode hyphens outside titles", () => {
    const result = planned(
      "  MAKE   THE TITLE 18—POINT BOLD,\r\n SWITCH THE PAGE TO LANDSCAPE. ",
    );
    expect(result.plan.operations).toHaveLength(2);
    expect(result.normalizedRequest).toBe(
      "MAKE THE TITLE 18-POINT BOLD, SWITCH THE PAGE TO LANDSCAPE.",
    );
  });

  it("canonicalizes clause order and format-field order", () => {
    const one = planned(
      'Change the title to "X", format Revenue as currency with no decimals, and format Quantity as a number with no decimals.',
    );
    const two = planned(
      'Format Quantity as a number with no decimals, format Revenue as currency with no decimals, and change the title to "X".',
    );
    expect(JSON.stringify(one.plan)).toBe(JSON.stringify(two.plan));
    expect(one.planSha256).toBe(two.planSha256);
  });

  it("deduplicates identical instructions deterministically", () => {
    const result = planned(
      "Make the title bold and make the report title bold.",
    );
    expect(result.plan.operations).toHaveLength(1);
  });

  it.each([
    ['Change the title to "A" and change the title to "B".'],
    ["Set the title font size to 18pt and set the title font size to 20pt."],
    ["Make the title bold and make the title normal."],
    ["Left-align the title and right-align the title."],
    ["Switch to portrait and switch the page to landscape."],
    [
      "Format Revenue as currency with no decimals and format Revenue as currency with two decimals.",
    ],
    [
      "Format Revenue as currency with no decimals and format Revenue as a number with no decimals.",
    ],
  ])("rejects conflict: %s", (request) => {
    expect(rejected(request).code).toBe("CONFLICT");
  });

  it.each([
    [""],
    ["   \r\n "],
    ['Change the title to ""'],
    ['Change the title to "unterminated'],
    ["Change the title to Weekly Sales"],
    ["Format Unknown as currency with no decimals"],
    ["Format Revenue as currency with 3 decimals"],
    ["Make the title italic"],
    ["Add a chart"],
    ['Change the title to "X" and add a bar chart'],
    ["<Report><Textbox /></Report>"],
    ["Use this XPath //Report/Body"],
    ["Change the SQL query"],
    ["Connect to a database"],
    ["Save to /tmp/output.rdl"],
    ["Execute rm -rf something"],
  ])("fails closed for unsupported request %j", (request) => {
    expect(rejected(request).unsupportedFragments).toBeDefined();
  });

  it("rejects ambiguous normalized field matches", () => {
    expect(
      rejected("Format Gross Profit as currency with two decimals.", {
        ...context,
        formattingFieldNames: ["GrossProfit", "Gross Profit"],
      }).code,
    ).toBe("AMBIGUOUS_FIELD");
  });

  it("rejects unsupported content before, between, and after supported clauses", () => {
    for (const request of [
      'Add a chart and change the title to "X".',
      'Change the title to "X", add a chart, and switch to portrait.',
      'Change the title to "X" and add a chart.',
    ])
      expect(rejected(request).code).toBe("UNSUPPORTED_REQUEST");
  });

  it("rejects controls and excessive input without throwing", () => {
    expect(rejected("Change\u0000 title").code).toBe("INVALID_CHARACTER");
    expect(rejected("a".repeat(8193)).code).toBe("REQUEST_TOO_LARGE");
  });

  it("is deterministic across repeated calls and platform newlines", () => {
    const request =
      'Change the title to "Stable",\nmake the title bold,\rand switch to portrait.';
    expect(planner.plan(request, context)).toEqual(
      planner.plan(request, context),
    );
  });

  it("bounded fuzz never throws or returns an unvalidated plan", () => {
    const tokens = [
      "",
      "and",
      ",,,",
      '"',
      "“",
      "MAKE",
      "title",
      "bold",
      "\n",
      "add chart",
      "<xml>",
      "18—point",
    ];
    let seed = 731;
    for (let index = 0; index < 250; index += 1) {
      seed = (seed * 48271) % 2147483647;
      const request = Array.from(
        { length: 1 + (seed % 10) },
        (_, tokenIndex) => tokens[(seed + tokenIndex * 17) % tokens.length],
      ).join(seed % 2 ? " " : "\r\n");
      expect(() => planner.plan(request, context)).not.toThrow();
      const result = planner.plan(request, context);
      if (result.status === "planned")
        expect(result.plan).toEqual(expect.objectContaining({ version: 1 }));
    }
  });
});
