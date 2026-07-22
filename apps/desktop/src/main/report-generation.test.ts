import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  controlledOutputDirectory,
  controlledReportFileName,
  generateFromUiRequest,
} from "./report-generation";

const directories: string[] = [];
const canonicalRequest = resolve("examples/regional-sales-request.txt");
const canonicalReport = resolve(
  "artifacts/copilot-mvp/regional-sales-generated.rdl",
);

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true })),
  );
});

describe("Electron report generation service", () => {
  it("generates byte-identical CLI/UI output in the controlled folder", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rdl-ui-"));
    directories.push(directory);
    const outputRoot = controlledOutputDirectory(directory);
    const result = await generateFromUiRequest(
      await readFile(canonicalRequest, "utf8"),
      outputRoot,
    );
    expect(result.status).toBe("generated");
    if (result.status !== "generated") return;
    expect(result.outputPath).toBe(join(outputRoot, controlledReportFileName));
    expect(await readFile(result.outputPath)).toEqual(
      await readFile(canonicalReport),
    );
    expect(result.sha256).toBe(
      createHash("sha256")
        .update(await readFile(canonicalReport))
        .digest("hex"),
    );
  });

  it("returns displayable errors for invalid and rejected-template requests", async () => {
    const invalid = await generateFromUiRequest("not a report", tmpdir());
    expect(invalid.status).toBe("error");
    const rejected = await generateFromUiRequest(
      'Create a report titled "No" using the custom template with data: []',
      tmpdir(),
    );
    expect(rejected).toEqual({
      status: "error",
      message: "Only the accepted production-pagination template is allowed",
    });
  });

  it("never derives an output path from renderer input", () => {
    const root = controlledOutputDirectory("/safe/application-data");
    expect(join(root, controlledReportFileName)).toBe(
      "/safe/application-data/generated-reports/regional-sales-generated.rdl",
    );
    expect(controlledReportFileName).not.toContain("..");
  });
});
