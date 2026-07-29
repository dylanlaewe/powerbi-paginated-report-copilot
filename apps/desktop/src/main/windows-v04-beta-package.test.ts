import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../../..");
const bundle = resolve(root, "artifacts/windows-v0.4-beta1-validation");
const executable = "Power-BI-RDL-Copilot-0.4.0-beta.1-windows-x64-portable.exe";
const sha256 = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

describe("Windows v0.4 beta validation package", () => {
  it("pins the executable and leaves manual results empty", () => {
    const expected = JSON.parse(
      readFileSync(resolve(bundle, "EXPECTED_RESULTS.json"), "utf8"),
    ) as {
      applicationVersion: string;
      releaseStatus: string;
      provider: { sdkVersion: string; defaultModel: string };
      executable: { byteSize: number; sha256: string; signed: boolean };
      scenarios: { manualResult: unknown }[];
      manualResults: Record<string, unknown>;
    };
    const executablePath = resolve(bundle, executable);
    expect(expected).toMatchObject({
      applicationVersion: "0.4.0-beta.1",
      releaseStatus: "awaitingWindowsValidation",
      provider: {
        sdkVersion: "0.115.0",
        defaultModel: "claude-sonnet-5",
      },
      executable: {
        byteSize: 90_199_019,
        sha256:
          "7c05ac7407bf91451de76ef2b64fc6cf8d373bdf9ec1f8591713382df0f5c3a6",
        signed: false,
      },
    });
    expect(statSync(executablePath).size).toBe(expected.executable.byteSize);
    expect(sha256(executablePath)).toBe(expected.executable.sha256);
    expect(
      expected.scenarios.every(({ manualResult }) => manualResult === null),
    ).toBe(true);
    expect(
      Object.values(expected.manualResults).every((value) => value === null),
    ).toBe(true);
  });

  it("keeps all copied inputs byte-identical", () => {
    const pairs = [
      [
        "inputs/synthetic-inventory-detail.rdl",
        "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
      ],
      [
        "inputs/synthetic-department-sales.rdl",
        "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
      ],
      [
        "inputs/Invoice.rdl",
        "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl",
      ],
      [
        "inputs/Transcript.rdl",
        "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl",
      ],
    ];
    for (const [copy, source] of pairs)
      expect(readFileSync(resolve(bundle, copy!))).toEqual(
        readFileSync(resolve(root, source!)),
      );
  });
});
