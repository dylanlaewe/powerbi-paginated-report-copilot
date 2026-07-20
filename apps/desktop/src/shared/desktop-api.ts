import type { PowerBiProject } from "@powerbi-copilot/domain";
import { z } from "zod";
export const ipcChannels = { selectProject: "project:select" } as const;
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
export interface DesktopApi {
  readonly platform: string;
  readonly appMode: "offline-authoring";
  readonly windowsValidation: "pending";
  selectProject(): Promise<ProjectSelectionResult>;
}
