import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalGate2EditPlan, editPlanSchema } from "./edit-plan";

const repositoryRoot = resolve(import.meta.dirname, "../../..");

describe("EditPlan v1", () => {
  it("runtime-validates and serializes the canonical hand-authored plan", () => {
    expect(editPlanSchema.parse(canonicalGate2EditPlan)).toEqual(
      canonicalGate2EditPlan,
    );
    expect(JSON.parse(JSON.stringify(canonicalGate2EditPlan))).toEqual(
      canonicalGate2EditPlan,
    );
  });

  it("matches the committed canonical plan evidence", async () => {
    const committed = JSON.parse(
      await readFile(
        resolve(
          repositoryRoot,
          "examples/existing-rdl-sidecar/requests/canonical-gate-2-edit-plan.json",
        ),
        "utf8",
      ),
    ) as unknown;
    expect(editPlanSchema.parse(committed)).toEqual(canonicalGate2EditPlan);
  });

  it.each([
    [
      "invalid version",
      { version: 2, operations: canonicalGate2EditPlan.operations },
    ],
    [
      "unsupported operation",
      { version: 1, operations: [{ type: "deleteReport", target: {} }] },
    ],
    [
      "invalid font size",
      {
        version: 1,
        operations: [
          {
            type: "setTextStyle",
            target: { kind: "reportItem", semanticRole: "reportTitle" },
            fontSize: "huge",
          },
        ],
      },
    ],
    [
      "invalid font weight",
      {
        version: 1,
        operations: [
          {
            type: "setTextStyle",
            target: { kind: "reportItem", semanticRole: "reportTitle" },
            fontWeight: "Heavy",
          },
        ],
      },
    ],
    [
      "invalid number format",
      {
        version: 1,
        operations: [
          {
            type: "setNumberFormat",
            target: { kind: "fieldDisplay", fieldName: "Revenue" },
            format: "C3",
          },
        ],
      },
    ],
    [
      "duplicate operation",
      {
        version: 1,
        operations: [
          canonicalGate2EditPlan.operations[0],
          { ...canonicalGate2EditPlan.operations[0], value: "Conflicting" },
        ],
      },
    ],
    [
      "raw XPath target",
      {
        version: 1,
        operations: [
          {
            type: "setText",
            target: {
              kind: "reportItem",
              semanticRole: "reportTitle",
              xpath: "//*",
            },
            value: "Unsafe",
          },
        ],
      },
    ],
  ])("rejects %s", (_name, input) => {
    expect(() => editPlanSchema.parse(input)).toThrow();
  });
});
