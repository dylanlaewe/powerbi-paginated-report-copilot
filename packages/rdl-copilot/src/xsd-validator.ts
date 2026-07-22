export interface XsdValidationResult {
  engine: "libxml2-wasm";
  status: "PASS";
}

export const validateXmlAgainstXsd = async (
  xml: Uint8Array,
  xsd: Uint8Array,
): Promise<XsdValidationResult> => {
  const { XmlDocument, XsdValidator } = await import("libxml2-wasm");
  const document = XmlDocument.fromBuffer(xml);
  const schemaDocument = XmlDocument.fromBuffer(xsd);
  let validator: InstanceType<typeof XsdValidator> | undefined;
  try {
    validator = XsdValidator.fromDoc(schemaDocument);
    validator.validate(document);
    return { engine: "libxml2-wasm", status: "PASS" };
  } finally {
    validator?.dispose();
    document.dispose();
    schemaDocument.dispose();
  }
};
