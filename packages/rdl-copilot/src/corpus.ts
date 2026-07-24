import { z } from "zod";
import { editPlanSchema } from "./edit-plan";

const proposedCountSchema = z.number().int().nonnegative().nullable();

const targetExpectationSchema = z
  .object({
    semanticTarget: z.string().min(1),
    expectedReportItemNames: z.array(z.string().min(1)).min(1),
    expectedClassifications: z
      .array(z.enum(["detail", "groupSubtotal", "grandTotal"]))
      .min(1),
    evidencePlan: z.array(z.string().min(1)).min(1),
  })
  .strict()
  .refine(
    ({ expectedReportItemNames, expectedClassifications }) =>
      expectedReportItemNames.length === expectedClassifications.length,
    "Every expected field display must have one classification",
  );

const corpusFixtureSchema = z
  .object({
    id: z.enum([
      "simple-table",
      "grouped-report",
      "parameterized-report",
      "alternate-layout",
    ]),
    name: z.string().min(1),
    description: z.string().min(1),
    structuralCategory: z.enum([
      "simpleTable",
      "groupedReport",
      "multiDatasetOrParameterized",
      "alternateLayout",
    ]),
    status: z.enum(["proposed", "authoredValidated"]),
    sourceRelativePath: z.string().endsWith(".rdl"),
    sourceSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/u)
      .nullable(),
    namespace: z.string().url().nullable(),
    provenance: z
      .object({
        authoringApplication: z.literal("Microsoft Power BI Report Builder"),
        author: z.literal("Dylan Laewe"),
        method: z.string().min(1),
        ownership: z.literal("personally authored synthetic fixture"),
        license: z.literal("MIT"),
        reportBuilderValidation: z.enum(["pending Gate 2", "PASS Gate 2B"]),
      })
      .strict(),
    syntheticDataDesign: z
      .object({
        datasets: z.array(
          z
            .object({
              name: z.string().min(1),
              fields: z.array(z.string().min(1)).min(1),
              rowCount: z.number().int().positive(),
              purpose: z.string().min(1),
            })
            .strict(),
        ),
        containsCredentials: z.literal(false),
        containsProprietaryContent: z.literal(false),
      })
      .strict(),
    anticipatedCounts: z
      .object({
        datasets: proposedCountSchema,
        parameters: proposedCountSchema,
        tablixes: proposedCountSchema,
        groups: proposedCountSchema,
        textboxes: proposedCountSchema,
        reportSections: proposedCountSchema,
      })
      .strict(),
    anticipatedOrientation: z.enum(["portrait", "landscape"]),
    expectedTitle: z
      .object({
        reportItemName: z.string().min(1),
        location: z.enum(["body", "pageHeader", "rectangle"]),
        evidencePlan: z.array(z.string().min(1)).min(1),
        ambiguityRisks: z.array(z.string().min(1)),
      })
      .strict(),
    expectedFieldDisplays: z.array(targetExpectationSchema).min(1),
    anticipatedResolution: z
      .object({
        mode: z.enum(["generic", "profileReviewPending", "notEvaluated"]),
        rationale: z.string().min(1),
      })
      .strict(),
    editScenario: z
      .object({
        requestRelativePath: z.string().endsWith(".txt"),
        request: z.string().min(1),
        expectedPlan: editPlanSchema,
      })
      .strict(),
    reportBuilderBaseline: z
      .object({
        open: z.enum(["pending Gate 2", "PASS"]),
        preview: z.enum(["pending Gate 2", "PASS — 1 page"]),
        pdf: z.enum(["pending Gate 2", "PASS — 1 page"]),
        excel: z.enum(["pending Gate 2", "PASS — 1 worksheet"]),
      })
      .strict(),
  })
  .strict()
  .superRefine((fixture, context) => {
    const accepted = fixture.status === "authoredValidated";
    if (accepted !== Boolean(fixture.sourceSha256 && fixture.namespace))
      context.addIssue({
        code: "custom",
        message:
          "Authored fixtures require source identity; proposed fixtures must keep it null",
      });
    if (
      accepted !==
      (fixture.provenance.reportBuilderValidation === "PASS Gate 2B")
    )
      context.addIssue({
        code: "custom",
        message: "Report Builder provenance must match fixture status",
      });
  });

export const rdlStructureCorpusIndexSchema = z
  .object({
    corpusVersion: z.literal(1),
    milestone: z.literal("RDL Structure Corpus and Resolver Validation v0.3"),
    gate: z.union([z.literal(1), z.literal("2B")]),
    status: z.enum(["DESIGN_ONLY", "SIMPLE_TABLE_VALIDATED"]),
    frozenOperations: z.tuple([
      z.literal("setText"),
      z.literal("setTextStyle"),
      z.literal("setPageOrientation"),
      z.literal("setNumberFormat"),
    ]),
    fixtureCount: z.literal(4),
    fixtures: z
      .array(corpusFixtureSchema)
      .length(4)
      .superRefine((fixtures, context) => {
        if (new Set(fixtures.map(({ id }) => id)).size !== fixtures.length)
          context.addIssue({
            code: "custom",
            message: "Corpus fixture IDs must be unique",
          });
        if (
          new Set(fixtures.map(({ structuralCategory }) => structuralCategory))
            .size !== fixtures.length
        )
          context.addIssue({
            code: "custom",
            message: "Every required structural category must appear once",
          });
      }),
  })
  .strict();

export type RdlStructureCorpusIndex = z.infer<
  typeof rdlStructureCorpusIndexSchema
>;
