import { describe, expect, it } from "vitest";
import { generationRequestSchema, visibleGenerationError } from "./desktop-api";

describe("desktop generation IPC contract", () => {
  it("accepts only a bounded request string", () => {
    expect(generationRequestSchema.parse({ request: "safe" })).toEqual({
      request: "safe",
    });
    expect(() => generationRequestSchema.parse({ request: "" })).toThrow();
    expect(() =>
      generationRequestSchema.parse({ request: "safe", outputPath: "../x" }),
    ).toThrow();
  });

  it("exposes validation errors as visible renderer text", () => {
    expect(
      visibleGenerationError({ status: "error", message: "Invalid request" }),
    ).toBe("Invalid request");
  });
});
