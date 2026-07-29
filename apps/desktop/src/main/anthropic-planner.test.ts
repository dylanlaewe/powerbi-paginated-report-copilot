import { describe, expect, it } from "vitest";
import type { SanitizedPlanningContext } from "@powerbi-copilot/rdl-copilot";
import {
  AnthropicPlannerProvider,
  type PlannerMessagesTransport,
} from "./anthropic-planner";

const context: SanitizedPlanningContext = {
  contractVersion: 1,
  availableFields: [{ name: "Revenue", datasetAmbiguity: false }],
  titleCapability: "available",
  pageDimensions: "explicit",
  currentOrientation: "portrait",
  availableFormatCodes: ["C0", "C2", "N0", "N2", "P0", "P2"],
};
const transport = (content: unknown[]): PlannerMessagesTransport => ({
  create: () => Promise.resolve({ content }),
});

describe("AnthropicPlannerProvider", () => {
  it("returns exactly one submit_planning_result input", async () => {
    const provider = new AnthropicPlannerProvider(
      "sk-ant-test-key-not-real-123456",
      "claude-sonnet-5",
      transport([
        {
          type: "tool_use",
          name: "submit_planning_result",
          input: {
            status: "unsupported",
            reasonCode: "OPERATION_NOT_SUPPORTED",
            explanation: "Charts are unsupported.",
            unsupportedFragments: ["Add a chart"],
          },
        },
      ]),
    );
    await expect(
      provider.plan({ request: "Add a chart", context }),
    ).resolves.toMatchObject({ status: "unsupported" });
  });

  it.each([
    ["text-only", [{ type: "text", text: "{}" }], "LLM_INVALID_TOOL_RESULT"],
    [
      "unknown tool",
      [{ type: "tool_use", name: "write_file", input: {} }],
      "LLM_INVALID_TOOL_RESULT",
    ],
    [
      "multiple tool calls",
      [
        { type: "tool_use", name: "submit_planning_result", input: {} },
        { type: "tool_use", name: "submit_planning_result", input: {} },
      ],
      "LLM_MULTIPLE_RESULTS",
    ],
  ])("rejects %s", async (_name, content, code) => {
    const provider = new AnthropicPlannerProvider(
      "sk-ant-test-key-not-real-123456",
      "claude-sonnet-5",
      transport(content),
    );
    await expect(
      provider.plan({ request: "test", context }),
    ).rejects.toMatchObject({ code });
  });

  it("sends no paths, XML, rows, queries, credentials, or candidate IDs", async () => {
    let captured: Parameters<PlannerMessagesTransport["create"]>[0] | undefined;
    const provider = new AnthropicPlannerProvider(
      "sk-ant-secret-never-returned",
      "claude-sonnet-5",
      {
        create: (input) => {
          captured = input;
          return Promise.resolve({
            content: [
              {
                type: "tool_use",
                name: "submit_planning_result",
                input: {
                  status: "clarificationRequired",
                  question: "What change should be made?",
                  reasonCode: "REQUEST_AMBIGUOUS",
                },
              },
            ],
          });
        },
      },
    );
    await provider.plan({ request: "Make it better", context });
    const serialized = JSON.stringify({
      request: captured?.request,
      context: captured?.context,
    });
    expect(serialized).not.toMatch(
      /(?:\\.rdl|<Report|SELECT |connection|candidateId|structuralPath)/u,
    );
    expect(serialized).not.toContain("sk-ant-secret-never-returned");
  });
});
