import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const sourcePath = new URL("./src.tsx", import.meta.url);
const stylePath = new URL("./style.css", import.meta.url);

describe("existing RDL sidecar renderer", () => {
  it("implements every required recoverable state and explicit apply review", async () => {
    const source = await readFile(sourcePath, "utf8");
    for (const state of [
      '"empty"',
      '"selecting"',
      '"inspected"',
      '"planning"',
      '"rejected"',
      '"ready"',
      '"applying"',
      '"complete"',
      '"error"',
    ])
      expect(source).toContain(state);
    expect(source).toContain("The original report will not be modified.");
    expect(source).toContain("Review Changes");
    expect(source).toContain("Apply Changes");
    expect(source).toContain("PRELOAD_BRIDGE_UNAVAILABLE");
    expect(source).toContain("IPC_REJECTED");
    expect(source).not.toContain("editPlan:");
    expect(source).not.toContain("outputPath:");
    expect(source).not.toContain("target:");
  });

  it("keeps long requests, proposals, and hashes readable in a narrow resizable window", async () => {
    const [source, style] = await Promise.all([
      readFile(sourcePath, "utf8"),
      readFile(stylePath, "utf8"),
    ]);
    expect(source).toContain("textarea");
    expect(source).toContain("resolvedTargets.map");
    expect(style).toContain("overflow-wrap: anywhere");
    expect(style).toContain("word-break: break-all");
    expect(style).toContain("min-width: 420px");
  });

  it("uses the trusted platform reveal label and opaque output handle", async () => {
    const source = await readFile(sourcePath, "utf8");
    expect(source).toContain("{selection.revealLabel}");
    expect(source).toContain("outputHandle: complete.outputHandle");
    expect(source).not.toContain("Reveal in Finder");
    expect(source).not.toContain("Reveal in Explorer");
  });
});
