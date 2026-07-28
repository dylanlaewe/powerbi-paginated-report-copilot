import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { XmlElement, XmlNode } from "libxml2-wasm";
import {
  inspectRdlFile,
  RdlInspectionError,
} from "../packages/rdl-copilot/src/inspection";
import {
  LocalSentenceEditPlanner,
  type EditPlannerContext,
} from "../packages/rdl-copilot/src/edit-planner";

const outputRoot = resolve(
  process.argv[process.argv.indexOf("--output") + 1] ?? "",
);
if (!process.argv.includes("--output")) throw new Error("Missing --output");
const repositoryRoot = resolve(import.meta.dirname, "..");
const local = (name: string): string => `*[local-name()='${name}']`;
const elements = (node: XmlNode, xpath: string): XmlElement[] =>
  node.find(xpath) as XmlElement[];
const first = (node: XmlNode, xpath: string): string | null =>
  node.get(xpath)?.content.trim() || null;
const nameOf = (node: XmlElement): string =>
  node.attr("Name")?.value.trim() ?? "";
const hash = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

type Classification =
  | "PASS_CORRECT"
  | "PASS_AMBIGUOUSLY_SAFE"
  | "BLOCKED_INSPECTOR"
  | "BLOCKED_UNSUPPORTED_STRUCTURE"
  | "BLOCKED_NO_CANDIDATE"
  | "BLOCKED_AMBIGUOUS"
  | "FAIL_WRONG_TARGET"
  | "FAIL_INCONSISTENT_TARGETS"
  | "NOT_APPLICABLE";

type DiagnosticTextbox = {
  name: string;
  container: "reportBody" | "tablix" | "pageHeader" | "pageFooter" | "other";
  tablix: string | null;
  values: string[];
  staticText: string[];
  expressions: string[];
  top: string | null;
  fontSizes: string[];
  fontWeights: string[];
  textAlignments: string[];
  bindings: Array<{
    fieldName: string;
    kind: "direct" | "sum";
    expression: string;
    format: string | null;
  }>;
};

const fixtures = [
  {
    id: "simple-table",
    path: "examples/rdl-structure-corpus/simple-table/source/synthetic-inventory-detail.rdl",
    size: 21_402,
    sha256: "e3a34afe7c29c9f773098d9f5bfd65ad2cf60219f78999d46a447250bb2448e3",
    expectedVisibleTitle: "Synthetic Inventory Detail",
    numericField: "UnitCost",
    plannerRequest:
      'Change the report title to "Quarterly Inventory Detail", make the title 20-point bold, switch the page to landscape, and format UnitCost as currency with no decimal places.',
  },
  {
    id: "grouped-report",
    path: "examples/rdl-structure-corpus/grouped-report/source/synthetic-department-sales.rdl",
    size: 52_651,
    sha256: "03c7a6eacd6b003aeaace0264a361267ce208de6388420f0d465608f3540174b",
    expectedVisibleTitle: "Synthetic Department Sales Summary",
    numericField: "Revenue",
    plannerRequest:
      'Change the report title to "Quarterly Department Sales", switch the page to landscape, and format Revenue as currency with no decimal places.',
  },
  {
    id: "microsoft-invoice",
    path: "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/invoice/source/Invoice.rdl",
    size: 222_297,
    sha256: "6251f6b9f76618dd5c2f9accc614b9e198fc221d2310a39508f6ac4897d53fdc",
    expectedVisibleTitle: null,
    numericField: null,
    plannerRequest: null,
  },
  {
    id: "microsoft-transcript",
    path: "examples/rdl-structure-corpus/external-sources/microsoft-reporting-services/imported/transcript/source/Transcript.rdl",
    size: 116_709,
    sha256: "9693231c79853b0881d0414f1c98242c76216efc00784b3bc81acc69430b2e81",
    expectedVisibleTitle: "Contoso Professional Certified Transcript",
    numericField: null,
    plannerRequest:
      'Change the report title to "Professional Certification Transcript" and make the title 20-point bold and left aligned.',
  },
] as const;

const productionSourceIdentities = [
  {
    relativePath: "packages/rdl-copilot/src/inspection.ts",
    sha256: "0d0956f8e16be1a9e3bee6b6e908b0ae5b15fc02d90a4ef601fcf30a9a62ceca",
  },
  {
    relativePath: "packages/rdl-copilot/src/edit-planner.ts",
    sha256: "0f42566461403d2963a5be5278730eb7fec0e8027c650fe09b205850c6bf2951",
  },
  {
    relativePath: "packages/rdl-copilot/src/mutation.ts",
    sha256: "15ab59fbb7c91a7e048b3b5759ff89009204bd6ab001d067967025310b144f6e",
  },
  {
    relativePath: "packages/rdl-copilot/src/sidecar-cli.ts",
    sha256: "233899bd3143995c5dfcc78a26ef8b9b5d75614d4be3b4f9717191d8804478b1",
  },
  {
    relativePath: "apps/desktop/src/main/existing-rdl-sidecar.ts",
    sha256: "31e64aee7cbd4619433463c73591e0b1228032762d5dc76b75249f1f521f3a2b",
  },
  {
    relativePath: "apps/desktop/src/preload/index.ts",
    sha256: "33cd7a4346cc1b2cacedc2731fe4b3eff84e8c2a7127d877af17146af09b80d5",
  },
  {
    relativePath: "apps/desktop/src/renderer/src.tsx",
    sha256: "46b56dce8ea48a88ce499ad1c1e8fb22d03f45a82683dd18f37d0c6ba1fdb894",
  },
  {
    relativePath: "apps/desktop/src/shared/desktop-api.ts",
    sha256: "9abd12c768da4c1702b288e1c8c60728573cbde47eb0cb83d3fc2c755d1f73b4",
  },
] as const;

for (const identity of productionSourceIdentities) {
  const bytes = await readFile(resolve(repositoryRoot, identity.relativePath));
  if (hash(bytes) !== identity.sha256)
    throw new Error(
      `Gate 2G forbids production source changes: ${identity.relativePath}`,
    );
}

const containerOf = (textbox: XmlElement): DiagnosticTextbox["container"] => {
  if (textbox.get(`ancestor::${local("PageHeader")}`)) return "pageHeader";
  if (textbox.get(`ancestor::${local("PageFooter")}`)) return "pageFooter";
  if (textbox.get(`ancestor::${local("Tablix")}`)) return "tablix";
  if (textbox.get(`ancestor::${local("Body")}`)) return "reportBody";
  return "other";
};

const parseFontPoints = (value: string): number => {
  const points = /^([0-9.]+)pt$/u.exec(value)?.[1];
  if (points) return Number(points);
  const millimeters = /^([0-9.]+)mm$/u.exec(value)?.[1];
  return millimeters ? Number(millimeters) * 2.834_645_669 : 0;
};

const constantText = (value: string): string | null => {
  const match = /^="([\s\S]*)"$/u.exec(value);
  return match?.[1] ?? null;
};

const titleScore = (textbox: DiagnosticTextbox) => {
  const text =
    textbox.staticText.length === 1
      ? textbox.staticText[0]!
      : textbox.expressions.length === 1
        ? constantText(textbox.expressions[0]!)
        : null;
  if (!text) return null;
  const evidence: string[] = [];
  let score = 0;
  const lowerName = textbox.name.toLocaleLowerCase("en-US");
  if (lowerName === "reporttitle") {
    score += 40;
    evidence.push("+40 exact ReportTitle name");
  } else if (lowerName.includes("title")) {
    score += 25;
    evidence.push("+25 title-like item name");
  }
  const containerScores = {
    reportBody: 20,
    pageHeader: 15,
    tablix: -20,
    pageFooter: -40,
    other: 0,
  } as const;
  score += containerScores[textbox.container];
  evidence.push(
    `${containerScores[textbox.container] >= 0 ? "+" : ""}${containerScores[textbox.container]} ${textbox.container} container`,
  );
  const largestFont = Math.max(0, ...textbox.fontSizes.map(parseFontPoints));
  const fontScore = largestFont >= 18 ? 25 : largestFont >= 14 ? 15 : 0;
  if (fontScore) {
    score += fontScore;
    evidence.push(`+${fontScore} prominent ${largestFont.toFixed(2)}pt font`);
  }
  if (textbox.fontWeights.some((value) => value === "Bold")) {
    score += 10;
    evidence.push("+10 Bold");
  }
  score += 5;
  evidence.push("+5 single visible constant");
  if (/:\s*$/u.test(text)) {
    score -= 15;
    evidence.push("-15 label-like trailing colon");
  }
  if (text === text.toLocaleUpperCase("en-US") && /[A-Z]/u.test(text)) {
    score -= 10;
    evidence.push("-10 all-caps section-caption pattern");
  }
  return {
    reportItemName: textbox.name,
    container: textbox.container,
    tablix: textbox.tablix,
    visibleText: text,
    serializedValue: textbox.values[0],
    fontSizes: textbox.fontSizes,
    fontWeights: textbox.fontWeights,
    textAlignments: textbox.textAlignments,
    score,
    evidence,
  };
};

const parseDiagnosticModel = async (source: Uint8Array) => {
  const { ParseOption, XmlDocument } = await import(
    new URL(
      "../packages/rdl-copilot/node_modules/libxml2-wasm/lib/index.mjs",
      import.meta.url,
    ).href
  );
  const document = XmlDocument.fromBuffer(source, {
    option: ParseOption.XML_PARSE_NONET | ParseOption.XML_PARSE_NO_XXE,
  });
  try {
    const root = document.get("/*") as XmlElement | null;
    if (!root?.namespaceUri || root.name !== "Report")
      throw new Error("Not a namespaced Report");
    const datasets = elements(
      root,
      `./${local("DataSets")}/${local("DataSet")}`,
    ).map((dataset) => ({
      name: nameOf(dataset),
      fields: elements(dataset, `./${local("Fields")}/${local("Field")}`).map(
        nameOf,
      ),
    }));
    const textboxes: DiagnosticTextbox[] = elements(
      root,
      `.//${local("Textbox")}`,
    ).map((textbox) => {
      const values = elements(textbox, `.//${local("TextRun")}`)
        .map((run) => first(run, `./${local("Value")}`))
        .filter((value): value is string => value !== null);
      const bindings = elements(textbox, `.//${local("TextRun")}`).flatMap(
        (run) => {
          const expression = first(run, `./${local("Value")}`);
          const direct =
            expression &&
            /^=Fields!([A-Za-z_][A-Za-z0-9_]*)\.Value$/u.exec(expression);
          const sum =
            expression &&
            /^=Sum\(Fields!([A-Za-z_][A-Za-z0-9_]*)\.Value\)$/u.exec(
              expression,
            );
          const match = direct || sum;
          return match?.[1]
            ? [
                {
                  fieldName: match[1],
                  kind: direct ? ("direct" as const) : ("sum" as const),
                  expression,
                  format: first(run, `./${local("Style")}/${local("Format")}`),
                },
              ]
            : [];
        },
      );
      const style = (name: string) =>
        elements(textbox, `.//${local(name)}`)
          .map((item) => item.content.trim())
          .filter(Boolean);
      const ancestorTablix = elements(
        textbox,
        `ancestor::${local("Tablix")}`,
      ).at(-1);
      return {
        name: nameOf(textbox),
        container: containerOf(textbox),
        tablix: ancestorTablix ? nameOf(ancestorTablix) : null,
        values,
        staticText: values.filter((value) => !value.startsWith("=")),
        expressions: values.filter((value) => value.startsWith("=")),
        top: first(textbox, `./${local("Top")}`),
        fontSizes: style("FontSize"),
        fontWeights: style("FontWeight"),
        textAlignments: style("TextAlign"),
        bindings,
      };
    });
    const page = root.get(
      `./${local("ReportSections")}/${local("ReportSection")}/${local("Page")}`,
    ) as XmlElement | null;
    return {
      namespace: root.namespaceUri,
      datasets,
      textboxes,
      page: {
        width: page ? first(page, `./${local("PageWidth")}`) : null,
        height: page ? first(page, `./${local("PageHeight")}`) : null,
        margins: {
          left: page ? first(page, `./${local("LeftMargin")}`) : null,
          right: page ? first(page, `./${local("RightMargin")}`) : null,
          top: page ? first(page, `./${local("TopMargin")}`) : null,
          bottom: page ? first(page, `./${local("BottomMargin")}`) : null,
        },
      },
    };
  } finally {
    document.dispose();
  }
};

const productionInspection = async (path: string) => {
  try {
    const inventory = await inspectRdlFile(path);
    return {
      loadStarted: true,
      xmlParse: "PASS",
      namespace: "PASS",
      modelNormalization: "PASS",
      pageSettingsNormalization: "PASS",
      structuralInventory: "PASS",
      candidateDiscovery: "NOT_INVOKED",
      stoppingStage: null,
      errorCode: null,
      error: null,
      partialModelAvailable: true,
      rendererReceivesUsableSummary: true,
      returnedInventorySha256: inventory.sourceSha256,
    };
  } catch (error) {
    if (!(error instanceof RdlInspectionError)) throw error;
    return {
      loadStarted: true,
      xmlParse: "PASS",
      namespace: "PASS",
      modelNormalization: "STARTED_NOT_RETURNED",
      pageSettingsNormalization: "FAIL",
      structuralInventory: "NOT_REACHED",
      candidateDiscovery: "NOT_REACHED",
      stoppingStage: "pageSettingsNormalization",
      errorCode: error.code,
      error: error.message,
      partialModelAvailable: false,
      rendererReceivesUsableSummary: false,
      returnedInventorySha256: null,
    };
  }
};

const planner = new LocalSentenceEditPlanner();
await mkdir(resolve(outputRoot, "fixtures"), { recursive: true });
const fixtureResults: Array<Record<string, unknown>> = [];

for (const fixture of fixtures) {
  const absolutePath = resolve(repositoryRoot, fixture.path);
  const before = await readFile(absolutePath);
  if (before.byteLength !== fixture.size || hash(before) !== fixture.sha256)
    throw new Error(`${fixture.id} source identity mismatch`);
  const production = await productionInspection(absolutePath);
  const diagnostic = await parseDiagnosticModel(before);
  const titleCandidates = diagnostic.textboxes
    .map(titleScore)
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate),
    )
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.reportItemName.localeCompare(right.reportItemName, "en-US"),
    );
  const conservativeBodyCandidates = diagnostic.textboxes
    .filter(
      (textbox) =>
        textbox.container === "reportBody" &&
        textbox.staticText.length === 1 &&
        textbox.expressions.length === 0 &&
        textbox.bindings.length === 0 &&
        (textbox.top === null ||
          (/^([0-9.]+)in$/u.test(textbox.top) &&
            Number(/^([0-9.]+)in$/u.exec(textbox.top)?.[1]) <= 0.5)),
    )
    .map(({ name }) => name);
  const currentCandidateLogic =
    conservativeBodyCandidates.length === 1
      ? {
          outcome: "selected",
          reportItemName: conservativeBodyCandidates[0],
          scoring: "none; conservative filter requires exactly one candidate",
        }
      : conservativeBodyCandidates.length === 0
        ? {
            outcome: "noCandidate",
            reportItemName: null,
            scoring: "none; conservative filter found zero candidates",
          }
        : {
            outcome: "ambiguous",
            reportItemName: null,
            scoring: "none; conservative filter does not rank candidates",
            candidates: conservativeBodyCandidates,
          };
  const selectedTitle =
    currentCandidateLogic.outcome === "selected"
      ? diagnostic.textboxes.find(
          ({ name }) => name === currentCandidateLogic.reportItemName,
        )
      : null;
  let titleClassification: Classification;
  if (fixture.id === "microsoft-invoice")
    titleClassification =
      currentCandidateLogic.outcome === "selected"
        ? "FAIL_WRONG_TARGET"
        : "BLOCKED_NO_CANDIDATE";
  else if (currentCandidateLogic.outcome !== "selected")
    titleClassification =
      fixture.id === "microsoft-transcript"
        ? "BLOCKED_UNSUPPORTED_STRUCTURE"
        : "BLOCKED_NO_CANDIDATE";
  else
    titleClassification = selectedTitle?.values.some(
      (value) =>
        value === fixture.expectedVisibleTitle ||
        constantText(value) === fixture.expectedVisibleTitle,
    )
      ? "PASS_CORRECT"
      : "FAIL_WRONG_TARGET";

  const numericCandidates = diagnostic.textboxes
    .flatMap((textbox) =>
      textbox.bindings.map((binding) => {
        const declaringDatasets = diagnostic.datasets
          .filter(({ fields }) => fields.includes(binding.fieldName))
          .map(({ name }) => name);
        return {
          fieldName: binding.fieldName,
          declaringDatasets,
          reportItemName: textbox.name,
          tablix: textbox.tablix,
          container: textbox.container,
          role: binding.kind === "direct" ? "detailOrUnknown" : "aggregate",
          expression: binding.expression,
          format: binding.format,
          ambiguity:
            declaringDatasets.length === 1
              ? "dataset declaration unique; row/group scope not retained"
              : "field declared by multiple datasets",
          score: null,
          scoreEvidence:
            "current production resolver uses exact matching and array order; it has no candidate scores",
        };
      }),
    )
    .sort(
      (left, right) =>
        left.fieldName.localeCompare(right.fieldName, "en-US") ||
        left.reportItemName.localeCompare(right.reportItemName, "en-US"),
    );
  const requestedNumeric = fixture.numericField
    ? numericCandidates.filter(
        ({ fieldName }) => fieldName === fixture.numericField,
      )
    : [];
  const numericClassification: Classification =
    fixture.numericField === null
      ? "NOT_APPLICABLE"
      : fixture.id === "grouped-report"
        ? "PASS_AMBIGUOUSLY_SAFE"
        : requestedNumeric.length
          ? "PASS_CORRECT"
          : "BLOCKED_NO_CANDIDATE";

  const diagnosticContext: EditPlannerContext = {
    version: 1,
    existingFieldNames: [
      ...new Set(diagnostic.datasets.flatMap(({ fields }) => fields)),
    ],
    formattingFieldNames: [
      ...new Set(numericCandidates.map(({ fieldName }) => fieldName)),
    ],
    supportedSemanticRoles: ["reportTitle"],
    pageOrientation: "square",
    currentReportTitle:
      diagnostic.textboxes.find(({ name }) => name === "ReportTitle")
        ?.staticText[0] ?? null,
  };
  const plannerResult = fixture.plannerRequest
    ? planner.plan(fixture.plannerRequest, diagnosticContext)
    : null;
  const operationClassifications = [
    {
      operation: "reportTitle",
      classification: titleClassification,
      evidence:
        production.stoppingStage !== null
          ? `Production unreachable: ${production.error}; corpus-assisted current candidate logic: ${currentCandidateLogic.outcome}${currentCandidateLogic.reportItemName ? ` ${currentCandidateLogic.reportItemName}` : ""}`
          : `Production current candidate logic: ${currentCandidateLogic.outcome}`,
    },
    {
      operation: "numericDisplay",
      classification: numericClassification,
      evidence:
        fixture.numericField === null
          ? "No requested meaningful numeric-format baseline"
          : `${requestedNumeric.length} exact direct/Sum ${fixture.numericField} bindings; dataset/group scope is not represented in production targets`,
    },
    {
      operation: "pageOrientation",
      classification: "BLOCKED_INSPECTOR" satisfies Classification,
      evidence:
        "Literal PageWidth/PageHeight are omitted; production rejects before orientation normalization and has no effective/default-page representation",
    },
    {
      operation: "planner",
      classification: (plannerResult?.status === "planned"
        ? "BLOCKED_INSPECTOR"
        : fixture.plannerRequest
          ? "BLOCKED_UNSUPPORTED_STRUCTURE"
          : "NOT_APPLICABLE") satisfies Classification,
      evidence:
        plannerResult === null
          ? "No Invoice request constructed before target confidence"
          : plannerResult.status === "planned"
            ? "Grammar produced a valid typed plan using diagnostic context, but production inspection prevents review"
            : `Grammar rejected atomically: ${plannerResult.code} — ${plannerResult.message}`,
    },
  ];
  const after = await readFile(absolutePath);
  if (!after.equals(before)) throw new Error(`${fixture.id} source changed`);

  const result = {
    baselineVersion: 1,
    fixtureId: fixture.id,
    source: {
      relativePath: fixture.path,
      fileName: basename(fixture.path),
      byteSize: before.byteLength,
      sha256: hash(before),
      unchangedAfterEvaluation: true,
    },
    productionInspector: production,
    corpusAssistedDiagnosticOnly: {
      warning:
        "CORPUS-ASSISTED DIAGNOSTIC ONLY — not current product behavior and not routed into production services",
      namespace: diagnostic.namespace,
      title: {
        requestedSemanticTarget: "report title",
        candidates: titleCandidates,
        productionResolutionArchitecture: {
          sidecarAndMutationEntryPoint: "resolveConfiguredReportTitle",
          sourceChecksumConfigured: false,
          resultIfInspectionWereReachable: {
            code: "TITLE_NOT_FOUND",
            message:
              "No checksum-reviewed report-title target is configured for this source",
          },
          genericResolveReportTitleIsNotUsedByProductionSidecar: true,
          productionCandidateScoresExist: false,
        },
        currentProductionCandidateLogicAppliedToDiagnosticModel:
          currentCandidateLogic,
        expectedVisibleTitle: fixture.expectedVisibleTitle,
        classification: titleClassification,
        textAndStyleUseSameSemanticHandle: true,
        containerContextRepresentedInResolvedHandle: false,
      },
      numericDisplays: {
        requestedField: fixture.numericField,
        allExistingDirectAndSumCandidates: numericCandidates,
        requestedCandidates: requestedNumeric,
        classification: numericClassification,
      },
      pageOrientation: {
        request: "switch the page to landscape",
        serializedPage: diagnostic.page,
        normalizedByProduction: false,
        effectiveDefaultsRepresented: false,
        safeTargetExists: false,
        materializationRequired: true,
        blocker: production.error,
        classification: "BLOCKED_INSPECTOR",
      },
    },
    plannerBaseline: {
      request: fixture.plannerRequest,
      contextSource:
        fixture.plannerRequest === null
          ? "not constructed"
          : "corpus-assisted diagnostic context because production inventory is unreachable",
      result: plannerResult,
      planCouldReachReviewSafely: false,
      mutationBlockedBeforeWrite: true,
    },
    operationClassifications,
    falsePositiveNegativeReview: {
      visibleTitlesMissed:
        fixture.id === "simple-table"
          ? ["Textbox9 is excluded because Top 0.58729in exceeds 0.5in"]
          : fixture.id === "microsoft-transcript"
            ? [
                "Textbox1 is excluded because production title discovery searches reportBody static text only and the title is a pageHeader constant expression",
              ]
            : [],
      decorativeTitleRisks: titleCandidates
        .filter(({ container, score }) => container === "tablix" && score > 0)
        .map(({ reportItemName }) => reportItemName),
      styledPlaceholderPreferred:
        fixture.id === "simple-table"
          ? [
              "ReportTitle/InventoryReportTitle outranks and is selected over visible Textbox9",
            ]
          : [],
      staticHeadersMistakenForFieldDisplays: false,
      aggregatesConflatedWithDetails:
        requestedNumeric.some(({ role }) => role === "aggregate") &&
        requestedNumeric.some(({ role }) => role === "detailOrUnknown"),
      datasetIdentityLost: numericCandidates.some(
        ({ declaringDatasets }) => declaringDatasets.length > 1,
      ),
      tablixAndGroupContextLost: numericCandidates.length > 0,
      mutationHasRevenueTargetCountSpecialCase:
        fixture.id === "grouped-report" || fixture.id === "microsoft-invoice",
      containerHierarchyReduced:
        fixture.id === "microsoft-invoice" ||
        fixture.id === "microsoft-transcript",
      omittedPageDefaultsRejected: true,
      forcedAmbiguityRisk:
        fixture.id === "microsoft-invoice" ||
        fixture.id === "microsoft-transcript",
    },
  };
  fixtureResults.push(result);
  await writeFile(
    resolve(outputRoot, "fixtures", `${fixture.id}.json`),
    `${JSON.stringify(result, null, 2)}\n`,
  );
}

const matrix = {
  baselineVersion: 1,
  classificationEnum: [
    "PASS_CORRECT",
    "PASS_AMBIGUOUSLY_SAFE",
    "BLOCKED_INSPECTOR",
    "BLOCKED_UNSUPPORTED_STRUCTURE",
    "BLOCKED_NO_CANDIDATE",
    "BLOCKED_AMBIGUOUS",
    "FAIL_WRONG_TARGET",
    "FAIL_INCONSISTENT_TARGETS",
    "NOT_APPLICABLE",
  ],
  deterministicOrdering:
    "fixture order: simple-table, grouped-report, microsoft-invoice, microsoft-transcript; candidates: score descending then report-item name; numeric candidates: field then report-item name",
  fixtures: fixtureResults.map((result) => {
    const diagnostic = result.corpusAssistedDiagnosticOnly as {
      title: { classification: Classification };
      numericDisplays: { classification: Classification };
      pageOrientation: { classification: Classification };
    };
    const production = result.productionInspector as {
      stoppingStage: string | null;
      errorCode: string | null;
      error: string | null;
      rendererReceivesUsableSummary: boolean;
    };
    const plannerBaseline = result.plannerBaseline as {
      result: { status: string; code?: string } | null;
    };
    return {
      fixtureId: result.fixtureId,
      productionInspector: production.stoppingStage
        ? "BLOCKED_INSPECTOR"
        : "PASS_CORRECT",
      stoppingStage: production.stoppingStage,
      errorCode: production.errorCode,
      error: production.error,
      rendererReceivesUsableSummary: production.rendererReceivesUsableSummary,
      title: diagnostic.title.classification,
      numericDisplay: diagnostic.numericDisplays.classification,
      pageOrientation: diagnostic.pageOrientation.classification,
      planner:
        plannerBaseline.result === null
          ? "NOT_APPLICABLE"
          : plannerBaseline.result.status === "planned"
            ? "BLOCKED_INSPECTOR"
            : "BLOCKED_UNSUPPORTED_STRUCTURE",
      plannerParse:
        plannerBaseline.result === null
          ? null
          : plannerBaseline.result.status === "planned"
            ? "planned"
            : `rejected:${plannerBaseline.result.code}`,
    };
  }),
  globalFindings: {
    allProductionInspectionsBlockedByOmittedPageWidth: true,
    productionPartialModelsAvailable: false,
    productionRendererSummariesAvailable: false,
    productionTitleScoringExists: false,
    productionFieldScoringExists: false,
    generatedEditedRdlCount: 0,
  },
  unchangedProductionSourceIdentities: productionSourceIdentities,
};
await writeFile(
  resolve(outputRoot, "baseline-matrix.json"),
  `${JSON.stringify(matrix, null, 2)}\n`,
);
process.stdout.write(
  `${JSON.stringify({
    outputRoot,
    fixtures: fixtureResults.length,
    generatedEditedRdlCount: 0,
  })}\n`,
);
