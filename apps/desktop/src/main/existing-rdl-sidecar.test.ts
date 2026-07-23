import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sidecarAuditManifestSchema } from "@powerbi-copilot/rdl-copilot";
import {
  ExistingRdlSidecarService,
  revealLabelForPlatform,
} from "./existing-rdl-sidecar";

const root = resolve(import.meta.dirname, "../../../..");
const sourcePath = join(
  root,
  "examples/existing-rdl-sidecar/source/regional-sales-existing.rdl",
);
const schemaPath = join(
  root,
  "packages/rdl-spike/schema/ReportDefinition-2016.xsd",
);
const expectedPath = join(
  root,
  "examples/existing-rdl-sidecar/expected/regional-sales-existing-copilot-edited.rdl",
);
const canonicalRequest =
  'Change the report title to "Weekly Sales Pipeline", make the title 18-point bold, switch the page to landscape, and format Revenue as currency with no decimal places.';
const sourceSha =
  "c2d27f7595d9330eb9815f86483aa068129265a00980ca3b0b956f6f3f1de17a";
const planSha =
  "879e154376816bc9aef823689bc4d9e5a22daf96911965396fddb6a9cb99f5dc";
const outputSha =
  "d84670ccd232ea9c077e7b438e9bf3ef5a8283a8f8b95968ca91f32fe0cbd5bb";
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const setup = async (now?: () => number) => {
  const directory = await mkdtemp(join(tmpdir(), "electron-sidecar-"));
  directories.push(directory);
  const userData = join(directory, "user-data");
  await mkdir(userData);
  const copiedSource = join(directory, basename(sourcePath));
  await copyFile(sourcePath, copiedSource);
  const revealPath = vi.fn();
  const copyText = vi.fn();
  const service = new ExistingRdlSidecarService({
    userDataPath: userData,
    schemaPath,
    platform: "darwin",
    ...(now ? { now } : {}),
    revealPath,
    copyText,
  });
  return { service, directory, userData, copiedSource, revealPath, copyText };
};

const selected = async (service: ExistingRdlSidecarService, path: string) => {
  const result = await service.selectPath(path);
  expect(result.status).toBe("selected");
  if (result.status !== "selected") throw new Error("Selection failed");
  return result;
};

const planned = async (
  service: ExistingRdlSidecarService,
  reportSessionId: string,
  request = canonicalRequest,
) => {
  const result = await service.planEdit({ reportSessionId, request });
  expect(result.status).toBe("planned");
  if (result.status !== "planned") throw new Error(result.message);
  return result;
};

describe("native selection and report sessions", () => {
  it("returns cancellation without creating a session", async () => {
    const { service } = await setup();
    await expect(service.selectPath(null)).resolves.toEqual({
      status: "cancelled",
    });
  });

  it("resolves a real path and returns only a sanitized summary", async () => {
    const { service, directory, copiedSource } = await setup();
    const link = join(directory, "selected.rdl");
    await symlink(copiedSource, link);
    const result = await selected(service, link);
    expect(result.reportSessionId).toMatch(/^[a-f0-9-]{36}$/u);
    expect(result.summary).toMatchObject({
      filename: basename(copiedSource),
      sourceSha256: sourceSha,
      namespaceVersion: "2016/01",
      datasetNames: ["SeedData"],
      fieldCount: 9,
      tablixNames: ["Tablix1"],
      groupNames: ["Region", "Region1", "Details"],
      textboxCount: 42,
      pageOrientation: "portrait",
      currentTitle: "Regional Sales Subtotal Compatibility Test",
    });
    expect(JSON.stringify(result)).not.toMatch(
      /Central|DataGrid|<Report|CommandText/iu,
    );
  });

  it("rejects non-RDL, directory, oversized, and invalid XML selections", async () => {
    const { service, directory } = await setup();
    const text = join(directory, "report.txt");
    await writeFile(text, "not rdl");
    expect((await service.selectPath(text)).status).toBe("error");
    expect((await service.selectPath(directory)).status).toBe("error");
    const large = join(directory, "large.rdl");
    await writeFile(large, Buffer.alloc(20 * 1024 * 1024 + 1));
    expect((await service.selectPath(large)).status).toBe("error");
    const invalid = join(directory, "invalid.rdl");
    await writeFile(invalid, "<Report>");
    expect((await service.selectPath(invalid)).status).toBe("error");
  });

  it("rejects unknown and expired sessions", async () => {
    let time = 1_000;
    const { service, copiedSource } = await setup(() => time);
    const selection = await selected(service, copiedSource);
    expect(
      (
        await service.planEdit({
          reportSessionId: "11111111-1111-4111-8111-111111111111",
          request: canonicalRequest,
        })
      ).status,
    ).toBe("error");
    time += 31 * 60 * 1000;
    const expired = await service.planEdit({
      reportSessionId: selection.reportSessionId,
      request: canonicalRequest,
    });
    expect(expired).toMatchObject({
      status: "error",
      code: "REPORT_SESSION_EXPIRED",
    });
  });

  it("clears sessions explicitly and when a new report is selected", async () => {
    const { service, directory, copiedSource } = await setup();
    const first = await selected(service, copiedSource);
    const secondSource = join(directory, "second.rdl");
    await copyFile(sourcePath, secondSource);
    await selected(service, secondSource);
    expect(
      await service.planEdit({
        reportSessionId: first.reportSessionId,
        request: canonicalRequest,
      }),
    ).toMatchObject({ status: "error", code: "REPORT_SESSION_NOT_FOUND" });
    service.clearAllSessions();
  });
});

describe("planning and plan-session security", () => {
  it("produces the canonical proposal and exact target evidence without writing", async () => {
    const { service, copiedSource, userData } = await setup();
    const selection = await selected(service, copiedSource);
    const result = await planned(service, selection.reportSessionId);
    expect(result.planSha256).toBe(planSha);
    expect(result.proposal).toContain("Format Revenue displays as C0.");
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
    await expect(readFile(join(userData, "edited-reports"))).rejects.toThrow();
    expect(JSON.stringify(result)).not.toContain("HeaderRevenue");
  });

  it.each([['Change the title to "Safe" and add a chart.'], ["Add a chart."]])(
    "rejects unsupported and partial requests",
    async (request) => {
      const { service, copiedSource } = await setup();
      const selection = await selected(service, copiedSource);
      expect(
        await service.planEdit({
          reportSessionId: selection.reportSessionId,
          request,
        }),
      ).toMatchObject({ status: "error", code: "PLANNER_REJECTED" });
    },
  );

  it("preserves Unicode titles and enforces UTF-8 byte size", async () => {
    const { service, copiedSource } = await setup();
    const selection = await selected(service, copiedSource);
    const unicode = await planned(
      service,
      selection.reportSessionId,
      "Change the title to “Northwind Field Sales — July 2026”.",
    );
    expect(unicode.proposal[0]).toContain("Northwind Field Sales — July 2026");
    expect(
      await service.planEdit({
        reportSessionId: selection.reportSessionId,
        request: "—".repeat(3_000),
      }),
    ).toMatchObject({ status: "error", code: "REQUEST_TOO_LARGE" });
  });

  it("new planning and cancellation invalidate old plans", async () => {
    const { service, copiedSource } = await setup();
    const selection = await selected(service, copiedSource);
    const first = await planned(service, selection.reportSessionId);
    await planned(
      service,
      selection.reportSessionId,
      'Change the title to "Second".',
    );
    expect(
      await service.applyEdit({
        reportSessionId: selection.reportSessionId,
        planSessionId: first.planSessionId,
      }),
    ).toMatchObject({ status: "error", code: "PLAN_SESSION_NOT_FOUND" });
    const third = await planned(
      service,
      selection.reportSessionId,
      'Change the title to "Third".',
    );
    service.cancelPlan(third.planSessionId);
    expect(
      await service.applyEdit({
        reportSessionId: selection.reportSessionId,
        planSessionId: third.planSessionId,
      }),
    ).toMatchObject({ status: "error", code: "PLAN_SESSION_NOT_FOUND" });
  });
});

describe("apply, manifest, and output handles", () => {
  it("applies byte-identically, records Electron context, and is single-use", async () => {
    const { service, copiedSource } = await setup();
    const before = await readFile(copiedSource);
    const selection = await selected(service, copiedSource);
    const plan = await planned(service, selection.reportSessionId);
    const result = await service.applyEdit({
      reportSessionId: selection.reportSessionId,
      planSessionId: plan.planSessionId,
    });
    expect(result.status).toBe("complete");
    if (result.status !== "complete") throw new Error(result.message);
    expect(result).toMatchObject({
      sourceSha256: sourceSha,
      planSha256: planSha,
      outputSha256: outputSha,
      sourceUnchanged: true,
      validation: "PASS",
    });
    const outputDirectory = join(
      dirname(copiedSource),
      "user-data/edited-reports",
    );
    const output = join(outputDirectory, result.editedFilename);
    expect(await readFile(output)).toEqual(await readFile(expectedPath));
    const manifest = sidecarAuditManifestSchema.parse(
      JSON.parse(
        await readFile(join(outputDirectory, result.manifestFilename), "utf8"),
      ),
    );
    expect(manifest.invocationSurface).toBe("electron-sidecar");
    expect(await readFile(copiedSource)).toEqual(before);
    expect(
      await service.applyEdit({
        reportSessionId: selection.reportSessionId,
        planSessionId: plan.planSessionId,
      }),
    ).toMatchObject({ status: "error", code: "PLAN_ALREADY_APPLIED" });
  });

  it("rejects source changes before apply and leaves no output", async () => {
    const { service, copiedSource, userData } = await setup();
    const selection = await selected(service, copiedSource);
    const plan = await planned(service, selection.reportSessionId);
    await writeFile(
      copiedSource,
      Buffer.concat([await readFile(copiedSource), Buffer.from(" ")]),
    );
    expect(
      await service.applyEdit({
        reportSessionId: selection.reportSessionId,
        planSessionId: plan.planSessionId,
      }),
    ).toMatchObject({ status: "error", code: "SOURCE_CHANGED" });
    await expect(readFile(join(userData, "edited-reports"))).rejects.toThrow();
  });

  it("uses trusted output handles for reveal and copy actions", async () => {
    const { service, copiedSource, revealPath, copyText } = await setup();
    const selection = await selected(service, copiedSource);
    const plan = await planned(service, selection.reportSessionId);
    const result = await service.applyEdit({
      reportSessionId: selection.reportSessionId,
      planSessionId: plan.planSessionId,
    });
    if (result.status !== "complete") throw new Error(result.message);
    expect(service.reveal(result.outputHandle)).toEqual({ status: "ok" });
    expect(service.copy(result.outputHandle, "rdl")).toEqual({ status: "ok" });
    expect(service.copy(result.outputHandle, "manifest")).toEqual({
      status: "ok",
    });
    expect(revealPath).toHaveBeenCalledOnce();
    expect(copyText).toHaveBeenCalledTimes(2);
    expect(
      service.reveal("11111111-1111-4111-8111-111111111111"),
    ).toMatchObject({ status: "error", code: "REVEAL_FAILED" });
  });

  it("returns platform-specific reveal labels", () => {
    expect(revealLabelForPlatform("darwin")).toBe("Reveal in Finder");
    expect(revealLabelForPlatform("win32")).toBe("Reveal in Explorer");
    expect(revealLabelForPlatform("linux")).toBe("Reveal in File Manager");
  });
});
