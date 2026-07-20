import { z } from "zod";

export const projectFormatSchema = z.object({
  pbip: z.boolean(),
  pbir: z.boolean(),
  tmdl: z.boolean(),
});
export type ProjectFormat = z.infer<typeof projectFormatSchema>;

export const projectPathsSchema = z.object({
  root: z.string().min(1),
  pbipFile: z.string().min(1),
  reportDirectory: z.string().min(1),
  semanticModelDirectory: z.string().min(1),
});
export type ProjectPaths = z.infer<typeof projectPathsSchema>;

export const powerBiProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  paths: projectPathsSchema,
  format: projectFormatSchema,
});
export type PowerBiProject = z.infer<typeof powerBiProjectSchema>;
