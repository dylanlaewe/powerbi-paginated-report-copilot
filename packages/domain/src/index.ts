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

export const rdlDetailFields = [
  "SaleDate",
  "Region",
  "Salesperson",
  "Customer",
  "Product",
  "Category",
  "Quantity",
  "Revenue",
  "GrossProfit",
] as const;

export const rdlDatasetRowSchema = z.object({
  SaleDate: z.iso.date(),
  Region: z.string().trim().min(1),
  Salesperson: z.string().trim().min(1),
  Customer: z.string().trim().min(1),
  Product: z.string().trim().min(1),
  Category: z.string().trim().min(1),
  Quantity: z.number().int().nonnegative(),
  Revenue: z.number().finite(),
  GrossProfit: z.number().finite(),
});
export type RdlDatasetRow = z.infer<typeof rdlDatasetRowSchema>;

export const rdlReportSpecificationSchema = z.object({
  version: z.literal(1),
  template: z.literal("production-pagination-letter"),
  title: z.string().trim().min(1).max(120),
  fields: z.tuple([
    z.literal("SaleDate"),
    z.literal("Region"),
    z.literal("Salesperson"),
    z.literal("Customer"),
    z.literal("Product"),
    z.literal("Category"),
    z.literal("Quantity"),
    z.literal("Revenue"),
    z.literal("GrossProfit"),
  ]),
  labels: z.object({
    regionSubtotal: z.literal("Region Total"),
    grandTotal: z.literal("Grand Total"),
  }),
  rows: z.array(rdlDatasetRowSchema).min(1).max(500),
});
export type RdlReportSpecification = z.infer<
  typeof rdlReportSpecificationSchema
>;
