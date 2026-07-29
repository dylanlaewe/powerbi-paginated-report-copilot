import { createHash } from "node:crypto";
import { z } from "zod";
import { editPlanSchema, type EditPlan } from "./edit-plan";
import {
  createEditPlannerContext,
  editPlannerContextSchema,
  LocalSentenceEditPlanner,
  type EditPlannerContext,
} from "./edit-planner";
import type { RdlInventory } from "./inspection";

export const LLM_PLANNER_CONTRACT_VERSION = 1 as const;
export const SUBMIT_PLANNING_RESULT_TOOL = "submit_planning_result" as const;
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5" as const;
export const LLM_REQUEST_TIMEOUT_MS = 30_000;

export const llmErrorCodeSchema = z.enum([
  "LLM_NOT_CONFIGURED",
  "LLM_AUTHENTICATION_FAILED",
  "LLM_RATE_LIMITED",
  "LLM_TIMEOUT",
  "LLM_NETWORK_ERROR",
  "LLM_PROVIDER_ERROR",
  "LLM_INVALID_TOOL_RESULT",
  "LLM_SCHEMA_VALIDATION_FAILED",
  "LLM_MULTIPLE_RESULTS",
  "LLM_REQUEST_CANCELLED",
  "LLM_UNSUPPORTED_REQUEST",
  "LLM_CLARIFICATION_REQUIRED",
]);
export type LlmErrorCode = z.infer<typeof llmErrorCodeSchema>;

const unsupportedReasonSchema = z.enum([
  "OPERATION_NOT_SUPPORTED",
  "REQUEST_OUTSIDE_SCOPE",
  "UNSAFE_OR_PROHIBITED",
]);
const clarificationReasonSchema = z.enum([
  "REQUEST_AMBIGUOUS",
  "MISSING_TITLE_VALUE",
  "MISSING_FIELD_OR_FORMAT",
]);

export const llmPlanningResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("planned"), plan: editPlanSchema }).strict(),
  z
    .object({
      status: z.literal("unsupported"),
      reasonCode: unsupportedReasonSchema,
      explanation: z.string().trim().min(1).max(512),
      unsupportedFragments: z.array(z.string().trim().min(1).max(256)).max(16),
    })
    .strict(),
  z
    .object({
      status: z.literal("clarificationRequired"),
      question: z.string().trim().min(1).max(256),
      reasonCode: clarificationReasonSchema,
    })
    .strict(),
]);
export type LlmPlanningResult = z.infer<typeof llmPlanningResultSchema>;

export const sanitizedPlanningContextSchema = z
  .object({
    contractVersion: z.literal(LLM_PLANNER_CONTRACT_VERSION),
    availableFields: z.array(
      z
        .object({
          name: z.string().min(1).max(256),
          datasetAmbiguity: z.boolean(),
        })
        .strict(),
    ),
    titleCapability: z.enum(["available", "ambiguous", "notFound"]),
    pageDimensions: z.enum(["explicit", "omitted"]),
    currentOrientation: z.enum([
      "portrait",
      "landscape",
      "square",
      "unspecified",
    ]),
    availableFormatCodes: z.tuple([
      z.literal("C0"),
      z.literal("C2"),
      z.literal("N0"),
      z.literal("N2"),
      z.literal("P0"),
      z.literal("P2"),
    ]),
  })
  .strict();
export type SanitizedPlanningContext = z.infer<
  typeof sanitizedPlanningContextSchema
>;

export interface LlmPlannerProvider {
  readonly providerName: string;
  readonly model: string;
  plan(input: {
    request: string;
    context: SanitizedPlanningContext;
    signal?: AbortSignal;
    validationFeedback?: string;
  }): Promise<unknown>;
  testConnection(signal?: AbortSignal): Promise<void>;
}

export class LlmPlannerError extends Error {
  constructor(
    readonly code: LlmErrorCode,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "LlmPlannerError";
  }
}

export const submitPlanningResultInputSchema = {
  type: "object",
  additionalProperties: false,
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["status", "plan"],
      properties: {
        status: { const: "planned" },
        plan: {
          type: "object",
          additionalProperties: false,
          required: ["version", "operations"],
          properties: {
            version: { const: 1 },
            operations: {
              type: "array",
              minItems: 1,
              maxItems: 16,
              items: {
                oneOf: [
                  {
                    type: "object",
                    additionalProperties: false,
                    required: ["type", "target", "value"],
                    properties: {
                      type: { const: "setText" },
                      target: {
                        type: "object",
                        additionalProperties: false,
                        required: ["kind", "semanticRole"],
                        properties: {
                          kind: { const: "reportItem" },
                          semanticRole: { const: "reportTitle" },
                        },
                      },
                      value: { type: "string", minLength: 1, maxLength: 256 },
                    },
                  },
                  {
                    type: "object",
                    additionalProperties: false,
                    required: ["type", "target"],
                    properties: {
                      type: { const: "setTextStyle" },
                      target: {
                        type: "object",
                        additionalProperties: false,
                        required: ["kind", "semanticRole"],
                        properties: {
                          kind: { const: "reportItem" },
                          semanticRole: { const: "reportTitle" },
                        },
                      },
                      fontSize: {
                        type: "string",
                        pattern: "^[0-9]+(?:\\.[0-9]+)?pt$",
                      },
                      fontWeight: { enum: ["Normal", "Bold"] },
                      textAlign: {
                        enum: ["Left", "Center", "Right", "General"],
                      },
                    },
                  },
                  {
                    type: "object",
                    additionalProperties: false,
                    required: ["type", "orientation"],
                    properties: {
                      type: { const: "setPageOrientation" },
                      orientation: { enum: ["portrait", "landscape"] },
                    },
                  },
                  {
                    type: "object",
                    additionalProperties: false,
                    required: ["type", "target", "format"],
                    properties: {
                      type: { const: "setNumberFormat" },
                      target: {
                        type: "object",
                        additionalProperties: false,
                        required: ["kind", "fieldName"],
                        properties: {
                          kind: { const: "fieldDisplay" },
                          fieldName: {
                            type: "string",
                            pattern: "^[A-Za-z_][A-Za-z0-9_]*$",
                          },
                        },
                      },
                      format: { enum: ["C0", "C2", "N0", "N2", "P0", "P2"] },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["status", "reasonCode", "explanation", "unsupportedFragments"],
      properties: {
        status: { const: "unsupported" },
        reasonCode: {
          enum: [
            "OPERATION_NOT_SUPPORTED",
            "REQUEST_OUTSIDE_SCOPE",
            "UNSAFE_OR_PROHIBITED",
          ],
        },
        explanation: { type: "string", minLength: 1, maxLength: 512 },
        unsupportedFragments: {
          type: "array",
          maxItems: 16,
          items: { type: "string", minLength: 1, maxLength: 256 },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["status", "question", "reasonCode"],
      properties: {
        status: { const: "clarificationRequired" },
        question: { type: "string", minLength: 1, maxLength: 256 },
        reasonCode: {
          enum: [
            "REQUEST_AMBIGUOUS",
            "MISSING_TITLE_VALUE",
            "MISSING_FIELD_OR_FORMAT",
          ],
        },
      },
    },
  ],
} as const;

export const createSanitizedPlanningContext = (
  inventory: RdlInventory,
): SanitizedPlanningContext => {
  const local = createEditPlannerContext(inventory);
  const counts = new Map<string, number>();
  for (const name of inventory.datasets.flatMap(({ fields }) => fields))
    counts.set(name, (counts.get(name) ?? 0) + 1);
  return sanitizedPlanningContextSchema.parse({
    contractVersion: 1,
    availableFields: [...new Set(local.existingFieldNames)]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name, datasetAmbiguity: (counts.get(name) ?? 0) > 1 })),
    titleCapability: local.currentReportTitle ? "available" : "ambiguous",
    pageDimensions:
      inventory.reportSections[0]?.pageWidth.presence === "explicit" &&
      inventory.reportSections[0]?.pageHeight.presence === "explicit"
        ? "explicit"
        : "omitted",
    currentOrientation: local.pageOrientation,
    availableFormatCodes: ["C0", "C2", "N0", "N2", "P0", "P2"],
  });
};

export type SmartPlanningOutcome =
  | {
      status: "planned";
      source: "deterministic" | "claude";
      plan: EditPlan;
      planSha256: string;
    }
  | Extract<
      LlmPlanningResult,
      { status: "unsupported" | "clarificationRequired" }
    >;

const planSha256 = (plan: EditPlan): string =>
  createHash("sha256").update(JSON.stringify(plan)).digest("hex");

export const planSmart = async (input: {
  request: string;
  deterministicContext: EditPlannerContext;
  sanitizedContext: SanitizedPlanningContext;
  mode: "smart" | "deterministicOnly";
  provider?: LlmPlannerProvider;
  signal?: AbortSignal;
}): Promise<SmartPlanningOutcome> => {
  const deterministicContext = editPlannerContextSchema.parse(
    input.deterministicContext,
  );
  const local = new LocalSentenceEditPlanner().plan(
    input.request,
    deterministicContext,
  );
  if (local.status === "planned")
    return {
      status: "planned",
      source: "deterministic",
      plan: local.plan,
      planSha256: local.planSha256,
    };
  if (input.mode === "deterministicOnly")
    throw new LlmPlannerError(
      "LLM_UNSUPPORTED_REQUEST",
      `${local.code}: ${local.message}`,
    );
  if (!input.provider)
    throw new LlmPlannerError(
      "LLM_NOT_CONFIGURED",
      "Configure an Anthropic API key before using Smart planning.",
    );
  let raw = await input.provider.plan({
    request: input.request,
    context: sanitizedPlanningContextSchema.parse(input.sanitizedContext),
    ...(input.signal ? { signal: input.signal } : {}),
  });
  let parsed = llmPlanningResultSchema.safeParse(raw);
  if (!parsed.success) {
    raw = await input.provider.plan({
      request: input.request,
      context: input.sanitizedContext,
      ...(input.signal ? { signal: input.signal } : {}),
      validationFeedback: parsed.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    });
    parsed = llmPlanningResultSchema.safeParse(raw);
  }
  if (!parsed.success)
    throw new LlmPlannerError(
      "LLM_SCHEMA_VALIDATION_FAILED",
      "Claude returned a planning result that failed runtime validation.",
      true,
    );
  if (parsed.data.status !== "planned") return parsed.data;
  const plan = editPlanSchema.parse(parsed.data.plan);
  return {
    status: "planned",
    source: "claude",
    plan,
    planSha256: planSha256(plan),
  };
};
