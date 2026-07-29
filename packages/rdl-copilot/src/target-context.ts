import { createHash } from "node:crypto";
import type { XmlElement, XmlNode } from "libxml2-wasm";
import { z } from "zod";

const regionSchema = z.enum(["body", "pageHeader", "pageFooter"]);
const scopeRoleSchema = z.enum([
  "detail",
  "groupHeader",
  "groupSubtotal",
  "grandTotal",
  "staticHeader",
  "staticLabel",
  "standalone",
  "unknown",
]);
const evidenceSchema = z
  .object({
    role: scopeRoleSchema,
    confidence: z.enum(["high", "medium", "low"]),
    evidence: z.array(z.string()),
  })
  .strict();
const fieldIdentitySchema = z.discriminatedUnion("certainty", [
  z
    .object({
      certainty: z.literal("certain"),
      fieldName: z.string(),
      datasetName: z.string(),
      possibleDatasets: z.array(z.string()).length(1),
      uniqueAcrossReport: z.boolean(),
    })
    .strict(),
  z
    .object({
      certainty: z.literal("ambiguous"),
      fieldName: z.string(),
      possibleDatasets: z.array(z.string()).min(2),
      uniqueAcrossReport: z.literal(false),
    })
    .strict(),
  z
    .object({
      certainty: z.literal("unavailable"),
      fieldName: z.string(),
      possibleDatasets: z.array(z.string()),
      uniqueAcrossReport: z.boolean(),
    })
    .strict(),
]);
const expressionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("staticText"), text: z.string() }).strict(),
  z
    .object({
      kind: z.literal("constantStringExpression"),
      expression: z.string(),
      text: z.string(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("directFieldReference"),
      expression: z.string(),
      fieldName: z.string(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("aggregateExpression"),
      expression: z.string(),
      functionName: z.string(),
      fieldName: z.string().nullable(),
      explicitScope: z.string().nullable(),
    })
    .strict(),
  z
    .object({ kind: z.literal("parameterExpression"), expression: z.string() })
    .strict(),
  z
    .object({
      kind: z.literal("reportGlobalExpression"),
      expression: z.string(),
    })
    .strict(),
  z
    .object({ kind: z.literal("codeExpression"), expression: z.string() })
    .strict(),
  z
    .object({ kind: z.literal("compoundExpression"), expression: z.string() })
    .strict(),
  z
    .object({ kind: z.literal("unknownExpression"), expression: z.string() })
    .strict(),
]);
const locationSchema = z
  .object({
    reportSectionIndex: z.number().int().nonnegative(),
    region: regionSchema,
    structuralPath: z.string(),
    containerChain: z.array(z.string()),
    rectangleAncestry: z.array(z.string()),
    tablixAncestry: z.array(z.string()),
    tablixName: z.string().nullable(),
    tablixDatasetName: z.string().nullable(),
    rowMemberPath: z.array(z.string()),
    columnMemberPath: z.array(z.string()),
    groupNames: z.array(z.string()),
    groupExpressions: z.array(z.string()),
    memberKinds: z.array(z.enum(["static", "dynamic"])),
    repeatProperties: z.array(z.string()),
    detailGroup: z.boolean(),
    pageBreakContext: z.array(z.string()),
    top: z.string().nullable(),
    left: z.string().nullable(),
    width: z.string().nullable(),
    height: z.string().nullable(),
    hidden: z
      .object({
        status: z.enum(["visible", "hidden", "expression", "unspecified"]),
        expression: z.string().nullable(),
      })
      .strict(),
  })
  .strict();
const commonCandidateSchema = z
  .object({
    diagnosticId: z.string(),
    reportItemType: z.literal("Textbox"),
    reportItemName: z.string(),
    location: locationSchema,
    expression: expressionSchema,
    fontSizes: z.array(z.string()),
    fontWeights: z.array(z.string()),
    textAlignments: z.array(z.string()),
    currentFormat: z.string().nullable(),
    scope: evidenceSchema,
  })
  .strict();
const titleCandidateSchema = commonCandidateSchema
  .extend({
    visibleText: z.string(),
    positiveEvidence: z.array(z.string()),
    negativeEvidence: z.array(z.string()),
    evidenceSummary: z.string(),
  })
  .strict();
const fieldCandidateSchema = commonCandidateSchema
  .extend({
    expression: z.discriminatedUnion("kind", [
      expressionSchema.options[2],
      expressionSchema.options[3],
    ]),
    fieldIdentity: fieldIdentitySchema,
    safeFromStaticHeader: z.literal(true),
    sameFieldLocations: z.number().int().positive(),
  })
  .strict();

export const targetCandidateCatalogSchema = z
  .object({
    version: z.literal(1),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    titleCandidates: z.array(titleCandidateSchema),
    fieldDisplayCandidates: z.array(fieldCandidateSchema),
    datasetOverlaps: z.array(
      z
        .object({
          fieldName: z.string(),
          datasetNames: z.array(z.string()).min(2),
        })
        .strict(),
    ),
    selectedTarget: z.null(),
    mutationAuthorized: z.literal(false),
  })
  .strict();

export type TargetCandidateCatalog = z.infer<
  typeof targetCandidateCatalogSchema
>;
export type TargetTitleCandidate = z.infer<typeof titleCandidateSchema>;
export type TargetFieldCandidate = z.infer<typeof fieldCandidateSchema>;

const local = (name: string): string => `*[local-name()='${name}']`;
const elements = (node: XmlNode, xpath: string): XmlElement[] =>
  node.find(xpath) as XmlElement[];
const first = (node: XmlNode, xpath: string): string | null =>
  node.get(xpath)?.content.trim() || null;
const itemName = (element: XmlElement): string =>
  element.attr("Name")?.value.trim() ?? "";
const ancestors = (element: XmlElement, name: string): XmlElement[] =>
  elements(element, `ancestor::${local(name)}`);

export const classifyTextboxValue = (
  value: string,
): z.infer<typeof expressionSchema> => {
  if (!value.startsWith("=")) return { kind: "staticText", text: value };
  const constant = /^=\s*"((?:""|[^"])*)"\s*$/u.exec(value);
  if (constant)
    return {
      kind: "constantStringExpression",
      expression: value,
      text: (constant[1] ?? "").replaceAll('""', '"'),
    };
  const direct = /^=\s*Fields!([A-Za-z_][A-Za-z0-9_]*)\.Value\s*$/iu.exec(
    value,
  );
  if (direct?.[1])
    return {
      kind: "directFieldReference",
      expression: value,
      fieldName: direct[1],
    };
  const aggregate =
    /^=\s*([A-Za-z_][A-Za-z0-9_]*)\(\s*Fields!([A-Za-z_][A-Za-z0-9_]*)\.Value(?:\s*,\s*"([^"]+)")?\s*\)\s*$/iu.exec(
      value,
    );
  if (aggregate)
    return {
      kind: "aggregateExpression",
      expression: value,
      functionName: aggregate[1]!,
      fieldName: aggregate[2] ?? null,
      explicitScope: aggregate[3] ?? null,
    };
  if (/^=\s*Parameters!/iu.test(value))
    return { kind: "parameterExpression", expression: value };
  if (/^=\s*(?:Globals|User)!/iu.test(value))
    return { kind: "reportGlobalExpression", expression: value };
  if (/^=\s*Code\./iu.test(value))
    return { kind: "codeExpression", expression: value };
  if (/[&+\-*/]|\b(?:Fields|Parameters|Globals|Code)!?/iu.test(value))
    return { kind: "compoundExpression", expression: value };
  return { kind: "unknownExpression", expression: value };
};

type MemberLeaf = {
  path: string[];
  groupNames: string[];
  groupExpressions: string[];
  memberKinds: ("static" | "dynamic")[];
  repeatProperties: string[];
  pageBreakContext: string[];
  detailGroup: boolean;
  keepWithGroup: string | null;
};

const memberLeaves = (
  hierarchy: XmlElement | null,
  axis: "row" | "column",
): MemberLeaf[] => {
  if (!hierarchy) return [];
  const walk = (
    member: XmlElement,
    path: string[],
    inherited: Omit<MemberLeaf, "path" | "keepWithGroup">,
  ): MemberLeaf[] => {
    const group = member.get(`./${local("Group")}`) as XmlElement | null;
    const groupName = group ? itemName(group) : "";
    const own = {
      groupNames: groupName
        ? [...inherited.groupNames, groupName]
        : inherited.groupNames,
      groupExpressions: group
        ? [
            ...inherited.groupExpressions,
            ...elements(
              group,
              `./${local("GroupExpressions")}/${local("GroupExpression")}`,
            ).map((entry) => entry.content.trim()),
          ]
        : inherited.groupExpressions,
      memberKinds: [
        ...inherited.memberKinds,
        group ? ("dynamic" as const) : ("static" as const),
      ],
      repeatProperties: [
        ...inherited.repeatProperties,
        ...["RepeatOnNewPage", "FixedData", "KeepWithGroup"].flatMap((name) => {
          const value = first(member, `./${local(name)}`);
          return value ? [`${name}=${value}`] : [];
        }),
      ],
      pageBreakContext: [
        ...inherited.pageBreakContext,
        ...elements(member, `.//${local("PageBreak")}`).flatMap((pageBreak) => {
          const location = first(pageBreak, `./${local("BreakLocation")}`);
          return location ? [`BreakLocation=${location}`] : [];
        }),
      ],
      detailGroup:
        inherited.detailGroup ||
        (group !== null &&
          (groupName === "Details" ||
            first(group, `./${local("GroupExpressions")}`) === null)),
    };
    const children = elements(
      member,
      `./${local("TablixMembers")}/${local("TablixMember")}`,
    );
    if (!children.length)
      return [
        {
          path,
          ...own,
          keepWithGroup: first(member, `./${local("KeepWithGroup")}`),
        },
      ];
    return children.flatMap((child, index) =>
      walk(child, [...path, `${axis}Member[${index}]`], own),
    );
  };
  return elements(
    hierarchy,
    `./${local("TablixMembers")}/${local("TablixMember")}`,
  ).flatMap((member, index) =>
    walk(member, [`${axis}Member[${index}]`], {
      groupNames: [],
      groupExpressions: [],
      memberKinds: [],
      repeatProperties: [],
      pageBreakContext: [],
      detailGroup: false,
    }),
  );
};

const regionOf = (textbox: XmlElement): z.infer<typeof regionSchema> =>
  textbox.get(`ancestor::${local("PageHeader")}`)
    ? "pageHeader"
    : textbox.get(`ancestor::${local("PageFooter")}`)
      ? "pageFooter"
      : "body";

const visibility = (textbox: XmlElement) => {
  const hidden = first(textbox, `./${local("Visibility")}/${local("Hidden")}`);
  if (hidden === null)
    return { status: "unspecified" as const, expression: null };
  if (hidden.startsWith("="))
    return { status: "expression" as const, expression: hidden };
  return {
    status:
      hidden.toLowerCase() === "true"
        ? ("hidden" as const)
        : ("visible" as const),
    expression: null,
  };
};

const roleFor = (
  expression: z.infer<typeof expressionSchema>,
  leaf: MemberLeaf | null,
  rowIndex: number | null,
  inTablix: boolean,
): z.infer<typeof evidenceSchema> => {
  if (!inTablix)
    return {
      role: "standalone",
      confidence: "high",
      evidence: ["textbox is outside a tablix"],
    };
  if (leaf?.detailGroup)
    return {
      role: "detail",
      confidence: "high",
      evidence: ["row member is within a detail group"],
    };
  if (expression.kind === "aggregateExpression") {
    if (leaf?.groupNames.length)
      return {
        role: "groupSubtotal",
        confidence: "high",
        evidence: [
          `aggregate row remains inside group ${leaf.groupNames.at(-1)}`,
        ],
      };
    return {
      role: "grandTotal",
      confidence: "high",
      evidence: ["aggregate row is outside semantic row groups"],
    };
  }
  if (expression.kind === "directFieldReference" && leaf?.groupNames.length)
    return {
      role: "groupHeader",
      confidence: "medium",
      evidence: [`field-bound row is inside group ${leaf.groupNames.at(-1)}`],
    };
  if (
    expression.kind === "staticText" ||
    expression.kind === "constantStringExpression"
  )
    return {
      role: rowIndex === 0 ? "staticHeader" : "staticLabel",
      confidence: rowIndex === 0 ? "high" : "medium",
      evidence: [
        rowIndex === 0
          ? "static text appears in first tablix row"
          : "static text appears in a tablix row",
      ],
    };
  return { role: "unknown", confidence: "low", evidence: [] };
};

export const catalogRdlBytes = async (
  source: Uint8Array,
): Promise<TargetCandidateCatalog> => {
  const { ParseOption, XmlDocument } = await import("libxml2-wasm");
  const document = XmlDocument.fromBuffer(source, {
    option: ParseOption.XML_PARSE_NONET | ParseOption.XML_PARSE_NO_XXE,
  });
  try {
    const root = document.get("/*") as XmlElement;
    const datasets = new Map<string, Set<string>>();
    for (const dataset of elements(
      root,
      `./${local("DataSets")}/${local("DataSet")}`,
    ))
      datasets.set(
        itemName(dataset),
        new Set(
          elements(dataset, `./${local("Fields")}/${local("Field")}`).map(
            itemName,
          ),
        ),
      );
    const declaringDatasets = (fieldName: string): string[] =>
      [...datasets]
        .filter(([, fields]) => fields.has(fieldName))
        .map(([name]) => name)
        .sort();
    const textboxRecords = elements(root, `.//${local("Textbox")}`).flatMap(
      (textbox) => {
        const values = elements(
          textbox,
          `.//${local("TextRun")}/${local("Value")}`,
        )
          .map((value) => value.content.trim())
          .filter(Boolean);
        const value = values[0];
        if (!value) return [];
        const expression = classifyTextboxValue(value);
        const tablixes = ancestors(textbox, "Tablix");
        const tablix = tablixes.at(-1) ?? null;
        const tablixName = tablix ? itemName(tablix) : null;
        const tablixDatasetName = tablix
          ? first(tablix, `./${local("DataSetName")}`)
          : null;
        const row = textbox.get(
          `ancestor::${local("TablixRow")}[1]`,
        ) as XmlElement | null;
        const rowIndex = row
          ? elements(row, `preceding-sibling::${local("TablixRow")}`).length
          : null;
        const cell = textbox.get(
          `ancestor::${local("TablixCell")}[1]`,
        ) as XmlElement | null;
        const columnIndex = cell
          ? elements(cell, `preceding-sibling::${local("TablixCell")}`).length
          : null;
        const rowLeaves = tablix
          ? memberLeaves(
              tablix.get(
                `./${local("TablixRowHierarchy")}`,
              ) as XmlElement | null,
              "row",
            )
          : [];
        const columnLeaves = tablix
          ? memberLeaves(
              tablix.get(
                `./${local("TablixColumnHierarchy")}`,
              ) as XmlElement | null,
              "column",
            )
          : [];
        const directMember = textbox.get(
          `ancestor::${local("TablixMember")}[1]`,
        ) as XmlElement | null;
        const directMemberGroups = directMember
          ? elements(
              directMember,
              `ancestor-or-self::${local("TablixMember")}/${local("Group")}`,
            )
          : [];
        const leaf =
          rowIndex !== null
            ? (rowLeaves[rowIndex] ?? null)
            : directMember
              ? {
                  path: ["rowHeaderMember"],
                  groupNames: directMemberGroups.map(itemName),
                  groupExpressions: elements(
                    directMember,
                    `ancestor-or-self::${local("TablixMember")}/${local("Group")}/${local("GroupExpressions")}/${local("GroupExpression")}`,
                  ).map((entry) => entry.content.trim()),
                  memberKinds: [
                    directMember.get(`./${local("Group")}`)
                      ? ("dynamic" as const)
                      : ("static" as const),
                  ],
                  repeatProperties: [],
                  pageBreakContext: [],
                  detailGroup: directMemberGroups.some(
                    (group) =>
                      itemName(group) === "Details" ||
                      first(group, `./${local("GroupExpressions")}`) === null,
                  ),
                  keepWithGroup: first(
                    directMember,
                    `./${local("KeepWithGroup")}`,
                  ),
                }
              : null;
        const rectangles = ancestors(textbox, "Rectangle").map(itemName);
        const reportSection =
          ancestors(textbox, "ReportSection").at(-1) ?? null;
        const reportSectionIndex = reportSection
          ? elements(
              reportSection,
              `preceding-sibling::${local("ReportSection")}`,
            ).length
          : 0;
        const containerChain = elements(
          textbox,
          "ancestor::*[local-name()='Rectangle' or local-name()='Tablix']",
        ).map((entry) => `${entry.name}(${itemName(entry)})`);
        const region = regionOf(textbox);
        const pathParts = [
          `section[${reportSectionIndex}]`,
          region,
          ...containerChain,
          ...(rowIndex === null ? [] : [`row[${rowIndex}]`]),
          ...(columnIndex === null ? [] : [`cell[${columnIndex}]`]),
          `Textbox(${itemName(textbox)})`,
        ];
        const location = {
          reportSectionIndex,
          region,
          structuralPath: pathParts.join("/"),
          containerChain,
          rectangleAncestry: rectangles,
          tablixAncestry: tablixes.map(itemName),
          tablixName,
          tablixDatasetName,
          rowMemberPath: leaf?.path ?? [],
          columnMemberPath:
            columnIndex === null ? [] : (columnLeaves[columnIndex]?.path ?? []),
          groupNames: leaf?.groupNames ?? [],
          groupExpressions: leaf?.groupExpressions ?? [],
          memberKinds: leaf?.memberKinds ?? [],
          repeatProperties: leaf?.repeatProperties ?? [],
          detailGroup: leaf?.detailGroup ?? false,
          pageBreakContext: leaf?.pageBreakContext ?? [],
          top: first(textbox, `./${local("Top")}`),
          left: first(textbox, `./${local("Left")}`),
          width: first(textbox, `./${local("Width")}`),
          height: first(textbox, `./${local("Height")}`),
          hidden: visibility(textbox),
        };
        const common = {
          diagnosticId: createHash("sha256")
            .update(`${location.structuralPath}\0${value}`)
            .digest("hex")
            .slice(0, 20),
          reportItemType: "Textbox" as const,
          reportItemName: itemName(textbox),
          location,
          expression,
          fontSizes: elements(textbox, `.//${local("FontSize")}`).map((entry) =>
            entry.content.trim(),
          ),
          fontWeights: elements(textbox, `.//${local("FontWeight")}`).map(
            (entry) => entry.content.trim(),
          ),
          textAlignments: elements(textbox, `.//${local("TextAlign")}`).map(
            (entry) => entry.content.trim(),
          ),
          currentFormat: first(
            textbox,
            `.//${local("TextRun")}/${local("Style")}/${local("Format")}`,
          ),
          scope: roleFor(expression, leaf, rowIndex, tablix !== null),
        };
        return [{ common, expression }];
      },
    );
    const titleCandidates = textboxRecords.flatMap(({ common, expression }) => {
      const visibleText =
        expression.kind === "staticText" ||
        expression.kind === "constantStringExpression"
          ? expression.text
          : null;
      if (!visibleText) return [];
      const positiveEvidence = [
        ...(common.reportItemName.toLowerCase().includes("title")
          ? ["report-item name contains title"]
          : []),
        ...(common.fontSizes.length
          ? [`font size ${common.fontSizes[0]}`]
          : []),
        ...(common.fontWeights.includes("Bold") ? ["bold text"] : []),
        ...(["body", "pageHeader"].includes(common.location.region)
          ? [`located in ${common.location.region}`]
          : []),
      ];
      const negativeEvidence = [
        ...(common.scope.role === "staticHeader"
          ? ["located in a tablix static header"]
          : []),
        ...(common.location.region === "pageFooter"
          ? ["located in page footer"]
          : []),
        ...(common.location.hidden.status === "hidden" ? ["hidden item"] : []),
        ...(visibleText.length < 12 ? ["short label-like text"] : []),
        ...(common.scope.role === "staticLabel"
          ? ["likely static label or caption"]
          : []),
      ];
      return [
        titleCandidateSchema.parse({
          ...common,
          visibleText,
          positiveEvidence,
          negativeEvidence,
          evidenceSummary: [...positiveEvidence, ...negativeEvidence].join(
            "; ",
          ),
        }),
      ];
    });
    const preliminary = textboxRecords.flatMap(({ common, expression }) => {
      if (
        expression.kind !== "directFieldReference" &&
        expression.kind !== "aggregateExpression"
      )
        return [];
      const fieldName =
        expression.kind === "directFieldReference"
          ? expression.fieldName
          : expression.fieldName;
      if (!fieldName) return [];
      const possibleDatasets = declaringDatasets(fieldName);
      const bound = common.location.tablixDatasetName;
      const fieldIdentity =
        bound && possibleDatasets.includes(bound)
          ? {
              certainty: "certain" as const,
              fieldName,
              datasetName: bound,
              possibleDatasets: [bound],
              uniqueAcrossReport: possibleDatasets.length === 1,
            }
          : possibleDatasets.length > 1
            ? {
                certainty: "ambiguous" as const,
                fieldName,
                possibleDatasets,
                uniqueAcrossReport: false as const,
              }
            : possibleDatasets.length === 1
              ? {
                  certainty: "certain" as const,
                  fieldName,
                  datasetName: possibleDatasets[0]!,
                  possibleDatasets,
                  uniqueAcrossReport: true,
                }
              : {
                  certainty: "unavailable" as const,
                  fieldName,
                  possibleDatasets,
                  uniqueAcrossReport: false,
                };
      return [{ common, expression, fieldIdentity, fieldName }];
    });
    const fieldDisplayCandidates = preliminary.map((candidate) =>
      fieldCandidateSchema.parse({
        ...candidate.common,
        expression: candidate.expression,
        fieldIdentity: candidate.fieldIdentity,
        safeFromStaticHeader: true,
        sameFieldLocations: preliminary.filter(
          ({ fieldName }) => fieldName === candidate.fieldName,
        ).length,
      }),
    );
    const fieldDatasets = new Map<string, string[]>();
    for (const [datasetName, fields] of datasets)
      for (const fieldName of fields)
        fieldDatasets.set(fieldName, [
          ...(fieldDatasets.get(fieldName) ?? []),
          datasetName,
        ]);
    return targetCandidateCatalogSchema.parse({
      version: 1,
      sourceSha256: createHash("sha256").update(source).digest("hex"),
      titleCandidates,
      fieldDisplayCandidates,
      datasetOverlaps: [...fieldDatasets]
        .filter(([, names]) => names.length > 1)
        .map(([fieldName, datasetNames]) => ({
          fieldName,
          datasetNames: [...datasetNames].sort(),
        }))
        .sort((a, b) => a.fieldName.localeCompare(b.fieldName)),
      selectedTarget: null,
      mutationAuthorized: false,
    });
  } finally {
    document.dispose();
  }
};
