export interface FieldTransform {
  displayName: string;
  toDisplay: (v: number) => number;
  fromDisplay: (v: number) => number;
}

export interface LanguageDefinition {
  id: string;
  displayName: string;
  description: string;
  typeDisplayNames: Record<string, string>;
  fieldDisplayNames: Record<string, Record<string, string>>;
  fieldTransforms: Record<string, Record<string, FieldTransform>>;
  hiddenTypes: Set<string>;
}
