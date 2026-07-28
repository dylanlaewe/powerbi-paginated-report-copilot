import { describe, expect, it } from "vitest";
import {
  applyEditRequestSchema,
  generationRequestSchema,
  outputHandleRequestSchema,
  planEditRequestSchema,
  visibleGenerationError,
} from "./desktop-api";

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

describe("existing RDL sidecar IPC contract", () => {
  const reportSessionId = "11111111-1111-4111-8111-111111111111";
  const planSessionId = "22222222-2222-4222-8222-222222222222";
  it("accepts only opaque handles and a bounded request", () => {
    expect(
      planEditRequestSchema.parse({ reportSessionId, request: "safe" }),
    ).toEqual({ reportSessionId, request: "safe" });
    expect(() =>
      planEditRequestSchema.parse({
        reportSessionId,
        request: "safe",
        editPlan: { operations: [] },
      }),
    ).toThrow();
    expect(() =>
      applyEditRequestSchema.parse({
        reportSessionId,
        planSessionId,
        outputPath: "/tmp/x",
      }),
    ).toThrow();
    expect(() =>
      applyEditRequestSchema.parse({
        reportSessionId,
        planSessionId,
        candidateId: "33333333-3333-4333-8333-333333333333",
      }),
    ).toThrow();
    for (const forbidden of [
      { structuralPath: "section[0]/body/Textbox(Title)" },
      { reportItemName: "ReportTitle" },
      { diagnosticId: "deterministic-diagnostic-id" },
      { titleResolution: { status: "resolved" } },
    ])
      expect(() =>
        applyEditRequestSchema.parse({
          reportSessionId,
          planSessionId,
          ...forbidden,
        }),
      ).toThrow();
    expect(() =>
      outputHandleRequestSchema.parse({
        outputHandle: planSessionId,
        path: "/tmp/x",
      }),
    ).toThrow();
  });
});
