import { z } from "zod";
import type {
  TargetCandidateCatalog,
  TargetTitleCandidate,
} from "./target-context";

export const titleResolutionReasonSchema = z.enum([
  "TITLE_RESOLVED",
  "NO_TITLE_CANDIDATE",
  "NO_CONFIDENT_TITLE_CANDIDATE",
  "MULTIPLE_PLAUSIBLE_TITLE_CANDIDATES",
  "CONFLICTING_TITLE_EVIDENCE",
  "UNSUPPORTED_TITLE_EXPRESSION",
  "TITLE_CONTEXT_INSUFFICIENT",
]);

const evidenceContributionSchema = z
  .object({
    code: z.string(),
    weight: z.number().int(),
    message: z.string(),
  })
  .strict();
const rankedCandidateSchema = z
  .object({
    candidateId: z.string().min(1),
    visibleText: z.string(),
    structuralPath: z.string(),
    region: z.enum(["body", "pageHeader", "pageFooter"]),
    score: z.number().int(),
    evidence: z.array(evidenceContributionSchema),
    negativeEvidence: z.array(evidenceContributionSchema),
  })
  .strict();

export const titleResolutionOutcomeSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("resolved"),
      reason: z.literal("TITLE_RESOLVED"),
      candidateId: z.string().min(1),
      confidence: z.enum(["high", "medium"]),
      evidence: z.array(evidenceContributionSchema).min(1),
      alternatives: z.array(rankedCandidateSchema),
      mutationAuthorized: z.literal(false),
    })
    .strict(),
  z
    .object({
      status: z.literal("ambiguous"),
      reason: z.enum([
        "MULTIPLE_PLAUSIBLE_TITLE_CANDIDATES",
        "CONFLICTING_TITLE_EVIDENCE",
      ]),
      candidates: z.array(rankedCandidateSchema).min(2),
      evidence: z.array(z.string()).min(1),
      mutationAuthorized: z.literal(false),
    })
    .strict(),
  z
    .object({
      status: z.literal("notFound"),
      reason: z.enum(["NO_TITLE_CANDIDATE", "NO_CONFIDENT_TITLE_CANDIDATE"]),
      consideredCandidateCount: z.number().int().nonnegative(),
      mutationAuthorized: z.literal(false),
    })
    .strict(),
  z
    .object({
      status: z.literal("unsupported"),
      reason: z.enum([
        "UNSUPPORTED_TITLE_EXPRESSION",
        "TITLE_CONTEXT_INSUFFICIENT",
      ]),
      evidence: z.array(z.string()).min(1),
      mutationAuthorized: z.literal(false),
    })
    .strict(),
]);

export type TitleResolutionOutcome = z.infer<
  typeof titleResolutionOutcomeSchema
>;
export type RankedTitleCandidate = z.infer<typeof rankedCandidateSchema>;

const measurementInPoints = (value: string | undefined): number | null => {
  if (!value) return null;
  const match = /^([0-9]+(?:\.[0-9]+)?)(pt|in|mm|cm)$/iu.exec(value.trim());
  if (!match?.[1] || !match[2]) return null;
  const amount = Number(match[1]);
  return (
    {
      pt: amount,
      in: amount * 72,
      mm: (amount / 25.4) * 72,
      cm: (amount / 2.54) * 72,
    }[match[2].toLowerCase()] ?? null
  );
};

const contribution = (
  code: string,
  weight: number,
  message: string,
): z.infer<typeof evidenceContributionSchema> => ({ code, weight, message });

const rankCandidate = (
  candidate: TargetTitleCandidate,
): RankedTitleCandidate => {
  const positive: z.infer<typeof evidenceContributionSchema>[] = [
    contribution(
      "SAFE_VISIBLE_TEXT",
      10,
      "visible text was safely extracted without expression execution",
    ),
  ];
  const negative: z.infer<typeof evidenceContributionSchema>[] = [];
  const fontPoints = Math.max(
    0,
    ...candidate.fontSizes
      .map(measurementInPoints)
      .filter((value): value is number => value !== null),
  );
  const widthPoints = measurementInPoints(
    candidate.location.width ?? undefined,
  );
  const words = candidate.visibleText.trim().split(/\s+/u).filter(Boolean);
  const lowerText = candidate.visibleText.toLowerCase();

  if (candidate.expression.kind === "constantStringExpression")
    positive.push(
      contribution(
        "SAFE_CONSTANT_STRING",
        8,
        "constant-string expression was safely decoded",
      ),
    );
  if (
    /(?:^|[_\-\s])(report|title|heading)(?:$|[_\-\s])/iu.test(
      candidate.reportItemName.replace(/([a-z])([A-Z])/gu, "$1 $2"),
    )
  )
    positive.push(
      contribution(
        "TITLE_ORIENTED_NAME",
        28,
        "report-item name contains a title-oriented token",
      ),
    );
  if (fontPoints >= 18)
    positive.push(
      contribution("LARGE_FONT", 24, `font size is ${fontPoints.toFixed(1)}pt`),
    );
  else if (fontPoints >= 14)
    positive.push(
      contribution(
        "PROMINENT_FONT",
        14,
        `font size is ${fontPoints.toFixed(1)}pt`,
      ),
    );
  if (candidate.fontWeights.some((value) => value.toLowerCase() === "bold"))
    positive.push(contribution("BOLD", 14, "text is bold"));
  if (
    candidate.scope.role === "standalone" &&
    candidate.location.containerChain.length === 0
  )
    positive.push(
      contribution(
        "STRUCTURALLY_SEPARATE",
        16,
        "textbox is structurally separate from data regions",
      ),
    );
  if (candidate.location.region === "pageHeader")
    positive.push(
      contribution(
        "PAGE_HEADER",
        12,
        "candidate is located in the page header",
      ),
    );
  if (
    candidate.location.region === "body" &&
    candidate.scope.role === "standalone"
  )
    positive.push(
      contribution(
        "STANDALONE_BODY",
        10,
        "candidate is a standalone body textbox",
      ),
    );
  if (widthPoints !== null && widthPoints >= 4 * 72)
    positive.push(
      contribution(
        "WIDE_TEXTBOX",
        10,
        "textbox width is consistent with a report heading",
      ),
    );
  if (words.length >= 3 && words.length <= 10)
    positive.push(
      contribution(
        "TITLE_LENGTH_PHRASE",
        12,
        "visible text is a concise multi-word phrase",
      ),
    );
  if (
    /\b(report|summary|detail|inventory|transcript|invoice|statement|analysis)\b/iu.test(
      lowerText,
    )
  )
    positive.push(
      contribution(
        "TITLE_SEMANTIC_TOKEN",
        12,
        "visible text contains a generic report-title term",
      ),
    );

  if (candidate.scope.role === "staticHeader")
    negative.push(
      contribution(
        "TABLIX_STATIC_HEADER",
        -40,
        "candidate is a static tablix header",
      ),
    );
  if (candidate.expression.kind === "directFieldReference")
    negative.push(
      contribution(
        "DIRECT_FIELD_EXPRESSION",
        -60,
        "field-bound values are not safely understood report titles",
      ),
    );
  if (candidate.expression.kind === "aggregateExpression")
    negative.push(
      contribution(
        "AGGREGATE_EXPRESSION",
        -60,
        "aggregate values are not report titles",
      ),
    );
  if (
    [
      "parameterExpression",
      "reportGlobalExpression",
      "codeExpression",
      "compoundExpression",
      "unknownExpression",
    ].includes(candidate.expression.kind)
  )
    negative.push(
      contribution(
        "UNSUPPORTED_TITLE_EXPRESSION",
        -60,
        "expression cannot be safely interpreted as visible title text",
      ),
    );
  if (
    candidate.scope.role === "staticLabel" ||
    candidate.scope.role === "detail"
  )
    negative.push(
      contribution(
        "DATA_REGION_LABEL",
        -28,
        "candidate is a label within a data region",
      ),
    );
  if (candidate.location.region === "pageFooter")
    negative.push(
      contribution("PAGE_FOOTER", -45, "candidate is in the page footer"),
    );
  if (
    candidate.location.hidden.status === "hidden" ||
    candidate.location.hidden.status === "expression"
  )
    negative.push(
      contribution(
        "HIDDEN_OR_CONDITIONAL",
        -25,
        "candidate is hidden or conditionally visible",
      ),
    );
  if (fontPoints > 0 && fontPoints < 10)
    negative.push(
      contribution("SMALL_FONT", -12, "candidate uses small label-sized text"),
    );
  if (candidate.visibleText.trim().endsWith(":"))
    negative.push(
      contribution("LABEL_PUNCTUATION", -16, "text ends as a label prompt"),
    );
  if (
    /\b(disclaimer|warranty|payable|reference|account|sort code|student id|activity recorded)\b/iu.test(
      lowerText,
    )
  )
    negative.push(
      contribution(
        "METADATA_OR_DISCLAIMER",
        -25,
        "text resembles metadata, payment detail, or disclaimer content",
      ),
    );
  if (candidate.visibleText.length > 120)
    negative.push(
      contribution(
        "LONG_PARAGRAPH",
        -35,
        "text is paragraph-length rather than title-like",
      ),
    );
  if (widthPoints !== null && widthPoints < 2 * 72)
    negative.push(
      contribution("NARROW_TEXTBOX", -8, "textbox is narrow and caption-like"),
    );
  const evidence = [...positive, ...negative].sort(
    (a, b) => b.weight - a.weight || a.code.localeCompare(b.code),
  );
  return rankedCandidateSchema.parse({
    candidateId: candidate.diagnosticId,
    visibleText: candidate.visibleText,
    structuralPath: candidate.location.structuralPath,
    region: candidate.location.region,
    score: evidence.reduce((sum, item) => sum + item.weight, 0),
    evidence: positive.sort(
      (a, b) => b.weight - a.weight || a.code.localeCompare(b.code),
    ),
    negativeEvidence: negative.sort(
      (a, b) => a.weight - b.weight || a.code.localeCompare(b.code),
    ),
  });
};

export const rankTitleCandidates = (
  catalog: TargetCandidateCatalog,
): RankedTitleCandidate[] =>
  catalog.titleCandidates
    .map(rankCandidate)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.structuralPath.localeCompare(b.structuralPath) ||
        a.candidateId.localeCompare(b.candidateId),
    );

const hasEvidence = (candidate: RankedTitleCandidate, code: string): boolean =>
  candidate.evidence.some((item) => item.code === code);

export const resolveReadOnlyReportTitle = (
  catalog: TargetCandidateCatalog,
): TitleResolutionOutcome => {
  const ranked = rankTitleCandidates(catalog);
  if (!ranked.length)
    return titleResolutionOutcomeSchema.parse({
      status: "notFound",
      reason: "NO_TITLE_CANDIDATE",
      consideredCandidateCount: 0,
      mutationAuthorized: false,
    });
  const strongestSource = catalog.titleCandidates.find(
    ({ diagnosticId }) => diagnosticId === ranked[0]?.candidateId,
  );
  if (
    strongestSource &&
    !["staticText", "constantStringExpression"].includes(
      strongestSource.expression.kind,
    )
  )
    return titleResolutionOutcomeSchema.parse({
      status: "unsupported",
      reason: "UNSUPPORTED_TITLE_EXPRESSION",
      evidence: [
        `strongest candidate uses ${strongestSource.expression.kind}`,
        "the expression was classified but not executed",
      ],
      mutationAuthorized: false,
    });
  const plausible = ranked.filter(({ score }) => score >= 60);
  if (!plausible.length) {
    return titleResolutionOutcomeSchema.parse({
      status: "notFound",
      reason: "NO_CONFIDENT_TITLE_CANDIDATE",
      consideredCandidateCount: ranked.length,
      mutationAuthorized: false,
    });
  }
  const [first, second] = plausible;
  if (first && second && first.score - second.score <= 12)
    return titleResolutionOutcomeSchema.parse({
      status: "ambiguous",
      reason: "MULTIPLE_PLAUSIBLE_TITLE_CANDIDATES",
      candidates: plausible,
      evidence: [
        "multiple candidates have comparable independently plausible title evidence",
        "deterministic ordering is not treated as semantic proof",
      ],
      mutationAuthorized: false,
    });
  const semanticConflict =
    first &&
    hasEvidence(first, "TITLE_ORIENTED_NAME") &&
    ranked.some(
      (candidate) =>
        candidate.candidateId !== first.candidateId &&
        candidate.region === first.region &&
        hasEvidence(candidate, "STANDALONE_BODY") &&
        hasEvidence(candidate, "TITLE_LENGTH_PHRASE") &&
        hasEvidence(candidate, "TITLE_SEMANTIC_TOKEN") &&
        candidate.negativeEvidence.length === 0,
    );
  if (semanticConflict)
    return titleResolutionOutcomeSchema.parse({
      status: "ambiguous",
      reason: "CONFLICTING_TITLE_EVIDENCE",
      candidates: ranked.filter(
        (candidate) =>
          candidate.candidateId === first.candidateId ||
          (hasEvidence(candidate, "STANDALONE_BODY") &&
            hasEvidence(candidate, "TITLE_LENGTH_PHRASE") &&
            hasEvidence(candidate, "TITLE_SEMANTIC_TOKEN")),
      ),
      evidence: [
        "title-oriented name and style evidence favors one candidate",
        "standalone visible semantic-title evidence favors another candidate",
        "automatically selecting either candidate would be unsafe",
      ],
      mutationAuthorized: false,
    });
  if (!first)
    return titleResolutionOutcomeSchema.parse({
      status: "unsupported",
      reason: "TITLE_CONTEXT_INSUFFICIENT",
      evidence: ["candidate ranking did not retain structural context"],
      mutationAuthorized: false,
    });
  return titleResolutionOutcomeSchema.parse({
    status: "resolved",
    reason: "TITLE_RESOLVED",
    candidateId: first.candidateId,
    confidence: first.score >= 100 ? "high" : "medium",
    evidence: first.evidence,
    alternatives: ranked.filter(
      ({ candidateId }) => candidateId !== first.candidateId,
    ),
    mutationAuthorized: false,
  });
};
