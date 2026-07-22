import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");

describe("production preload output", () => {
  it("is self-contained apart from Electron and retains hardened window settings", () => {
    execFileSync("pnpm", ["--filter", "@powerbi-copilot/desktop", "build"], {
      cwd: repositoryRoot,
      stdio: "pipe",
    });
    const preload = readFileSync(
      resolve(repositoryRoot, "apps/desktop/out/preload/index.js"),
      "utf8",
    );
    expect(preload).toContain('require("electron")');
    expect(preload).not.toMatch(/require\(["']zod["']\)/u);
    expect(preload).not.toContain('from "zod"');
    expect(preload).toContain('exposeInMainWorld("powerBiCopilot"');
    expect(preload).toContain('generateReport: "report:generate"');
    expect(preload).toContain(
      "generateReport: (request) => electron.ipcRenderer.invoke(channels.generateReport",
    );

    const main = readFileSync(
      resolve(repositoryRoot, "apps/desktop/src/main/index.ts"),
      "utf8",
    );
    expect(main).toContain("generationRequestSchema.safeParse(input)");
    expect(main).toContain("contextIsolation: true");
    expect(main).toContain("nodeIntegration: false");
    expect(main).toContain("sandbox: true");
  });
});
