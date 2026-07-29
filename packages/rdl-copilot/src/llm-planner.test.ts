import { describe, expect, it } from "vitest";
import {
  LlmPlannerError,
  llmPlanningResultSchema,
  planSmart,
  submitPlanningResultInputSchema,
  type LlmPlannerProvider,
  type LlmPlanningResult,
  type SanitizedPlanningContext,
} from "./llm-planner";
import type { EditPlan } from "./edit-plan";
import type { EditPlannerContext } from "./edit-planner";

const context: EditPlannerContext = {
  version: 1,
  existingFieldNames: ["Revenue", "Margin", "Quantity", "UnitCost", "Amount"],
  formattingFieldNames: ["Revenue", "Margin", "Quantity", "UnitCost", "Amount"],
  supportedSemanticRoles: ["reportTitle"] as ["reportTitle"],
  pageOrientation: "portrait" as const,
  currentReportTitle: "Synthetic Report",
};
const sanitized: SanitizedPlanningContext = {
  contractVersion: 1,
  availableFields: context.existingFieldNames.map((name) => ({
    name,
    datasetAmbiguity: false,
  })),
  titleCapability: "available",
  pageDimensions: "explicit",
  currentOrientation: "portrait",
  availableFormatCodes: ["C0", "C2", "N0", "N2", "P0", "P2"],
};

const title = (value: string): EditPlan["operations"][number] => ({
  type: "setText",
  target: { kind: "reportItem", semanticRole: "reportTitle" },
  value,
});
const style = (
  value: Omit<
    Extract<EditPlan["operations"][number], { type: "setTextStyle" }>,
    "type" | "target"
  >,
): EditPlan["operations"][number] => ({
  type: "setTextStyle",
  target: { kind: "reportItem", semanticRole: "reportTitle" },
  ...value,
});
const format = (
  fieldName: string,
  code: "C0" | "C2" | "N0" | "N2" | "P0" | "P2",
): EditPlan["operations"][number] => ({
  type: "setNumberFormat",
  target: { kind: "fieldDisplay", fieldName },
  format: code,
});
const planned = (...operations: EditPlan["operations"]): LlmPlanningResult => ({
  status: "planned",
  plan: { version: 1, operations },
});

class FakeProvider implements LlmPlannerProvider {
  readonly providerName = "fake";
  readonly model = "fake-pinned-model";
  calls = 0;
  constructor(
    private readonly results:
      | LlmPlanningResult[]
      | ((request: string) => LlmPlanningResult),
  ) {}
  plan(input: { request: string }): Promise<unknown> {
    const result =
      typeof this.results === "function"
        ? this.results(input.request)
        : this.results[Math.min(this.calls, this.results.length - 1)];
    this.calls += 1;
    return Promise.resolve(result);
  }
  testConnection(): Promise<void> {
    return Promise.resolve();
  }
}

const paraphrases: [string, LlmPlanningResult][] = [
  [
    "Rename this report to Weekly Sales Pipeline.",
    planned(title("Weekly Sales Pipeline")),
  ],
  [
    "Call the report Weekly Sales Pipeline.",
    planned(title("Weekly Sales Pipeline")),
  ],
  [
    "Change the heading to Weekly Sales Pipeline.",
    planned(title("Weekly Sales Pipeline")),
  ],
  [
    "Make the report title say Weekly Sales Pipeline.",
    planned(title("Weekly Sales Pipeline")),
  ],
  [
    "Make the title larger and bold.",
    {
      status: "clarificationRequired",
      question: "What title size should I use?",
      reasonCode: "REQUEST_AMBIGUOUS",
    },
  ],
  ["Set the title to 20 points.", planned(style({ fontSize: "20pt" }))],
  ["Center the report title.", planned(style({ textAlign: "Center" }))],
  ["Left-align the heading.", planned(style({ textAlign: "Left" }))],
  ["Show Revenue as whole-dollar currency.", planned(format("Revenue", "C0"))],
  [
    "Format Revenue as currency without cents.",
    planned(format("Revenue", "C0")),
  ],
  [
    "Display Margin as a percentage with two decimal places.",
    planned(format("Margin", "P2")),
  ],
  ["Show Quantity as a whole number.", planned(format("Quantity", "N0"))],
  [
    "Give UnitCost two decimal currency formatting.",
    planned(format("UnitCost", "C2")),
  ],
  [
    "Rename it to Quarterly Department Sales and show Revenue as whole dollars.",
    planned(title("Quarterly Department Sales"), format("Revenue", "C0")),
  ],
  [
    "Change the title, make it bold, and format UnitCost as currency.",
    {
      status: "clarificationRequired",
      question: "What should the new report title be?",
      reasonCode: "MISSING_TITLE_VALUE",
    },
  ],
  [
    "Call this Professional Certification Transcript and make the heading 20-point bold.",
    planned(
      title("Professional Certification Transcript"),
      style({ fontSize: "20pt", fontWeight: "Bold" }),
    ),
  ],
];

const unsupported = [
  "Add a chart.",
  "Create a new parameter.",
  "Add a calculated Profit field.",
  "Change the SQL query.",
  "Add a new table.",
  "Email the report.",
  "Connect to Salesforce.",
  "Rewrite every expression.",
];
const ambiguous = [
  "Make it better.",
  "Fix the formatting.",
  "Change the numbers.",
  "Update the title.",
  "Format Amount.",
];

describe("LLM planner contract", () => {
  it("keeps the tool schema and runtime plan allowlist aligned", () => {
    expect(
      submitPlanningResultInputSchema.oneOf[0].properties.plan,
    ).toBeTruthy();
    expect(() =>
      llmPlanningResultSchema.parse({
        status: "planned",
        plan: {
          version: 1,
          operations: [{ type: "addChart", field: "Revenue" }],
        },
      }),
    ).toThrow();
  });

  it.each(paraphrases)("accepts paraphrase: %s", async (request, result) => {
    const provider = new FakeProvider(() => result);
    const outcome = await planSmart({
      request,
      deterministicContext: context,
      sanitizedContext: sanitized,
      mode: "smart",
      provider,
    });
    expect(outcome).toMatchObject(
      result.status === "planned"
        ? { status: "planned", plan: result.plan }
        : result,
    );
  });

  it.each(unsupported)("honestly rejects unsupported: %s", async (request) => {
    const provider = new FakeProvider(() => ({
      status: "unsupported",
      reasonCode: "OPERATION_NOT_SUPPORTED",
      explanation: "That operation is outside the v0.4 beta allowlist.",
      unsupportedFragments: [request],
    }));
    await expect(
      planSmart({
        request,
        deterministicContext: context,
        sanitizedContext: sanitized,
        mode: "smart",
        provider,
      }),
    ).resolves.toMatchObject({ status: "unsupported" });
  });

  it.each(ambiguous)("requires clarification: %s", async (request) => {
    const provider = new FakeProvider(() => ({
      status: "clarificationRequired",
      question: "What exact supported change should be made?",
      reasonCode: "REQUEST_AMBIGUOUS",
    }));
    await expect(
      planSmart({
        request,
        deterministicContext: context,
        sanitizedContext: sanitized,
        mode: "smart",
        provider,
      }),
    ).resolves.toMatchObject({ status: "clarificationRequired" });
  });

  it("uses deterministic planning first without an API call", async () => {
    const provider = new FakeProvider(() => planned(title("Wrong")));
    const result = await planSmart({
      request: 'Change the report title to "Weekly Sales Pipeline".',
      deterministicContext: context,
      sanitizedContext: sanitized,
      mode: "smart",
      provider,
    });
    expect(result).toMatchObject({
      status: "planned",
      source: "deterministic",
    });
    expect(provider.calls).toBe(0);
  });

  it("performs exactly one schema-correction retry", async () => {
    const provider = new FakeProvider([
      {
        status: "planned",
        plan: { version: 1, operations: [] },
      } as LlmPlanningResult,
      planned(format("Revenue", "C0")),
    ]);
    await expect(
      planSmart({
        request: "Show Revenue in whole dollars please.",
        deterministicContext: context,
        sanitizedContext: sanitized,
        mode: "smart",
        provider,
      }),
    ).resolves.toMatchObject({ status: "planned", source: "claude" });
    expect(provider.calls).toBe(2);
  });

  it("fails after the controlled retry and never guesses", async () => {
    const provider = new FakeProvider([
      {
        status: "planned",
        plan: { version: 1, operations: [] },
      } as LlmPlanningResult,
    ]);
    await expect(
      planSmart({
        request: "Show Revenue in whole dollars please.",
        deterministicContext: context,
        sanitizedContext: sanitized,
        mode: "smart",
        provider,
      }),
    ).rejects.toMatchObject({
      code: "LLM_SCHEMA_VALIDATION_FAILED",
    } satisfies Partial<LlmPlannerError>);
    expect(provider.calls).toBe(2);
  });

  it.each([
    "LLM_AUTHENTICATION_FAILED",
    "LLM_RATE_LIMITED",
    "LLM_TIMEOUT",
    "LLM_NETWORK_ERROR",
    "LLM_PROVIDER_ERROR",
    "LLM_REQUEST_CANCELLED",
  ] as const)("preserves structured provider error %s", async (code) => {
    const provider: LlmPlannerProvider = {
      providerName: "fake",
      model: "fake-pinned-model",
      plan: () =>
        Promise.reject(
          new LlmPlannerError(code, "Safe provider-neutral message."),
        ),
      testConnection: () => Promise.resolve(),
    };
    await expect(
      planSmart({
        request: "Please show Revenue as whole dollars.",
        deterministicContext: context,
        sanitizedContext: sanitized,
        mode: "smart",
        provider,
      }),
    ).rejects.toMatchObject({ code });
  });

  it("deterministic-only mode never calls a provider", async () => {
    const provider = new FakeProvider(() => planned(title("Wrong")));
    await expect(
      planSmart({
        request: "Call the report Weekly Sales Pipeline.",
        deterministicContext: context,
        sanitizedContext: sanitized,
        mode: "deterministicOnly",
        provider,
      }),
    ).rejects.toMatchObject({ code: "LLM_UNSUPPORTED_REQUEST" });
    expect(provider.calls).toBe(0);
  });
});
