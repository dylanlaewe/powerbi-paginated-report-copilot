import { describe, expect, it } from "vitest";
import { powerBiProjectSchema } from "./index";

describe("powerBiProjectSchema", () => {
  it("rejects incomplete file-derived project data", () => {
    expect(() => powerBiProjectSchema.parse({ name: "Sales" })).toThrow();
  });
});
