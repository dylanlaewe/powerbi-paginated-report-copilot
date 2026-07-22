import { describe, expect, it, vi } from "vitest";
import {
  bridgeUnavailableMessage,
  generationFailedMessage,
  runGeneration,
} from "./generation-ui";

describe("renderer generation failure recovery", () => {
  it("shows an initialization error and remains usable without a bridge", async () => {
    const busy = vi.fn();
    const result = vi.fn();
    await runGeneration(undefined, "request", busy, result);
    expect(result).toHaveBeenCalledWith({
      status: "error",
      message: bridgeUnavailableMessage,
    });
    expect(busy).toHaveBeenLastCalledWith(false);
  });

  it("catches rejected IPC and always clears busy state", async () => {
    const busy = vi.fn();
    const result = vi.fn();
    await runGeneration(
      { generateReport: vi.fn().mockRejectedValue(new Error("raw stack")) },
      "request",
      busy,
      result,
    );
    expect(busy.mock.calls).toEqual([[true], [false]]);
    expect(result).toHaveBeenCalledWith({
      status: "error",
      message: generationFailedMessage,
    });
  });
});
