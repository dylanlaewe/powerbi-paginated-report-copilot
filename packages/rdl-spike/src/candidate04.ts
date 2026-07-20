import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCollectionConsistency } from "./compatibility";
import { assertWellFormed } from "./index";
import { sha256 } from "./ladder";

export const candidate03bPath = resolve(
  "artifacts/rdl-compatibility-ladder/03b-region-group-from-seed.rdl",
);
export const candidate03bSha256 =
  "f85dfd067e037336cb9a7fe7f5245b19a2030b01e2a997f0430a34b1f5090b88";
export const candidate04FileName = "04-region-subtotal.rdl";

const replaceExactlyOnce = (
  source: string,
  before: string,
  after: string,
  label: string,
): string => {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0)
    throw new Error(
      `Accepted Candidate 03b does not contain exactly one ${label}`,
    );
  return `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
};

const subtotalTextbox = (
  name: string,
  value: string,
  format?: string,
): string => `<Textbox Name="${name}">
                          <rd:DefaultName>${name}</rd:DefaultName>
                          <CanGrow>true</CanGrow>
                          <KeepTogether>true</KeepTogether>
                          <Paragraphs>
                            <Paragraph>
                              <TextRuns><TextRun><Value>${value}</Value><Style><FontWeight>Bold</FontWeight>${format ? `<Format>${format}</Format>` : ""}</Style></TextRun></TextRuns>
                              <Style>${format ? "<TextAlign>Right</TextAlign>" : ""}</Style>
                            </Paragraph>
                          </Paragraphs>
                          <Style><Border><Style>None</Style></Border><PaddingLeft>2pt</PaddingLeft><PaddingRight>2pt</PaddingRight><PaddingTop>2pt</PaddingTop><PaddingBottom>2pt</PaddingBottom></Style>
                        </Textbox>`;

const subtotalRow = `                <TablixRow>
                  <Height>0.25in</Height>
                  <TablixCells>
                    <TablixCell>
                      <CellContents>
                        ${subtotalTextbox("RegionSubtotalLabel", '=Fields!Region.Value &amp; " Total"')}
                        <ColSpan>5</ColSpan>
                      </CellContents>
                    </TablixCell>
                    <TablixCell><CellContents>${subtotalTextbox("RegionQuantitySubtotal", '=Sum(Fields!Quantity.Value, "Region")', "N0")}</CellContents></TablixCell>
                    <TablixCell><CellContents>${subtotalTextbox("RegionRevenueSubtotal", '=Sum(Fields!Revenue.Value, "Region")', "C2")}</CellContents></TablixCell>
                    <TablixCell><CellContents>${subtotalTextbox("RegionGrossProfitSubtotal", '=Sum(Fields!GrossProfit.Value, "Region")', "C2")}</CellContents></TablixCell>
                  </TablixCells>
                </TablixRow>`;

export const validateCandidate04Subtotal = (xml: string) => {
  const consistency = validateCollectionConsistency(xml, {
    requirePrintSafe: false,
  });
  const tablix = consistency.tablixes[0]!;
  if (
    tablix.columns !== 8 ||
    tablix.rows !== 3 ||
    tablix.columnHierarchyLeaves !== 8 ||
    tablix.rowHierarchyLeaves !== 3 ||
    tablix.rowCellWidths.join("|") !== "8|8|8"
  )
    throw new Error(
      "Candidate 04 tablix body/hierarchy relationship is invalid",
    );
  const aggregates = [
    '=Sum(Fields!Quantity.Value, "Region")',
    '=Sum(Fields!Revenue.Value, "Region")',
    '=Sum(Fields!GrossProfit.Value, "Region")',
  ];
  for (const aggregate of aggregates)
    if (xml.split(aggregate).length - 1 !== 1)
      throw new Error(`Missing unique Region-scoped aggregate ${aggregate}`);
  if (xml.match(/Sum\(/g)?.length !== 3)
    throw new Error("Candidate 04 must contain exactly three aggregates");
  if (!xml.includes('=Fields!Region.Value &amp; " Total"'))
    throw new Error("Candidate 04 Region subtotal label is absent");
  if (xml.includes("<PageBreak>"))
    throw new Error("Candidate 04 contains a page break");
  const groupNames = [...xml.matchAll(/<Group Name="([^"]+)"/g)].map(
    (match) => match[1]!,
  );
  if (groupNames.join("|") !== "Region|Region1|Details")
    throw new Error("Candidate 04 changed the accepted group hierarchy");
  const compact = xml.replaceAll(/\s+/g, "");
  const nesting = compact.indexOf(
    '<GroupName="Region"><GroupExpressions><GroupExpression>=Fields!Region.Value</GroupExpression></GroupExpressions></Group>',
  );
  const region1 = compact.indexOf('<GroupName="Region1">', nesting);
  const details = compact.indexOf('<GroupName="Details"/>', region1);
  const subtotalMember = compact.indexOf(
    "<TablixMember><KeepWithGroup>Before</KeepWithGroup></TablixMember>",
    details,
  );
  if (
    nesting < 0 ||
    region1 < nesting ||
    details < region1 ||
    subtotalMember < details
  )
    throw new Error(
      "Subtotal member is not reachable after Details under Region",
    );
  const regions = [
    ...xml.matchAll(/&lt;Region&gt;([^<&]+)&lt;\/Region&gt;/g),
  ].map((match) => match[1]!);
  if (regions.length !== 6 || new Set(regions).size !== 3)
    throw new Error("Candidate 04 embedded Region distribution changed");
  return {
    runtimeRegionInstances: 3,
    subtotalRowsPerRegion: 1,
    expectedRenderedSubtotalRows: 3,
    aggregateScope: "Region",
    aggregateExpressions: aggregates,
    labelExpression: '=Fields!Region.Value & " Total"',
    detailsReachableBeneathRegion: "PASS",
    reportLevelTotal: "NONE",
    pageBreakDefinitions: "NONE",
    consistency,
  };
};

export const deriveCandidate04 = (candidate03b: string): string => {
  if (sha256(candidate03b) !== candidate03bSha256)
    throw new Error("Accepted Candidate 03b SHA-256 differs from the baseline");
  let candidate = replaceExactlyOnce(
    candidate03b,
    "              </TablixRows>",
    `${subtotalRow}\n              </TablixRows>`,
    "TablixRows closing element",
  );
  const hierarchyTail = `                      </TablixMembers>
                    </TablixMember>
                  </TablixMembers>
                </TablixMember>
              </TablixMembers>
            </TablixRowHierarchy>`;
  candidate = replaceExactlyOnce(
    candidate,
    hierarchyTail,
    `                      </TablixMembers>
                    </TablixMember>
                    <TablixMember>
                      <KeepWithGroup>Before</KeepWithGroup>
                    </TablixMember>
                  </TablixMembers>
                </TablixMember>
              </TablixMembers>
            </TablixRowHierarchy>`,
    "Region hierarchy tail",
  );
  candidate = replaceExactlyOnce(
    candidate,
    "<Height>0.55in</Height>\n            <Width>7in</Width>",
    "<Height>0.8in</Height>\n            <Width>7in</Width>",
    "tablix height",
  );
  return candidate;
};

const atomicWrite = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content, { flag: "wx" });
  await rename(temporary, path);
};

const protectedArtifacts = [
  [
    "artifacts/rdl-compatibility-ladder/01-minimal-enter-data-table.rdl",
    "151274f425f20e1bd88a7a8f892fca799f9efe9184b1df42e9cec53ab2e016a7",
  ],
  [
    "artifacts/rdl-compatibility-ladder/02-detail-columns.rdl",
    "c5c86b7f7f9aa90dbd101f5d8a637c715ae8e3e36d5a6d3a2095f0617a0d5c8b",
  ],
  [
    "artifacts/rdl-compatibility-ladder/03-region-group.rdl",
    "5dd58b2d5acd39a66bc734e16956a592f1c84afa9ae7080101f7003030661c0b",
  ],
  [
    "artifacts/rdl-compatibility-ladder/03b-region-group-from-seed.rdl",
    candidate03bSha256,
  ],
  [
    "samples/report-builder-seeds/KnownGoodEnterDataTable.rdl",
    "dc3e3f939d0d5f0eb8242681b17c43aa49dd0455a65f4e8cad10fbe24408ab7f",
  ],
  ["samples/report-builder-seeds/KnownGoodRegionGroup.rdl", candidate03bSha256],
] as const;

export const runCandidate04 = async (outputDirectory: string) => {
  const candidate03b = await readFile(candidate03bPath, "utf8");
  const candidate = deriveCandidate04(candidate03b);
  assertWellFormed(candidate);
  const subtotalEvidence = validateCandidate04Subtotal(candidate);
  const output = resolve(outputDirectory);
  const reportPath = join(output, candidate04FileName);
  await atomicWrite(reportPath, candidate);
  for (const [path, expected] of protectedArtifacts)
    if (sha256(await readFile(resolve(path))) !== expected)
      throw new Error(`Protected artifact checksum changed: ${path}`);
  const schemaPath = fileURLToPath(
    new URL("../schema/ReportDefinition-2016.xsd", import.meta.url),
  );
  const xsdOutput = execFileSync(
    "xmllint",
    ["--noout", "--schema", schemaPath, reportPath],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const manifest = {
    candidate: candidate04FileName,
    candidateSha256: sha256(candidate),
    derivedDirectlyFrom: "03b-region-group-from-seed.rdl",
    candidate03bSha256,
    embeddedDataChanged: false,
    fields: 9,
    detailRows: 6,
    expectedRegionSubtotalRows: 3,
    validation: {
      xmlWellFormedness: "PASS",
      existingXsd: "PASS",
      xsdOutput: xsdOutput || `${candidate04FileName} validates`,
      subtotalStructureAndScope: "PASS",
      protectedArtifactChecksums: "PASS",
      subtotalEvidence,
      reportBuilderOpen: "PENDING_INDEPENDENT_WINDOWS",
      reportBuilderPreview: "PENDING_INDEPENDENT_WINDOWS",
    },
  };
  await atomicWrite(
    join(output, "04-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await atomicWrite(
    join(output, "04-SUBTOTAL_CONSISTENCY.json"),
    `${JSON.stringify(
      {
        command:
          "pnpm spike:rdl-compatibility-04 artifacts/rdl-compatibility-ladder",
        baseline: {
          path: "artifacts/rdl-compatibility-ladder/03b-region-group-from-seed.rdl",
          sha256: candidate03bSha256,
          unchanged: "PASS",
        },
        candidate: {
          path: `artifacts/rdl-compatibility-ladder/${candidate04FileName}`,
          sha256: manifest.candidateSha256,
        },
        subtotalEvidence,
        protectedArtifactChecksums: "PASS",
      },
      null,
      2,
    )}\n`,
  );
  return { reportPath, manifest };
};
