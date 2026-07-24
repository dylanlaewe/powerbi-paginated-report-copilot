import { beforeEach, describe, expect, it, vi } from "vitest";

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();
vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: { invoke },
}));

describe("sandboxed preload bridge", () => {
  beforeEach(() => {
    exposeInMainWorld.mockClear();
    invoke.mockReset();
  });

  it("initializes and exposes only narrow wrapper methods", async () => {
    await import("./index");
    expect(exposeInMainWorld).toHaveBeenCalledOnce();
    const [name, api] = exposeInMainWorld.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe("powerBiCopilot");
    expect(Object.keys(api).sort()).toEqual([
      "appMode",
      "applyExistingRdlEdit",
      "cancelExistingRdlPlan",
      "clearExistingRdlSession",
      "copyEditedRdlPath",
      "copyGeneratedPath",
      "copyManifestPath",
      "generateReport",
      "planExistingRdlEdit",
      "platform",
      "revealEditedRdl",
      "revealGeneratedReport",
      "selectExistingRdl",
      "selectProject",
      "windowsValidation",
    ]);
    expect(api.generateReport).toBeTypeOf("function");
    invoke.mockResolvedValue({ status: "error", message: "validated in main" });
    await (api.generateReport as (request: string) => Promise<unknown>)(
      "request",
    );
    expect(invoke).toHaveBeenCalledWith("report:generate", {
      request: "request",
    });
    await (api.planExistingRdlEdit as (input: unknown) => Promise<unknown>)({
      reportSessionId: "opaque",
      request: "safe",
    });
    expect(invoke).toHaveBeenLastCalledWith("sidecar:plan-edit", {
      reportSessionId: "opaque",
      request: "safe",
    });
    expect(api).not.toHaveProperty("invoke");
    expect(api).not.toHaveProperty("ipcRenderer");
  });
});
