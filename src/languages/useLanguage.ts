import { useMemo } from "react";
import type { LanguageDefinition, FieldTransform } from "./types";
import { hytaleLanguage } from "./hytale";

export interface LanguageHelpers {
  language: LanguageDefinition;
  getTypeDisplayName: (internalType: string) => string;
  getFieldDisplayName: (typeName: string, fieldKey: string) => string;
  getFieldTransform: (typeName: string, fieldKey: string) => FieldTransform | null;
  isTypeVisible: (typeName: string) => boolean;
  matchesSearch: (typeName: string, query: string) => boolean;
}

function buildHelpers(lang: LanguageDefinition): LanguageHelpers {
  const getTypeDisplayName = (internalType: string): string =>
    lang.typeDisplayNames[internalType] ?? internalType;

  const getFieldDisplayName = (typeName: string, fieldKey: string): string => {
    const transform = lang.fieldTransforms[typeName]?.[fieldKey];
    if (transform) return transform.displayName;
    return lang.fieldDisplayNames[typeName]?.[fieldKey] ?? fieldKey;
  };

  const getFieldTransform = (typeName: string, fieldKey: string): FieldTransform | null =>
    lang.fieldTransforms[typeName]?.[fieldKey] ?? null;

  const isTypeVisible = (typeName: string): boolean =>
    !lang.hiddenTypes.has(typeName);

  const matchesSearch = (typeName: string, query: string): boolean => {
    const lq = query.toLowerCase();
    if (typeName.toLowerCase().includes(lq)) return true;
    const displayName = getTypeDisplayName(typeName);
    if (displayName.toLowerCase().includes(lq)) return true;
    return false;
  };

  return { language: lang, getTypeDisplayName, getFieldDisplayName, getFieldTransform, isTypeVisible, matchesSearch };
}

const HELPERS = buildHelpers(hytaleLanguage);

/** Non-hook version for use outside React components. */
export function getLanguageHelpers(): LanguageHelpers {
  return HELPERS;
}

/** React hook that returns memoized language helpers. */
export function useLanguage(): LanguageHelpers {
  return useMemo(() => HELPERS, []);
}
