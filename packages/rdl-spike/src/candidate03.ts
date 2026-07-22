import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCollectionConsistency } from "./compatibility";
import { assertWellFormed } from "./index";
import { sha256 } from "./ladder";

export const candidate02Path = resolve(
  "artifacts/rdl-compatibility-ladder/02-detail-columns.rdl",
);
export const candidate02Sha256 =
  "c5c86b7f7f9aa90dbd101f5d8a637c715ae8e3e36d5a6d3a2095f0617a0d5c8b";
export const candidate03FileName = "03-region-group.rdl";

const replaceExactlyOnce = (
  source: string,
  before: string,
  after: string,
  label: string,
): string => {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0)
    throw new Error(
      `Accepted Candidate 02 does not contain exactly one ${label}`,
    );
  return `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
};

const replaceElement = (
  source: string,
  startMarker: string,
  endMarker: string,
  replacement: string,
  label: string,
): string => {
  const start = source.indexOf(startMarker);
  if (start < 0 || source.indexOf(startMarker, start + startMarker.length) >= 0)
    throw new Error(
      `Accepted Candidate 02 does not contain exactly one ${label}`,
    );
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Accepted Candidate 02 has no closing ${label}`);
  return `${source.slice(0, start)}${replacement}${source.slice(end + endMarker.length)}`;
};

const groupHeaderRow = `                <TablixRow>
                  <Height>0.25in</Height>
                  <TablixCells>
                    <TablixCell>
                      <CellContents>
                        <Textbox Name="RegionGroupHeader">
                          <rd:DefaultName>RegionGroupHeader</rd:DefaultName>
                          <CanGrow>true</CanGrow>
                          <KeepTogether>true</KeepTogether>
                          <Paragraphs>
                            <Paragraph>
                              <TextRuns><TextRun><Value>=Fields!Region.Value</Value><Style><FontWeight>Bold</FontWeight></Style></TextRun></TextRuns>
                              <Style />
                            </Paragraph>
                          </Paragraphs>
                          <Style><Border><Style>None</Style></Border><PaddingLeft>2pt</PaddingLeft><PaddingRight>2pt</PaddingRight><PaddingTop>2pt</PaddingTop><PaddingBottom>2pt</PaddingBottom></Style>
                        </Textbox>
                        <ColSpan>8</ColSpan>
                      </CellContents>
                    </TablixCell>
                  </TablixCells>
                </TablixRow>`;

const rowHierarchy = `<TablixRowHierarchy>
              <TablixMembers>
                <TablixMember>
                  <TablixHeader><Size>0.8in</Size><CellContents><Textbox Name="HeaderRegion">
                          <rd:DefaultName>HeaderRegion</rd:DefaultName>
                          <CanGrow>true</CanGrow>
                          <KeepTogether>true</KeepTogether>
                          <Paragraphs><Paragraph><TextRuns><TextRun><Value>Region</Value><Style><FontWeight>Bold</FontWeight></Style></TextRun></TextRuns><Style /></Paragraph></Paragraphs>
                          <Style><Border><Style>None</Style></Border><PaddingLeft>2pt</PaddingLeft><PaddingRight>2pt</PaddingRight><PaddingTop>2pt</PaddingTop><PaddingBottom>2pt</PaddingBottom></Style>
                        </Textbox></CellContents></TablixHeader>
                  <TablixMembers><TablixMember /></TablixMembers>
                  <KeepWithGroup>After</KeepWithGroup>
                </TablixMember>
                <TablixMember>
                  <Group Name="Region"><GroupExpressions><GroupExpression>=Fields!Region.Value</GroupExpression></GroupExpressions></Group>
                  <SortExpressions><SortExpression><Value>=Fields!Region.Value</Value></SortExpression></SortExpressions>
                  <TablixHeader><Size>0.8in</Size><CellContents><Textbox Name="Region">
                          <rd:DefaultName>Region</rd:DefaultName>
                          <CanGrow>true</CanGrow>
                          <KeepTogether>true</KeepTogether>
                          <Paragraphs><Paragraph><TextRuns><TextRun><Value>=Fields!Region.Value</Value><Style /></TextRun></TextRuns><Style /></Paragraph></Paragraphs>
                          <Style><Border><Style>None</Style></Border><PaddingLeft>2pt</PaddingLeft><PaddingRight>2pt</PaddingRight><PaddingTop>2pt</PaddingTop><PaddingBottom>2pt</PaddingBottom></Style>
                        </Textbox></CellContents></TablixHeader>
                  <TablixMembers>
                    <TablixMember><KeepWithGroup>After</KeepWithGroup></TablixMember>
                    <TablixMember>
                      <Group Name="Details" />
                      <SortExpressions>
                        <SortExpression><Value>=Fields!SaleDate.Value</Value></SortExpression>
                        <SortExpression><Value>=Fields!Salesperson.Value</Value></SortExpression>
                      </SortExpressions>
                      <Visibility><Hidden>false</Hidden><ToggleItem>Region</ToggleItem></Visibility>
                    </TablixMember>
                  </TablixMembers>
                </TablixMember>
              </TablixMembers>
            </TablixRowHierarchy>`;

export const validateCandidate03Group = (xml: string) => {
  const consistency = validateCollectionConsistency(xml);
  const requiredOnce = [
    '<Group Name="Region"><GroupExpressions><GroupExpression>=Fields!Region.Value</GroupExpression></GroupExpressions></Group>',
    "<SortExpressions><SortExpression><Value>=Fields!Region.Value</Value></SortExpression></SortExpressions>",
    '<Group Name="Details" />',
    "<SortExpression><Value>=Fields!SaleDate.Value</Value></SortExpression>",
    "<SortExpression><Value>=Fields!Salesperson.Value</Value></SortExpression>",
    '<Textbox Name="RegionGroupHeader">',
  ];
  for (const token of requiredOnce) {
    const count = xml.split(token).length - 1;
    if (count !== 1)
      throw new Error(`Expected exactly one group structure: ${token}`);
  }
  const region = xml.indexOf('<Group Name="Region">');
  const header = xml.indexOf('<Textbox Name="RegionGroupHeader">');
  const details = xml.indexOf('<Group Name="Details" />', region);
  if (region < 0 || header < 0 || details < region)
    throw new Error(
      "Region header and Details member are not reachable beneath Region",
    );
  if (xml.includes("Sum("))
    throw new Error("Candidate 03 contains an aggregate");
  if (xml.includes("<PageBreak>"))
    throw new Error("Candidate 03 contains a page break");
  return {
    groupName: "Region",
    groupExpression: "=Fields!Region.Value",
    regionSort: ["=Fields!Region.Value"],
    detailSort: ["=Fields!SaleDate.Value", "=Fields!Salesperson.Value"],
    groupHeader: "=Fields!Region.Value",
    detailsReachableBeneathGroup: "PASS",
    aggregateExpressions: "NONE",
    pageBreakDefinitions: "NONE",
    consistency,
  };
};

export const deriveCandidate03 = (candidate02: string): string => {
  if (sha256(candidate02) !== candidate02Sha256)
    throw new Error("Accepted Candidate 02 SHA-256 differs from the baseline");
  const rowBoundary = `                </TablixRow>
                <TablixRow>`;
  let candidate = replaceExactlyOnce(
    candidate02,
    rowBoundary,
    `                </TablixRow>\n${groupHeaderRow}\n                <TablixRow>`,
    "header/detail row boundary",
  );
  candidate = replaceElement(
    candidate,
    "<TablixRowHierarchy>",
    "</TablixRowHierarchy>",
    rowHierarchy,
    "TablixRowHierarchy",
  );
  candidate = replaceExactlyOnce(
    candidate,
    "<Top>0.5in</Top><Height>0.55in</Height><Width>6in</Width>",
    "<Top>0.5in</Top><Height>0.8in</Height><Width>6in</Width>",
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

export const runCandidate03 = async (outputDirectory: string) => {
  const candidate02 = await readFile(candidate02Path, "utf8");
  const originalCandidate02Hash = sha256(candidate02);
  const candidate = deriveCandidate03(candidate02);
  assertWellFormed(candidate);
  const groupEvidence = validateCandidate03Group(candidate);
  const output = resolve(outputDirectory);
  const reportPath = join(output, candidate03FileName);
  await atomicWrite(reportPath, candidate);
  const candidate01 = await readFile(
    resolve(
      "artifacts/rdl-compatibility-ladder/01-minimal-enter-data-table.rdl",
    ),
  );
  if (
    sha256(candidate01) !==
    "151274f425f20e1bd88a7a8f892fca799f9efe9184b1df42e9cec53ab2e016a7"
  )
    throw new Error("Accepted Candidate 01 checksum changed");
  if (sha256(await readFile(candidate02Path)) !== originalCandidate02Hash)
    throw new Error(
      "Accepted Candidate 02 changed during Candidate 03 generation",
    );
  const schemaPath = fileURLToPath(
    new URL("../schema/ReportDefinition-2016.xsd", import.meta.url),
  );
  const xsdOutput = execFileSync(
    "xmllint",
    ["--noout", "--schema", schemaPath, reportPath],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const manifest = {
    candidate: candidate03FileName,
    candidateSha256: sha256(candidate),
    derivedDirectlyFrom: "02-detail-columns.rdl",
    candidate02Sha256,
    preservedFields: 9,
    preservedRows: 6,
    validation: {
      xmlWellFormedness: "PASS",
      existingXsd: "PASS",
      xsdOutput: xsdOutput || `${candidate03FileName} validates`,
      hierarchyAndGroupConsistency: "PASS",
      candidate01Unchanged: "PASS",
      candidate02Unchanged: "PASS",
      groupEvidence,
      reportBuilderOpen: "PENDING_INDEPENDENT_WINDOWS",
      reportBuilderPreview: "PENDING_INDEPENDENT_WINDOWS",
    },
  };
  await atomicWrite(
    join(output, "03-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await atomicWrite(
    join(output, "03-GROUP_CONSISTENCY.json"),
    `${JSON.stringify(
      {
        command:
          "pnpm spike:rdl-compatibility-03 artifacts/rdl-compatibility-ladder",
        baseline: {
          path: "artifacts/rdl-compatibility-ladder/02-detail-columns.rdl",
          sha256: candidate02Sha256,
          unchanged: "PASS",
        },
        candidate: {
          path: `artifacts/rdl-compatibility-ladder/${candidate03FileName}`,
          sha256: manifest.candidateSha256,
        },
        groupEvidence,
      },
      null,
      2,
    )}\n`,
  );
  return { reportPath, manifest };
};
