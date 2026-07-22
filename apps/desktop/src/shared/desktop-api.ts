import type { PowerBiProject } from "@powerbi-copilot/domain";
import { z } from "zod";
export const ipcChannels = {
  selectProject: "project:select",
  generateReport: "report:generate",
  revealGeneratedReport: "report:reveal",
  copyGeneratedPath: "report:copy-path",
} as const;
export const projectSelectionResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("selected"),
    project: z.custom<PowerBiProject>(),
  }),
  z.object({ status: z.literal("cancelled") }),
  z.object({
    status: z.literal("error"),
    message: z.string(),
    code: z.string(),
  }),
]);
export type ProjectSelectionResult = z.infer<
  typeof projectSelectionResultSchema
>;
export const generationRequestSchema = z
  .object({
    request: z.string().min(1).max(100_000),
  })
  .strict();
const totalsSchema = z.object({
  Quantity: z.number(),
  Revenue: z.number(),
  GrossProfit: z.number(),
});
export const generationResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("generated"),
    title: z.string(),
    rowCount: z.number().int().positive(),
    regions: z.array(z.string()),
    regionSubtotals: z.record(z.string(), totalsSchema),
    grandTotal: totalsSchema,
    template: z.literal("production-pagination-letter"),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    outputPath: z.string().min(1),
  }),
  z.object({ status: z.literal("error"), message: z.string().min(1) }),
]);
export type GenerationResult = z.infer<typeof generationResultSchema>;
export const visibleGenerationError = (result: GenerationResult): string =>
  result.status === "error" ? result.message : "";
export interface DesktopApi {
  readonly platform: string;
  readonly appMode: "offline-authoring";
  readonly windowsValidation: "pending";
  selectProject(): Promise<ProjectSelectionResult>;
  generateReport(request: string): Promise<GenerationResult>;
  revealGeneratedReport(): Promise<void>;
  copyGeneratedPath(): Promise<void>;
}
