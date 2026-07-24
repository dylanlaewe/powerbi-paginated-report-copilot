import { createHash } from "node:crypto";
import { z } from "zod";
import { editPlanSchema, type EditOperation, type EditPlan } from "./edit-plan";
import type { RdlInventory } from "./inspection";

export const editPlannerContextSchema = z
  .object({
    version: z.literal(1),
    existingFieldNames: z.array(z.string().min(1)),
    formattingFieldNames: z.array(z.string().min(1)),
    supportedSemanticRoles: z.tuple([z.literal("reportTitle")]),
    pageOrientation: z.enum(["portrait", "landscape", "square"]),
    currentReportTitle: z.string().nullable(),
  })
  .strict();
export type EditPlannerContext = z.infer<typeof editPlannerContextSchema>;

const clauseSchema = z
  .object({
    kind: z.enum(["title", "titleStyle", "orientation", "numberFormat"]),
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    text: z.string().min(1),
  })
  .strict();

const plannedSchema = z
  .object({
    status: z.literal("planned"),
    planner: z
      .object({
        name: z.literal("LocalSentenceEditPlanner"),
        version: z.literal(1),
      })
      .strict(),
    normalizedRequest: z.string(),
    plan: editPlanSchema,
    planSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    proposal: z.array(z.string()).min(1),
    recognizedClauses: z.array(clauseSchema).min(1),
    warnings: z.array(z.string()),
  })
  .strict();
const rejectedSchema = z
  .object({
    status: z.literal("rejected"),
    code: z.enum([
      "EMPTY_REQUEST",
      "REQUEST_TOO_LARGE",
      "INVALID_CHARACTER",
      "INVALID_TITLE",
      "UNKNOWN_FIELD",
      "AMBIGUOUS_FIELD",
      "UNSUPPORTED_FORMAT",
      "CONFLICT",
      "UNSUPPORTED_REQUEST",
    ]),
    message: z.string(),
    unsupportedFragments: z.array(z.string()),
    suggestions: z.array(z.string()),
  })
  .strict();
export const editPlannerResultSchema = z.discriminatedUnion("status", [
  plannedSchema,
  rejectedSchema,
]);
export type EditPlannerResult = z.infer<typeof editPlannerResultSchema>;

export interface EditPlanner {
  plan(request: string, context: EditPlannerContext): EditPlannerResult;
}

type Intent = {
  title?: string;
  fontSize?: string;
  fontWeight?: "Normal" | "Bold";
  textAlign?: "Left" | "Center" | "Right";
  orientation?: "portrait" | "landscape";
  formats: Map<
    string,
    { fieldName: string; format: "C0" | "C2" | "N0" | "N2" | "P0" | "P2" }
  >;
};

const reject = (
  code: z.infer<typeof rejectedSchema>["code"],
  message: string,
  fragments: string[],
  suggestions: string[] = ["Use only the documented Gate 3 sentence forms."],
): EditPlannerResult =>
  rejectedSchema.parse({
    status: "rejected",
    code,
    message,
    unsupportedFragments: fragments,
    suggestions,
  });

const normalizeRequest = (input: string): string => {
  const normalized = input.normalize("NFC");
  let output = "";
  let quote: string | null = null;
  const closing: Record<string, string> = {
    '"': '"',
    "'": "'",
    "“": "”",
    "‘": "’",
  };
  let pendingSpace = false;
  for (const character of normalized) {
    if (!quote && closing[character]) {
      if (pendingSpace && output && !output.endsWith(" ")) output += " ";
      pendingSpace = false;
      quote = closing[character] ?? null;
      output += character;
    } else if (quote && character === quote) {
      output += character;
      quote = null;
    } else if (!quote && /\s/u.test(character)) pendingSpace = true;
    else {
      const safeCharacter =
        !quote && /[‐‑‒–—―]/u.test(character) ? "-" : character;
      if (
        pendingSpace &&
        output &&
        !/[,(]/u.test(safeCharacter) &&
        !output.endsWith(" ")
      )
        output += " ";
      pendingSpace = false;
      output += safeCharacter;
    }
  }
  return output.trim();
};

const normalizedFieldKey = (value: string): string =>
  value
    .normalize("NFC")
    .toLocaleLowerCase("en-US")
    .replace(/[\s_-]+/gu, "");

const proposalFromPlan = (
  plan: EditPlan,
  context: EditPlannerContext,
): string[] =>
  plan.operations.flatMap((operation) => {
    switch (operation.type) {
      case "setText":
        return [
          context.currentReportTitle
            ? `Change report title from "${context.currentReportTitle}" to "${operation.value}".`
            : `Change report title to "${operation.value}".`,
        ];
      case "setTextStyle":
        return [
          ...(operation.fontSize
            ? [`Change report title font size to ${operation.fontSize}.`]
            : []),
          ...(operation.fontWeight
            ? [`Make report title ${operation.fontWeight.toLowerCase()}.`]
            : []),
          ...(operation.textAlign
            ? [`Align report title ${operation.textAlign.toLowerCase()}.`]
            : []),
        ];
      case "setPageOrientation":
        return [`Change page orientation to ${operation.orientation}.`];
      case "setNumberFormat":
        return [
          `Format ${operation.target.fieldName} displays as ${operation.format}.`,
        ];
    }
  });

const patterns = {
  title:
    /^(?:(?:change|rename)\s+(?:the\s+)?(?:report\s+title|title|report)\s+(?:to\s+)?)(["'“‘])(.+?)(["'”’])/iu,
  combinedStyle:
    /^make\s+(?:the\s+)?(?:report\s+)?title\s+(?:(\d+(?:\.\d+)?)\s*(?:-?\s*point|pt)\s+(bold|normal)|(bold|normal)\s+and\s+(\d+(?:\.\d+)?)\s*(?:-?\s*point|pt))/iu,
  size: /^set\s+(?:the\s+)?(?:report\s+)?title\s+font\s+size\s+to\s+(\d+(?:\.\d+)?)\s*(?:-?\s*point|pt)/iu,
  weight: /^make\s+(?:the\s+)?(?:report\s+)?title\s+(bold|normal)/iu,
  align:
    /^(?:center|left-align|right-align)\s+(?:the\s+)?(?:report\s+)?title/iu,
  orientation:
    /^(?:(?:switch\s+(?:the\s+page\s+)?to|change\s+(?:the\s+)?report\s+to|use|make\s+the\s+page)\s+)(landscape|portrait)(?:\s+orientation)?/iu,
  format:
    /^(?:format|show)\s+([A-Za-z][A-Za-z0-9 _-]*?)\s+as\s+(?:a\s+)?(currency|number|percentage)\s+with\s+(no|zero|two|0|2|\d+)\s+decimal(?:\s+places|s)?/iu,
};

const setIntent = <K extends keyof Omit<Intent, "formats">>(
  intents: Intent,
  key: K,
  value: NonNullable<Intent[K]>,
): string | null => {
  const prior = intents[key];
  if (prior !== undefined && prior !== value)
    return `Conflicting ${key} values: ${String(prior)} and ${String(value)}`;
  (intents[key] as Intent[K]) = value;
  return null;
};

export class LocalSentenceEditPlanner implements EditPlanner {
  plan(request: string, unsafeContext: EditPlannerContext): EditPlannerResult {
    const context = editPlannerContextSchema.parse(unsafeContext);
    if (request.length > 8192)
      return reject(
        "REQUEST_TOO_LARGE",
        "The request exceeds 8,192 characters.",
        [],
      );
    if (
      [...request].some((character) => {
        const code = character.codePointAt(0) ?? 0;
        return (
          (code >= 0 && code <= 8) ||
          code === 11 ||
          code === 12 ||
          (code >= 14 && code <= 31) ||
          code === 127
        );
      })
    )
      return reject(
        "INVALID_CHARACTER",
        "The request contains prohibited control characters.",
        [],
      );
    const normalizedRequest = normalizeRequest(request);
    if (!normalizedRequest)
      return reject(
        "EMPTY_REQUEST",
        "Enter a supported report-edit request.",
        [],
      );

    const intents: Intent = { formats: new Map() };
    const clauses: z.infer<typeof clauseSchema>[] = [];
    let cursor = 0;
    while (cursor < normalizedRequest.length) {
      const separator =
        /^(?:\s*(?:,\s*)?(?:(?:and|then|also)\s+)?)/iu.exec(
          normalizedRequest.slice(cursor),
        )?.[0].length ?? 0;
      cursor += separator;
      if (
        cursor >= normalizedRequest.length ||
        /^[.!?]+$/u.test(normalizedRequest.slice(cursor))
      )
        break;
      const remaining = normalizedRequest.slice(cursor);
      let match: RegExpExecArray | null;
      let kind: z.infer<typeof clauseSchema>["kind"];
      let conflict: string | null = null;

      if ((match = patterns.title.exec(remaining))) {
        kind = "title";
        const pairs: Record<string, string> = {
          '"': '"',
          "'": "'",
          "“": "”",
          "‘": "’",
        };
        if (pairs[match[1] ?? ""] !== match[3] || !(match[2] ?? "").length)
          return reject(
            "INVALID_TITLE",
            "The title must be non-empty and use matching quotes.",
            [match[0]],
          );
        if (/[<>]/u.test(match[2] ?? ""))
          return reject(
            "INVALID_TITLE",
            "The title cannot contain markup delimiters.",
            [match[2] ?? ""],
          );
        conflict = setIntent(intents, "title", match[2] ?? "");
      } else if ((match = patterns.combinedStyle.exec(remaining))) {
        kind = "titleStyle";
        conflict =
          setIntent(intents, "fontSize", `${match[1] ?? match[4]}pt`) ??
          setIntent(
            intents,
            "fontWeight",
            (match[2] ?? match[3])!.toLocaleLowerCase("en-US") === "bold"
              ? "Bold"
              : "Normal",
          );
      } else if ((match = patterns.size.exec(remaining))) {
        kind = "titleStyle";
        conflict = setIntent(intents, "fontSize", `${match[1]}pt`);
      } else if ((match = patterns.weight.exec(remaining))) {
        kind = "titleStyle";
        conflict = setIntent(
          intents,
          "fontWeight",
          match[1]!.toLocaleLowerCase("en-US") === "bold" ? "Bold" : "Normal",
        );
      } else if ((match = patterns.align.exec(remaining))) {
        kind = "titleStyle";
        const word = match[0].split(/\s/u)[0]!.toLocaleLowerCase("en-US");
        conflict = setIntent(
          intents,
          "textAlign",
          word === "center"
            ? "Center"
            : word.startsWith("left")
              ? "Left"
              : "Right",
        );
      } else if ((match = patterns.orientation.exec(remaining))) {
        kind = "orientation";
        conflict = setIntent(
          intents,
          "orientation",
          match[1]!.toLocaleLowerCase("en-US") as "portrait" | "landscape",
        );
      } else if ((match = patterns.format.exec(remaining))) {
        kind = "numberFormat";
        const decimal = /^(?:no|zero|0)$/iu.test(match[3]!)
          ? "0"
          : /^(?:two|2)$/iu.test(match[3]!)
            ? "2"
            : null;
        if (!decimal)
          return reject(
            "UNSUPPORTED_FORMAT",
            "Only zero or two decimal places are supported.",
            [match[0]],
          );
        const key = normalizedFieldKey(match[1]!);
        const matches = context.formattingFieldNames.filter(
          (field) => normalizedFieldKey(field) === key,
        );
        if (matches.length === 0)
          return reject(
            "UNKNOWN_FIELD",
            `No formatting target uniquely matches "${match[1]}".`,
            [match[1]!],
          );
        if (matches.length > 1)
          return reject(
            "AMBIGUOUS_FIELD",
            `Multiple formatting targets match "${match[1]}".`,
            [match[1]!],
          );
        const family = { currency: "C", number: "N", percentage: "P" }[
          match[2]!.toLocaleLowerCase("en-US")
        ]!;
        const format = `${family}${decimal}` as
          | "C0"
          | "C2"
          | "N0"
          | "N2"
          | "P0"
          | "P2";
        const prior = intents.formats.get(key);
        if (prior && prior.format !== format)
          conflict = `Conflicting formats for ${matches[0]}: ${prior.format} and ${format}`;
        else intents.formats.set(key, { fieldName: matches[0]!, format });
      } else {
        const fragment = remaining
          .split(/(?=\s+(?:and|then|also)\s+)/iu)[0]!
          .replace(/[.!?]+$/u, "")
          .trim();
        return reject(
          "UNSUPPORTED_REQUEST",
          "Every meaningful clause must be supported; no partial plan was produced.",
          [fragment || remaining],
        );
      }
      if (conflict) return reject("CONFLICT", conflict, [match[0]]);
      const start = cursor;
      cursor += match[0].length;
      clauses.push({ kind, start, end: cursor, text: match[0] });
      const residue = normalizedRequest.slice(cursor);
      if (/^\s*[.!?]+\s*$/u.test(residue)) cursor = normalizedRequest.length;
    }

    const operations: EditOperation[] = [];
    if (intents.title !== undefined)
      operations.push({
        type: "setText",
        target: { kind: "reportItem", semanticRole: "reportTitle" },
        value: intents.title,
      });
    if (intents.fontSize || intents.fontWeight || intents.textAlign)
      operations.push({
        type: "setTextStyle",
        target: { kind: "reportItem", semanticRole: "reportTitle" },
        ...(intents.fontSize ? { fontSize: intents.fontSize } : {}),
        ...(intents.fontWeight ? { fontWeight: intents.fontWeight } : {}),
        ...(intents.textAlign ? { textAlign: intents.textAlign } : {}),
      });
    if (intents.orientation)
      operations.push({
        type: "setPageOrientation",
        orientation: intents.orientation,
      });
    for (const item of [...intents.formats.values()].sort((a, b) =>
      normalizedFieldKey(a.fieldName).localeCompare(
        normalizedFieldKey(b.fieldName),
        "en-US",
      ),
    ))
      operations.push({
        type: "setNumberFormat",
        target: { kind: "fieldDisplay", fieldName: item.fieldName },
        format: item.format,
      });
    if (!operations.length)
      return reject(
        "UNSUPPORTED_REQUEST",
        "No supported edit instruction was found.",
        [normalizedRequest],
      );
    const plan = editPlanSchema.parse({ version: 1, operations });
    const planSha256 = createHash("sha256")
      .update(JSON.stringify(plan), "utf8")
      .digest("hex");
    return plannedSchema.parse({
      status: "planned",
      planner: { name: "LocalSentenceEditPlanner", version: 1 },
      normalizedRequest,
      plan,
      planSha256,
      proposal: proposalFromPlan(plan, context),
      recognizedClauses: clauses,
      warnings: [],
    });
  }
}

export const createEditPlannerContext = (
  inventory: RdlInventory,
): EditPlannerContext => {
  const formattingFieldNames = [
    ...new Set(
      inventory.textboxes.flatMap((textbox) =>
        textbox.fieldBindings.map((binding) => binding.fieldName),
      ),
    ),
  ];
  const title = inventory.textboxes.find(
    (textbox) => textbox.name === "ReportTitle",
  );
  return editPlannerContextSchema.parse({
    version: 1,
    existingFieldNames: [
      ...new Set(inventory.datasets.flatMap((dataset) => dataset.fields)),
    ],
    formattingFieldNames,
    supportedSemanticRoles: ["reportTitle"],
    pageOrientation: inventory.reportSections[0]?.orientation ?? "square",
    currentReportTitle: title?.staticText[0] ?? null,
  });
};
