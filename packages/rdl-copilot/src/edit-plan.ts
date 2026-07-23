import { z } from "zod";

const reportTitleTargetSchema = z
  .object({
    kind: z.literal("reportItem"),
    semanticRole: z.literal("reportTitle"),
  })
  .strict();

const fieldDisplayTargetSchema = z
  .object({
    kind: z.literal("fieldDisplay"),
    fieldName: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/u),
  })
  .strict();

const setTextOperationSchema = z
  .object({
    type: z.literal("setText"),
    target: reportTitleTargetSchema,
    value: z.string().min(1).max(256),
  })
  .strict();

const fontSizeSchema = z
  .string()
  .regex(/^[0-9]+(?:\.[0-9]+)?pt$/u)
  .refine((value) => {
    const points = Number.parseFloat(value);
    return points >= 1 && points <= 100;
  }, "Font size must be 1pt through 100pt");

const setTextStyleOperationSchema = z
  .object({
    type: z.literal("setTextStyle"),
    target: reportTitleTargetSchema,
    fontSize: fontSizeSchema.optional(),
    fontWeight: z.enum(["Normal", "Bold"]).optional(),
    textAlign: z.enum(["Left", "Center", "Right", "General"]).optional(),
  })
  .strict()
  .refine(
    ({ fontSize, fontWeight, textAlign }) =>
      fontSize !== undefined ||
      fontWeight !== undefined ||
      textAlign !== undefined,
    "At least one text style property is required",
  );

const setPageOrientationOperationSchema = z
  .object({
    type: z.literal("setPageOrientation"),
    orientation: z.enum(["portrait", "landscape"]),
  })
  .strict();

const setNumberFormatOperationSchema = z
  .object({
    type: z.literal("setNumberFormat"),
    target: fieldDisplayTargetSchema,
    format: z.enum(["C0", "C2", "N0", "N2", "P0", "P2"]),
  })
  .strict();

export const editOperationSchema = z.discriminatedUnion("type", [
  setTextOperationSchema,
  setTextStyleOperationSchema,
  setPageOrientationOperationSchema,
  setNumberFormatOperationSchema,
]);

export const editPlanSchema = z
  .object({
    version: z.literal(1),
    operations: z.array(editOperationSchema).min(1).max(16),
  })
  .strict()
  .superRefine(({ operations }, context) => {
    const singletonTypes = new Set<string>();
    const formattedFields = new Set<string>();
    for (const [index, operation] of operations.entries()) {
      if (operation.type === "setNumberFormat") {
        const normalizedField =
          operation.target.fieldName.toLocaleLowerCase("en-US");
        if (formattedFields.has(normalizedField))
          context.addIssue({
            code: "custom",
            message: `Duplicate or conflicting setNumberFormat operation for ${operation.target.fieldName}`,
            path: ["operations", index, "target", "fieldName"],
          });
        formattedFields.add(normalizedField);
        continue;
      }
      if (singletonTypes.has(operation.type))
        context.addIssue({
          code: "custom",
          message: `Duplicate or conflicting ${operation.type} operation`,
          path: ["operations", index, "type"],
        });
      singletonTypes.add(operation.type);
    }
  });

export type EditPlan = z.infer<typeof editPlanSchema>;
export type EditOperation = z.infer<typeof editOperationSchema>;

export const canonicalGate2EditPlan: EditPlan = editPlanSchema.parse({
  version: 1,
  operations: [
    {
      type: "setText",
      target: { kind: "reportItem", semanticRole: "reportTitle" },
      value: "Weekly Sales Pipeline",
    },
    {
      type: "setTextStyle",
      target: { kind: "reportItem", semanticRole: "reportTitle" },
      fontSize: "18pt",
      fontWeight: "Bold",
    },
    { type: "setPageOrientation", orientation: "landscape" },
    {
      type: "setNumberFormat",
      target: { kind: "fieldDisplay", fieldName: "Revenue" },
      format: "C0",
    },
  ],
});
