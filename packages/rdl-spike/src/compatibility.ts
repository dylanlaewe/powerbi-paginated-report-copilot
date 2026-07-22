import { SaxesParser, type SaxesTagNS } from "saxes";

interface XmlNode {
  name: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text: string;
}

export interface ConsistencyResult {
  fields: string[];
  elementPathFields: string[];
  embeddedRows: number;
  tablixes: Array<{
    name: string;
    columns: number;
    rows: number;
    columnHierarchyLeaves: number;
    rowHierarchyLeaves: number;
    rowCellWidths: number[];
  }>;
  bodyWidthInches: number;
  availablePageWidthInches: number;
  checks: string[];
}

const localName = (name: string): string => name.split(":").at(-1)!;

const parse = (xml: string): XmlNode => {
  const document: XmlNode = {
    name: "#document",
    attributes: {},
    children: [],
    text: "",
  };
  const stack = [document];
  let failure: Error | undefined;
  const parser = new SaxesParser({ xmlns: true });
  parser.on("opentag", (tag: SaxesTagNS) => {
    const attributes: Record<string, string> = {};
    for (const attribute of Object.values(tag.attributes))
      attributes[localName(attribute.name)] = attribute.value;
    const node: XmlNode = {
      name: tag.local,
      attributes,
      children: [],
      text: "",
    };
    stack.at(-1)!.children.push(node);
    stack.push(node);
  });
  parser.on("text", (value) => {
    stack.at(-1)!.text += value;
  });
  parser.on("closetag", () => {
    stack.pop();
  });
  parser.on("error", (error) => {
    failure = error;
  });
  parser.write(xml.replace(/^\uFEFF/, "")).close();
  if (failure) throw failure;
  return document.children[0] ?? document;
};

const direct = (node: XmlNode, name: string): XmlNode[] =>
  node.children.filter((child) => child.name === name);
const child = (node: XmlNode, name: string): XmlNode | undefined =>
  direct(node, name)[0];
const descendants = (node: XmlNode, name: string): XmlNode[] => [
  ...direct(node, name),
  ...node.children.flatMap((item) => descendants(item, name)),
];
const required = (node: XmlNode | undefined, label: string): XmlNode => {
  if (!node) throw new Error(`Missing ${label}`);
  return node;
};
const value = (node: XmlNode | undefined): string => node?.text.trim() ?? "";
const unique = (values: string[], label: string): void => {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${label}: ${values.join(", ")}`);
};
const hierarchyLeaves = (member: XmlNode): number => {
  const nested = child(member, "TablixMembers");
  return nested
    ? direct(nested, "TablixMember").reduce(
        (total, item) => total + hierarchyLeaves(item),
        0,
      )
    : 1;
};
const inches = (raw: string, label: string): number => {
  const match = /^([0-9.]+)in$/.exec(raw);
  if (!match) throw new Error(`${label} is not expressed in inches: ${raw}`);
  return Number(match[1]);
};

export const validateCollectionConsistency = (
  xml: string,
  options: {
    requirePrintSafe?: boolean;
    requireExplicitLetterPage?: boolean;
  } = {},
): ConsistencyResult => {
  const root = parse(xml);
  const dataSet = required(descendants(root, "DataSet")[0], "DataSet");
  const fieldNodes = direct(
    required(child(dataSet, "Fields"), "Fields"),
    "Field",
  );
  if (fieldNodes.length === 0) throw new Error("Fields collection is empty");
  const fields = fieldNodes.map((field) => field.attributes.Name ?? "");
  const dataFields = fieldNodes.map((field) =>
    value(child(field, "DataField")),
  );
  if (fields.some((field) => !field) || dataFields.some((field) => !field))
    throw new Error("Every Field requires Name and DataField");
  unique(fields, "Field Name");
  unique(dataFields, "DataField source");
  if (fields.some((field, index) => field !== dataFields[index]))
    throw new Error("Field Name and DataField mappings differ");
  const fieldReferences = ["Value", "GroupExpression"]
    .flatMap((name) => descendants(root, name))
    .flatMap((item) => [
      ...item.text.matchAll(/Fields!([A-Za-z][A-Za-z0-9]*)\.Value/g),
    ])
    .map((match) => match[1]!);
  for (const reference of fieldReferences)
    if (!fields.includes(reference))
      throw new Error(`Invalid field reference ${reference}`);

  const commandText = value(descendants(dataSet, "CommandText")[0]);
  const query = parse(commandText);
  const elementPath = value(descendants(query, "ElementPath")[0]);
  const match = /^Data\{\}\/Row\{(.+)\}$/.exec(elementPath);
  if (!match) throw new Error(`Unsupported ElementPath: ${elementPath}`);
  const declarations = match[1]!.split(",").map((item) => item.trim());
  const supportedTypes = new Set([
    "String",
    "Integer",
    "Boolean",
    "Float",
    "Decimal",
    "Date",
    "XML",
  ]);
  const elementPathTypes: string[] = [];
  const elementPathFields = declarations.map((declaration) => {
    const declarationMatch = /^([A-Za-z_][A-Za-z0-9_]*)\(([A-Za-z]+)\)$/.exec(
      declaration,
    );
    if (!declarationMatch || !supportedTypes.has(declarationMatch[2]!))
      throw new Error(`Unsupported ElementPath declaration: ${declaration}`);
    elementPathTypes.push(declarationMatch[2]!);
    return declarationMatch[1]!;
  });
  if (elementPathFields.join("|") !== dataFields.join("|"))
    throw new Error("ElementPath field order differs from DataField order");
  const embeddedRows = descendants(query, "Row");
  if (embeddedRows.length === 0)
    throw new Error("Embedded Row collection is empty");
  for (const [index, row] of embeddedRows.entries()) {
    const rowFields = row.children.map(({ name }) => name);
    if (rowFields.join("|") !== dataFields.join("|"))
      throw new Error(
        `Embedded row ${index} field order differs from DataField order`,
      );
    for (const [fieldIndex, fieldValue] of row.children.entries()) {
      const type = elementPathTypes[fieldIndex];
      const raw = fieldValue.text.trim();
      if (type === "Date" && Number.isNaN(Date.parse(raw)))
        throw new Error(`Embedded row ${index} has invalid Date value ${raw}`);
      if (["Integer", "Decimal", "Float"].includes(type ?? "")) {
        const numeric = Number(raw);
        if (
          !Number.isFinite(numeric) ||
          (type === "Integer" && !Number.isInteger(numeric))
        )
          throw new Error(
            `Embedded row ${index} has invalid ${type} value ${raw}`,
          );
      }
    }
  }

  const expectedClrTypes: Record<string, string[]> = {
    String: ["System.String"],
    Integer: ["System.Int16", "System.Int32", "System.Int64"],
    Boolean: ["System.Boolean"],
    Float: ["System.Single", "System.Double"],
    Decimal: ["System.Decimal"],
    Date: ["System.DateTime"],
    XML: ["System.String"],
  };
  for (const [index, field] of fieldNodes.entries()) {
    const typeName = value(child(field, "TypeName"));
    if (!expectedClrTypes[elementPathTypes[index]!]!.includes(typeName))
      throw new Error(
        `Field ${fields[index]} TypeName ${typeName} is incompatible with ${elementPathTypes[index]}`,
      );
  }

  const dataGrid = required(
    descendants(dataSet, "DataGrid")[0],
    "DesignerState DataGrid",
  );
  const rowCount = Number(value(child(dataGrid, "RowNumber")));
  const columnCount = Number(value(child(dataGrid, "ColumnNumber")));
  const columnNames = direct(dataGrid, "ColumnName");
  const data = direct(dataGrid, "Data");
  if (rowCount !== embeddedRows.length)
    throw new Error("DesignerState RowNumber differs from embedded row count");
  if (columnCount !== dataFields.length || columnNames.length !== columnCount)
    throw new Error("DesignerState ColumnNumber differs from field columns");
  for (let index = 0; index < columnCount; index += 1) {
    const column = columnNames[index];
    if (
      Number(column?.attributes.ColumnIndex) !== index ||
      value(column) !== dataFields[index]
    )
      throw new Error(`DesignerState column ${index} is inconsistent`);
  }
  const coordinates = data.map(
    (item) => `${item.attributes.RowIndex}:${item.attributes.ColumnIndex}`,
  );
  unique(coordinates, "DesignerState data coordinate");
  if (data.length !== rowCount * columnCount)
    throw new Error("DesignerState data cell count is incomplete");

  const tablixes = descendants(root, "Tablix").map((tablix) => {
    const body = required(child(tablix, "TablixBody"), "TablixBody");
    const columns = direct(
      required(child(body, "TablixColumns"), "TablixColumns"),
      "TablixColumn",
    ).length;
    const rows = direct(
      required(child(body, "TablixRows"), "TablixRows"),
      "TablixRow",
    );
    if (columns === 0 || rows.length === 0)
      throw new Error("Tablix body collections must not be empty");
    const rowCellWidths = rows.map((row, rowIndex) => {
      const cells = direct(
        required(child(row, "TablixCells"), `Tablix row ${rowIndex} cells`),
        "TablixCell",
      );
      const width = cells.reduce(
        (total, item) =>
          total + Number(value(descendants(item, "ColSpan")[0]) || "1"),
        0,
      );
      if (width !== columns)
        throw new Error(
          `Tablix row ${rowIndex} spans ${width} columns; expected ${columns}`,
        );
      return width;
    });
    const columnMembers = direct(
      required(
        child(
          required(
            child(tablix, "TablixColumnHierarchy"),
            "TablixColumnHierarchy",
          ),
          "TablixMembers",
        ),
        "TablixColumnHierarchy members",
      ),
      "TablixMember",
    );
    const rowMembers = direct(
      required(
        child(
          required(child(tablix, "TablixRowHierarchy"), "TablixRowHierarchy"),
          "TablixMembers",
        ),
        "TablixRowHierarchy members",
      ),
      "TablixMember",
    );
    const columnHierarchyLeaves = columnMembers.reduce(
      (total, item) => total + hierarchyLeaves(item),
      0,
    );
    const rowHierarchyLeaves = rowMembers.reduce(
      (total, item) => total + hierarchyLeaves(item),
      0,
    );
    if (columnHierarchyLeaves !== columns)
      throw new Error("Column hierarchy leaf count differs from body columns");
    if (rowHierarchyLeaves !== rows.length)
      throw new Error("Row hierarchy leaf count differs from body rows");
    return {
      name: tablix.attributes.Name ?? "",
      columns,
      rows: rows.length,
      columnHierarchyLeaves,
      rowHierarchyLeaves,
      rowCellWidths,
    };
  });
  if (tablixes.length === 0) throw new Error("Report contains no Tablix");
  const groupNames = descendants(root, "Group").map(
    (group) => group.attributes.Name ?? "",
  );
  if (groupNames.some((name) => !name)) throw new Error("Group Name is empty");
  unique(groupNames, "Group Name");

  const section = required(
    descendants(root, "ReportSection")[0],
    "ReportSection",
  );
  const bodyWidthInches = inches(value(child(section, "Width")), "Body width");
  const page = required(child(section, "Page"), "Page");
  if (options.requireExplicitLetterPage) {
    const requiredSizes = {
      PageWidth: "8.5in",
      PageHeight: "11in",
      LeftMargin: "0.5in",
      RightMargin: "0.5in",
      TopMargin: "0.5in",
      BottomMargin: "0.5in",
    } as const;
    const validRdlSize =
      /^(?:0*[1-9]\d*(?:\.\d+)?|0*\.\d*[1-9]\d*)(?:in|cm|mm|pt|pc)$/;
    for (const [name, expected] of Object.entries(requiredSizes)) {
      const node = child(page, name);
      if (!node)
        throw new Error(
          `Explicit ${name} is required for production pagination`,
        );
      const raw = value(node);
      if (!validRdlSize.test(raw))
        throw new Error(`${name} is not a positive valid RdlSize: ${raw}`);
      if (raw !== expected)
        throw new Error(`${name} must be exactly ${expected}; received ${raw}`);
    }
  }
  const pageWidthInches = child(page, "PageWidth")
    ? inches(value(child(page, "PageWidth")), "Page width")
    : 8.5;
  const leftMargin = child(page, "LeftMargin")
    ? inches(value(child(page, "LeftMargin")), "Left margin")
    : 1;
  const rightMargin = child(page, "RightMargin")
    ? inches(value(child(page, "RightMargin")), "Right margin")
    : 1;
  const availablePageWidthInches = pageWidthInches - leftMargin - rightMargin;
  if (
    options.requirePrintSafe !== false &&
    bodyWidthInches > availablePageWidthInches
  )
    throw new Error("Body width exceeds printable page width");

  return {
    fields,
    elementPathFields,
    embeddedRows: embeddedRows.length,
    tablixes,
    bodyWidthInches,
    availablePageWidthInches,
    checks: [
      "dataset-field-to-row",
      "designer-grid-counts",
      "tablix-column-count",
      "tablix-row-cell-count",
      "hierarchy-body-consistency",
      "duplicate-field-source",
      "field-reference",
      "group-expression-reference",
      "element-path",
      "date-numeric-compatibility",
      "body-width",
    ],
  };
};
