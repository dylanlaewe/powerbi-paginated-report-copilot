import { describe, expect, it } from "vitest";
import { parseNaturalLanguageReportRequest } from "./index";

const row = {
  SaleDate: "2026-07-22",
  Region: "East",
  Salesperson: "Alex Kim",
  Customer: "Cedar Clinic",
  Product: "Tablet Kit",
  Category: "Technology",
  Quantity: 2,
  Revenue: 900,
  GrossProfit: 300,
};

describe("natural-language RDL specification", () => {
  it("creates a validated specification for the accepted template", () => {
    const specification = parseNaturalLanguageReportRequest(
      `Create a report titled "Synthetic Regional Sales" using the production pagination template with data: ${JSON.stringify([row])}`,
    );
    expect(specification.title).toBe("Synthetic Regional Sales");
    expect(specification.template).toBe("production-pagination-letter");
    expect(specification.rows).toEqual([row]);
    expect(specification.fields).toHaveLength(9);
  });

  it("rejects unapproved templates and malformed rows", () => {
    expect(() =>
      parseNaturalLanguageReportRequest(
        `Create a report titled "Unsafe" using the chart template with data: ${JSON.stringify([row])}`,
      ),
    ).toThrow("Only the accepted");
    expect(() =>
      parseNaturalLanguageReportRequest(
        'Create a report titled "Bad" using the production pagination template with data: [{"Region":"East"}]',
      ),
    ).toThrow();
  });
});
