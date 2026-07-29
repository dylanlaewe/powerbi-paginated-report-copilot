import {
  createSanitizedPlanningContext,
  createEditPlannerContext,
  inspectRdlFile,
  planSmart,
} from "../packages/rdl-copilot/src/index";
import { AnthropicPlannerProvider } from "../apps/desktop/src/main/anthropic-planner";
import { resolve } from "node:path";

const key = process.env.ANTHROPIC_API_KEY;
if (!key)
  throw new Error(
    "ANTHROPIC_API_KEY is required for this explicitly invoked smoke test.",
  );
const root = resolve(import.meta.dirname, "..");
const inventory = await inspectRdlFile(
  resolve(
    root,
    "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
  ),
);
const provider = new AnthropicPlannerProvider(key);
for (const request of [
  "Call the report Synthetic Smoke Test.",
  "Add a chart.",
  "Make this report better.",
]) {
  const result = await planSmart({
    request,
    deterministicContext: createEditPlannerContext(inventory),
    sanitizedContext: createSanitizedPlanningContext(inventory),
    mode: "smart",
    provider,
  });
  console.log(
    JSON.stringify({
      requestCategory: request.startsWith("Call")
        ? "planned"
        : request.startsWith("Add")
          ? "unsupported"
          : "clarification",
      status: result.status,
      ...(result.status === "planned" ? { source: result.source } : {}),
    }),
  );
}
