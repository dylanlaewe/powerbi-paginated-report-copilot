import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const packageRoot = resolve(
  repositoryRoot,
  "artifacts/windows-v0.3-validation",
);
const expectedResultsPath = resolve(packageRoot, "EXPECTED_RESULTS.json");
const executableName = "Power-BI-RDL-Copilot-0.3.0-windows-x64-portable.exe";

const sourceByPackagedPath = new Map([
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
  [
    "licenses/LICENSE.microsoft.txt",
    "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/LICENSE.microsoft.txt",
  ],
]);

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

interface ExpectedResults {
  applicationVersion: string;
  releaseStatus: string;
  executable: {
    filename: string;
    byteSize: number;
    sha256: string;
    architecture: string;
    signed: boolean;
  };
  scenarios: { manualResults: Record<string, unknown> }[];
  manualReleaseResults: Record<string, unknown>;
}

describe("Windows v0.3 validation release candidate", () => {
  it("pins the unsigned Windows x64 executable identity", () => {
    const expected = JSON.parse(
      readFileSync(expectedResultsPath, "utf8"),
    ) as ExpectedResults;
    const executable = readFileSync(resolve(packageRoot, executableName));

    expect(expected.applicationVersion).toBe("0.3.0");
    expect(expected.releaseStatus).toBe("awaitingWindowsValidation");
    expect(expected.executable).toEqual({
      filename: executableName,
      byteSize: 89_642_264,
      sha256:
        "c10974891ed23308d7bae13118adb7803592a174cda7f95952909aa3a886d50a",
      architecture: "windows-x64",
      format: "portable",
      signed: false,
    });
    expect(statSync(resolve(packageRoot, executableName)).size).toBe(
      expected.executable.byteSize,
    );
    expect(sha256(executable)).toBe(expected.executable.sha256);
    expect(
      executable.equals(
        readFileSync(resolve(repositoryRoot, "dist/windows", executableName)),
      ),
    ).toBe(true);
  });

  it("keeps every accepted input and Microsoft license byte-identical", () => {
    for (const [packagedPath, sourcePath] of sourceByPackagedPath) {
      expect(
        readFileSync(resolve(packageRoot, packagedPath)).equals(
          readFileSync(resolve(repositoryRoot, sourcePath)),
        ),
      ).toBe(true);
    }
  });

  it("verifies every packaged checksum", () => {
    const lines = readFileSync(resolve(packageRoot, "SHA256SUMS.txt"), "utf8")
      .trim()
      .split("\n");
    expect(lines).toHaveLength(8);
    for (const line of lines) {
      const [expectedHash, relativePath] = line.split("  ");
      expect(relativePath).toBeTruthy();
      expect(sha256(readFileSync(resolve(packageRoot, relativePath!)))).toBe(
        expectedHash,
      );
    }
  });

  it("leaves all independent Windows results unfilled", () => {
    const expected = JSON.parse(
      readFileSync(expectedResultsPath, "utf8"),
    ) as ExpectedResults;
    for (const scenario of expected.scenarios) {
      expect(Object.values(scenario.manualResults)).toEqual(
        expect.arrayContaining(
          Array(Object.keys(scenario.manualResults).length).fill(null),
        ),
      );
    }
    expect(Object.values(expected.manualReleaseResults)).toEqual(
      expect.arrayContaining(
        Array(Object.keys(expected.manualReleaseResults).length).fill(null),
      ),
    );
  });
});
