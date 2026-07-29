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
        reportBuilderValidation: z.enum([
          "pending Gate 2",
          "PASS Gate 2B",
          "PASS Gate 2C",
        ]),
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
        preview: z.enum(["pending Gate 2", "PASS — 1 page", "PASS — 4 pages"]),
        pdf: z.enum(["pending Gate 2", "PASS — 1 page", "PASS — 4 pages"]),
        excel: z.enum([
          "pending Gate 2",
          "PASS — 1 worksheet",
          "PASS — 4 worksheets",
        ]),
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
      fixture.provenance.reportBuilderValidation.startsWith("PASS Gate 2")
    )
      context.addIssue({
        code: "custom",
        message: "Report Builder provenance must match fixture status",
      });
  });

const invoiceExternalFixtureSchema = z
  .object({
    id: z.literal("microsoft-invoice"),
    name: z.literal("Microsoft Reporting Services Invoice"),
    sourceKind: z.literal("externalPinnedCompatibilityFixture"),
    status: z.literal("staticallyValidated"),
    canonicalSourceRelativePath: z
      .string()
      .endsWith("imported/invoice/source/Invoice.rdl"),
    upstream: z
      .object({
        repository: z.literal(
          "https://github.com/microsoft/Reporting-Services.git",
        ),
        branch: z.literal("master"),
        commit: z.literal("acc2ee0d1884765e4b5213149430fb063d166719"),
        sourcePath: z.literal("PaginatedReportSamples/Invoice.rdl"),
      })
      .strict(),
    byteSize: z.literal(222_297),
    sha256: z.literal(
      "6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc",
    ),
    namespace: z.literal(
      "http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition",
    ),
    license: z
      .object({
        name: z.literal("MIT"),
        copyright: z.literal("Copyright (c) 2016 Microsoft"),
        licenseSha256: z.literal(
          "e1406b32500b4622444e91ec3b50a473b97c5c4470b7b1f137c36abcfb248b59",
        ),
        noticeRelativePath: z.string().endsWith("LICENSE.microsoft.txt"),
      })
      .strict(),
    reportBuilderValidation: z.literal("NOT_PERFORMED"),
    purpose: z.array(z.string().min(1)).min(1),
  })
  .strict();

const transcriptExternalFixtureSchema = z
  .object({
    id: z.literal("microsoft-transcript"),
    name: z.literal("Microsoft Reporting Services Transcript"),
    sourceKind: z.literal("externalPinnedCompatibilityFixture"),
    status: z.literal("staticallyValidated"),
    canonicalSourceRelativePath: z
      .string()
      .endsWith("imported/transcript/source/Transcript.rdl"),
    upstream: z
      .object({
        repository: z.literal(
          "https://github.com/microsoft/Reporting-Services.git",
        ),
        branch: z.literal("master"),
        commit: z.literal("acc2ee0d1884765e4b5213149430fb063d166719"),
        sourcePath: z.literal("PaginatedReportSamples/Transcript.rdl"),
      })
      .strict(),
    byteSize: z.literal(116_709),
    sha256: z.literal(
      "9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81",
    ),
    namespace: z.literal(
      "http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition",
    ),
    license: z
      .object({
        name: z.literal("MIT"),
        copyright: z.literal("Copyright (c) 2016 Microsoft"),
        licenseSha256: z.literal(
          "e1406b32500b4622444e91ec3b50a473b97c5c4470b7b1f137c36abcfb248b59",
        ),
        noticeRelativePath: z.string().endsWith("LICENSE.microsoft.txt"),
      })
      .strict(),
    reportBuilderValidation: z.literal("NOT_PERFORMED"),
    purpose: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const rdlStructureCorpusIndexSchema = z
  .object({
    corpusVersion: z.literal(1),
    milestone: z.literal("RDL Structure Corpus and Resolver Validation v0.3"),
    gate: z.union([
      z.literal(1),
      z.literal("2B"),
      z.literal("2C"),
      z.literal("2E"),
      z.literal("2F"),
    ]),
    status: z.enum([
      "DESIGN_ONLY",
      "SIMPLE_TABLE_VALIDATED",
      "GROUPED_REPORT_VALIDATED",
      "INVOICE_IMPORTED_STATICALLY",
      "TRANSCRIPT_IMPORTED_STATICALLY",
    ]),
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
    externalFixtureCount: z.literal(2),
    externalFixtures: z.tuple([
      invoiceExternalFixtureSchema,
      transcriptExternalFixtureSchema,
    ]),
  })
  .strict();

export type RdlStructureCorpusIndex = z.infer<
  typeof rdlStructureCorpusIndexSchema
>;
