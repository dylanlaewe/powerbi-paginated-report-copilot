import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  applyExistingRdlSidecar,
  canonicalSourceSha256,
  controlledOutputRelativePath,
  decodeStrictUtf8Request,
  parseSidecarCliArguments,
  planExistingRdlSidecar,
  runSidecarCli,
  sidecarAuditManifestSchema,
  sidecarCliHelp,
  SidecarCliError,
} from "./sidecar-cli";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const sourcePath = join(
  repositoryRoot,
  "examples/existing-rdl-sidecar/source/regional-sales-existing.rdl",
);
const requestPath = join(
  repositoryRoot,
  "examples/existing-rdl-sidecar/requests/title-style-landscape-format.txt",
);
const expectedPath = join(
  repositoryRoot,
  "examples/existing-rdl-sidecar/expected/regional-sales-existing-copilot-edited.rdl",
);
const schemaPath = join(
  repositoryRoot,
  "packages/rdl-spike/schema/ReportDefinition-2016.xsd",
);
const planSha256 =
  "879e154376816bc9aef823689bc4d9e5a22daf96911965396fddb6a9cb99f5dc";
const outputSha256 =
  "d84670ccd232ea9c077e7b438e9bf3ef5a8283a8f8b95968ca91f32fe0cbd5bb";
const hash = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const temporaryDirectories: string[] = [];
let expectedBytes: Buffer;

beforeAll(async () => {
  expectedBytes = await readFile(expectedPath);
});

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const makeRoot = async (): Promise<{
  root: string;
  source: string;
  request: string;
  outputDirectory: string;
}> => {
  const root = await mkdtemp(join(tmpdir(), "sidecar-cli-"));
  temporaryDirectories.push(root);
  const source = join(root, "input", basename(sourcePath));
  const request = join(root, "input", basename(requestPath));
  const schema = join(
    root,
    "packages/rdl-spike/schema/ReportDefinition-2016.xsd",
  );
  await Promise.all([
    mkdir(dirname(source), { recursive: true }),
    mkdir(dirname(schema), { recursive: true }),
    writeFile(join(root, "pnpm-workspace.yaml"), "packages: []\n"),
  ]);
  await Promise.all([
    copyFile(sourcePath, source),
    copyFile(requestPath, request),
    copyFile(schemaPath, schema),
  ]);
  return {
    root,
    source,
    request,
    outputDirectory: join(root, controlledOutputRelativePath),
  };
};

const finalFiles = async (directory: string): Promise<string[]> => {
  try {
    return (await readdir(directory)).sort();
  } catch {
    return [];
  }
};

describe("Gate 4 CLI parsing", () => {
  it.each(["plan", "apply"] as const)("parses %s mode", (mode) => {
    expect(
      parseSidecarCliArguments([
        "--",
        mode,
        "--source",
        "report.rdl",
        "--request-file",
        "request.txt",
      ]),
    ).toEqual({
      mode,
      source: "report.rdl",
      requestFile: "request.txt",
    });
  });

  it.each([
    ["plan", "--request-file", "request.txt"],
    ["apply", "--source", "report.rdl"],
    ["plan", "--source", "a.rdl", "--unknown", "x"],
    ["apply", "--source", "a.rdl", "--request-file", "r", "--output", "x"],
    ["plan", "--source", "a.rdl", "--request-file", "r", "--xpath", "//x"],
    ["plan", "--source", "a.rdl", "--request-file", "r", "--xml", "<x/>"],
  ])("rejects invalid arguments %j", (...arguments_) => {
    expect(() => parseSidecarCliArguments(arguments_)).toThrow(SidecarCliError);
  });

  it("provides stable help and exit codes", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    expect(
      await runSidecarCli(["--help"], {
        stdout: (value) => stdout.push(value),
        stderr: (value) => stderr.push(value),
      }),
    ).toBe(0);
    expect(stdout).toEqual([sidecarCliHelp]);
    expect(stderr).toEqual([]);
    expect(
      await runSidecarCli(["unknown"], {
        stdout: (value) => stdout.push(value),
        stderr: (value) => stderr.push(value),
      }),
    ).toBe(1);
    expect(stderr.at(-1)).toMatch(/^ARGUMENT_INVALID:/u);
  });
});

describe("strict UTF-8 request handling", () => {
  it("decodes canonical UTF-8, BOM, curly quotes, CRLF, LF, and em dash", () => {
    for (const value of [
      "Change the title to “Curly”.\n",
      'Change the title to "LF".\n',
      'Change the title to "CRLF".\r\n',
      'Change the title to "Northwind Field Sales — July 2026".',
    ]) {
      expect(decodeStrictUtf8Request(Buffer.from(value, "utf8"))).toBe(value);
      expect(
        decodeStrictUtf8Request(Buffer.from(`\uFEFF${value}`, "utf8")),
      ).toBe(value);
    }
  });

  it("rejects invalid UTF-8 without replacement characters", () => {
    expect(() =>
      decodeStrictUtf8Request(Uint8Array.from([0xc3, 0x28])),
    ).toThrowError(expect.objectContaining({ code: "REQUEST_INVALID_UTF8" }));
  });

  it.each(["\n", "\r\n"])(
    "produces the canonical plan hash with %j newlines",
    async (newline) => {
      const fixture = await makeRoot();
      const request = (await readFile(requestPath, "utf8")).replace(
        /\n/gu,
        newline,
      );
      await writeFile(fixture.request, request, "utf8");
      expect(
        (
          await planExistingRdlSidecar({
            sourcePath: fixture.source,
            requestFilePath: fixture.request,
          })
        ).planSha256,
      ).toBe(planSha256);
    },
  );
});

describe("plan-only integration", () => {
  it("returns stable source and request validation codes", async () => {
    const fixture = await makeRoot();
    await expect(
      planExistingRdlSidecar({
        sourcePath: `${fixture.source}.missing`,
        requestFilePath: fixture.request,
      }),
    ).rejects.toMatchObject({ code: "SOURCE_EXTENSION_INVALID" });
    await expect(
      planExistingRdlSidecar({
        sourcePath: join(fixture.root, "missing.rdl"),
        requestFilePath: fixture.request,
      }),
    ).rejects.toMatchObject({ code: "SOURCE_NOT_FOUND" });
    await expect(
      planExistingRdlSidecar({
        sourcePath: fixture.source,
        requestFilePath: `${fixture.request}.missing`,
      }),
    ).rejects.toMatchObject({ code: "REQUEST_NOT_FOUND" });
    await writeFile(fixture.request, Uint8Array.from([0xc3, 0x28]));
    await expect(
      planExistingRdlSidecar({
        sourcePath: fixture.source,
        requestFilePath: fixture.request,
      }),
    ).rejects.toMatchObject({ code: "REQUEST_INVALID_UTF8" });
  });

  it("inspects, plans, resolves exact targets, and writes nothing", async () => {
    const fixture = await makeRoot();
    const before = await readFile(fixture.source);
    const result = await planExistingRdlSidecar({
      sourcePath: fixture.source,
      requestFilePath: fixture.request,
    });
    expect(result).toMatchObject({
      sourceSha256: canonicalSourceSha256,
      planSha256,
      noFilesChanged: true,
    });
    expect(
      result.resolvedTargets.map(({ reportItemName }) => reportItemName),
    ).toEqual([
      "ReportTitle",
      "ReportTitle",
      "ReportTitle",
      "ReportSection0/Page",
      "Revenue",
      "Textbox10",
      "Textbox19",
    ]);
    expect(result.proposal).toContain("Format Revenue displays as C0.");
    expect(await finalFiles(fixture.outputDirectory)).toEqual([]);
    expect(await readFile(fixture.source)).toEqual(before);
    expect(JSON.stringify(result)).not.toMatch(/Central|<Report|DataGrid/iu);
  });

  it.each(['Change the title to "Safe" and add a chart.', "Add a chart."])(
    "rejects unsupported request and writes nothing",
    async (request) => {
      const fixture = await makeRoot();
      await writeFile(fixture.request, request, "utf8");
      await expect(
        planExistingRdlSidecar({
          sourcePath: fixture.source,
          requestFilePath: fixture.request,
        }),
      ).rejects.toMatchObject({ code: "PLANNER_REJECTED" });
      expect(await finalFiles(fixture.outputDirectory)).toEqual([]);
    },
  );
});

describe("apply integration and audit manifest", () => {
  it("creates the Gate 2-identical RDL and an accurate adjacent manifest", async () => {
    const fixture = await makeRoot();
    const sourceBefore = await readFile(fixture.source);
    const result = await applyExistingRdlSidecar({
      sourcePath: fixture.source,
      requestFilePath: fixture.request,
      startPaths: [fixture.root],
    });
    const output = await readFile(result.outputPath);
    const manifest = sidecarAuditManifestSchema.parse(
      JSON.parse(await readFile(result.manifestPath, "utf8")),
    );
    expect(output).toEqual(expectedBytes);
    expect(hash(output)).toBe(outputSha256);
    expect(result).toMatchObject({
      sourceSha256: canonicalSourceSha256,
      planSha256,
      outputSha256,
      sourceUnchanged: true,
    });
    expect(manifest.source).toMatchObject({
      sha256BeforeInspection: canonicalSourceSha256,
      sha256BeforeMutation: canonicalSourceSha256,
      sha256AfterCompletion: canonicalSourceSha256,
    });
    expect(manifest.plan.sha256).toBe(planSha256);
    expect(manifest.output.sha256).toBe(outputSha256);
    expect(manifest.validation).toEqual(
      Object.fromEntries(
        Object.keys(manifest.validation).map((key) => [key, "PASS"]),
      ),
    );
    expect(
      manifest.resolvedTargets.map(({ reportItemName }) => reportItemName),
    ).toContain("Textbox19");
    expect(JSON.stringify(manifest)).not.toMatch(
      /Central|<Report|DataGrid|XPath/iu,
    );
    expect(await readFile(fixture.source)).toEqual(sourceBefore);
  });

  it("uses duplicate-safe names and never overwrites an existing output", async () => {
    const fixture = await makeRoot();
    const first = await applyExistingRdlSidecar({
      sourcePath: fixture.source,
      requestFilePath: fixture.request,
      startPaths: [fixture.root],
    });
    const firstBytes = await readFile(first.outputPath);
    const second = await applyExistingRdlSidecar({
      sourcePath: fixture.source,
      requestFilePath: fixture.request,
      startPaths: [fixture.root],
    });
    expect(second.outputPath).toMatch(/-2\.rdl$/u);
    expect(await readFile(first.outputPath)).toEqual(firstBytes);
    expect(await readFile(second.outputPath)).toEqual(firstBytes);
  });

  it("does not depend on process.cwd()", async () => {
    const fixture = await makeRoot();
    const original = process.cwd();
    try {
      process.chdir(tmpdir());
      const result = await applyExistingRdlSidecar({
        sourcePath: fixture.source,
        requestFilePath: fixture.request,
        startPaths: [fixture.root],
      });
      expect(
        result.outputPath.startsWith(await realpath(fixture.outputDirectory)),
      ).toBe(true);
    } finally {
      process.chdir(original);
    }
  });

  it("rejects a controlled-output symlink escape", async () => {
    const fixture = await makeRoot();
    const outside = await mkdtemp(join(tmpdir(), "sidecar-outside-"));
    temporaryDirectories.push(outside);
    await mkdir(dirname(fixture.outputDirectory), { recursive: true });
    await symlink(outside, fixture.outputDirectory);
    await expect(
      applyExistingRdlSidecar({
        sourcePath: fixture.source,
        requestFilePath: fixture.request,
        startPaths: [fixture.root],
      }),
    ).rejects.toMatchObject({ code: "OUTPUT_WRITE_FAILED" });
    expect(await finalFiles(outside)).toEqual([]);
  });

  it("rejects a source checksum race before mutation without output", async () => {
    const fixture = await makeRoot();
    await expect(
      applyExistingRdlSidecar(
        {
          sourcePath: fixture.source,
          requestFilePath: fixture.request,
          startPaths: [fixture.root],
        },
        {
          beforeSourceRecheck: async () => {
            await writeFile(
              fixture.source,
              Buffer.concat([await readFile(fixture.source), Buffer.from(" ")]),
            );
          },
        },
      ),
    ).rejects.toMatchObject({ code: "SOURCE_CHANGED" });
    expect(await finalFiles(fixture.outputDirectory)).toEqual([]);
  });

  it.each([
    ["RDL temporary write", "beforeRdlTemporaryWrite"],
    ["manifest temporary write", "beforeManifestTemporaryWrite"],
    ["RDL rename", "beforeRdlRename"],
    ["manifest rename", "beforeManifestRename"],
  ] as const)(
    "rolls back all final and temporary files after %s failure",
    async (_label, hook) => {
      const fixture = await makeRoot();
      await expect(
        applyExistingRdlSidecar(
          {
            sourcePath: fixture.source,
            requestFilePath: fixture.request,
            startPaths: [fixture.root],
          },
          { [hook]: async () => Promise.reject(new Error("injected failure")) },
        ),
      ).rejects.toBeInstanceOf(SidecarCliError);
      expect(await finalFiles(fixture.outputDirectory)).toEqual([]);
    },
  );

  it("produces identical RDL bytes across clean transactions", async () => {
    const first = await makeRoot();
    const second = await makeRoot();
    const outputs = await Promise.all(
      [first, second].map((fixture) =>
        applyExistingRdlSidecar({
          sourcePath: fixture.source,
          requestFilePath: fixture.request,
          startPaths: [fixture.root],
        }),
      ),
    );
    expect(await readFile(outputs[0]!.outputPath)).toEqual(
      await readFile(outputs[1]!.outputPath),
    );
    const manifests = await Promise.all(
      outputs.map(({ manifestPath }) =>
        readFile(manifestPath, "utf8").then((value) =>
          sidecarAuditManifestSchema.parse(JSON.parse(value)),
        ),
      ),
    );
    expect(manifests[0]!.transactionId).not.toBe(manifests[1]!.transactionId);
    expect(manifests[0]!.createdAt).toBeDefined();
  });
});
