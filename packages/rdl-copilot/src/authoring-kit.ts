import { z } from "zod";

const fieldSchema = z
  .object({
    name: z.string().regex(/^[A-Za-z][A-Za-z0-9]*$/u),
    dataType: z.enum(["String", "Int32", "Decimal", "DateTime"]),
  })
  .strict();

const datasetSchema = z
  .object({
    name: z.string().regex(/^[A-Za-z][A-Za-z0-9]*$/u),
    dataRelativePath: z
      .string()
      .regex(/^[a-z0-9-]+\/authoring-kit\/[a-z0-9-]+\.tsv$/u),
    rowCount: z.number().int().positive(),
    fields: z.array(fieldSchema).min(1),
  })
  .strict()
  .superRefine(({ fields }, context) => {
    if (new Set(fields.map(({ name }) => name)).size !== fields.length)
      context.addIssue({
        code: "custom",
        message: "Dataset field names must be unique",
      });
  });

const expectedTotalsSchema = z.record(
  z.string().min(1),
  z.union([
    z.number().finite(),
    z.record(z.string().min(1), z.number().finite()),
  ]),
);

const authoringFixtureSchema = z
  .object({
    id: z.enum([
      "simple-table",
      "grouped-report",
      "parameterized-report",
      "alternate-layout",
    ]),
    order: z.number().int().min(1).max(4),
    sourceRelativePath: z
      .string()
      .regex(/^[a-z0-9-]+\/source\/[a-z0-9-]+\.rdl$/u),
    instructionsRelativePath: z
      .string()
      .regex(/^[a-z0-9-]+\/authoring-kit\/README\.md$/u),
    validationWorksheetRelativePath: z
      .string()
      .regex(/^[a-z0-9-]+\/authoring-kit\/source-validation\.md$/u),
    datasets: z.array(datasetSchema).min(1),
    expectedTotals: expectedTotalsSchema,
  })
  .strict();

export const rdlAuthoringKitSchema = z
  .object({
    kitVersion: z.literal(1),
    milestone: z.literal("RDL Structure Corpus and Resolver Validation v0.3"),
    gate: z.literal("2A"),
    status: z.literal("AUTHORING_KIT_ONLY"),
    author: z.literal("Dylan Laewe"),
    authoringApplication: z.literal("Microsoft Power BI Report Builder"),
    authoringEnvironment: z.literal(
      "personally controlled Windows 11 Parallels VM",
    ),
    sourceCreationPolicy: z
      .object({
        startFromBlankReport: z.literal(true),
        enterDataOnly: z.literal(true),
        personallyAuthored: z.literal(true),
        syntheticOnly: z.literal(true),
        credentialsAllowed: z.literal(false),
        companyOrCustomerSourceAllowed: z.literal(false),
        copiedLayoutAllowed: z.literal(false),
        databaseConnectionRequired: z.literal(false),
        sourceRdlIncludedInGate2A: z.literal(false),
      })
      .strict(),
    fixtures: z
      .array(authoringFixtureSchema)
      .length(4)
      .superRefine((fixtures, context) => {
        const expectedOrder = [
          "simple-table",
          "grouped-report",
          "parameterized-report",
          "alternate-layout",
        ];
        if (
          fixtures.some(
            ({ id, order }, index) =>
              id !== expectedOrder[index] || order !== index + 1,
          )
        )
          context.addIssue({
            code: "custom",
            message: "Fixtures must retain the approved authoring order",
          });
        const paths = fixtures.flatMap((fixture) => [
          fixture.sourceRelativePath,
          fixture.instructionsRelativePath,
          fixture.validationWorksheetRelativePath,
          ...fixture.datasets.map(({ dataRelativePath }) => dataRelativePath),
        ]);
        if (new Set(paths).size !== paths.length)
          context.addIssue({
            code: "custom",
            message: "Authoring-kit paths must be unique",
          });
      }),
  })
  .strict();

export type RdlAuthoringKit = z.infer<typeof rdlAuthoringKitSchema>;
