export interface DelimiterValidationIssue {
  kind:
    | "invalid-range"
    | "missing-range"
    | "overlap"
    | "gap"
    | "missing-environment"
    | "unknown-environment"
    | "unsupported-environment-type";
  message: string;
  severity: "error" | "warning";
  delimiterIndex?: number;
}

export type DelimiterEnvironmentProviderType = "Constant" | "Default" | "Imported";

export interface DelimiterEnvironmentReference {
  providerType: DelimiterEnvironmentProviderType;
  name: string;
  rawType: string | null;
}

const DELIMITER_ENVIRONMENT_PROVIDER_TYPES: DelimiterEnvironmentProviderType[] = [
  "Constant",
  "Default",
  "Imported",
];

const RANGE_EPSILON = 1e-6;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export function cloneDelimiterRecords(delimiters: unknown[]): Array<Record<string, unknown>> {
  return delimiters.map((delimiter) => {
    const record = asRecord(delimiter);
    return record ? structuredClone(record) : {};
  });
}

export function normalizeEnvironmentName(value: string): string {
  return value.trim().replace(/\.json$/i, "");
}

function isDefaultEnvironmentName(value: string): boolean {
  return normalizeEnvironmentName(value).toLowerCase() === "default";
}

export function readDelimiterRangeMin(delimiter: Record<string, unknown>): number | null {
  const range = asRecord(delimiter.Range);
  if (!range) return null;
  return (
    toFiniteNumber(range.MinInclusive)
    ?? toFiniteNumber(range.Min)
    ?? toFiniteNumber(range.From)
  );
}

export function readDelimiterRangeMax(delimiter: Record<string, unknown>): number | null {
  const range = asRecord(delimiter.Range);
  if (!range) return null;
  return (
    toFiniteNumber(range.MaxExclusive)
    ?? toFiniteNumber(range.Max)
    ?? toFiniteNumber(range.To)
  );
}

export function isDelimiterEnvironmentProviderType(
  value: string,
): value is DelimiterEnvironmentProviderType {
  return DELIMITER_ENVIRONMENT_PROVIDER_TYPES.includes(value as DelimiterEnvironmentProviderType);
}

export function readDelimiterEnvironmentReference(
  delimiter: Record<string, unknown>,
): DelimiterEnvironmentReference {
  const rawEnvironment = delimiter.Environment;
  if (typeof rawEnvironment === "string") {
    const normalized = normalizeEnvironmentName(rawEnvironment);
    if (isDefaultEnvironmentName(normalized)) {
      return {
        providerType: "Default",
        name: "",
        rawType: "Default",
      };
    }
    return {
      providerType: "Constant",
      name: normalized,
      rawType: "Constant",
    };
  }

  const rawObject = asRecord(rawEnvironment);
  if (!rawObject) {
    return {
      providerType: "Constant",
      name: "",
      rawType: null,
    };
  }

  const rawType = typeof rawObject.Type === "string" ? rawObject.Type : null;
  const providerType = rawType && isDelimiterEnvironmentProviderType(rawType)
    ? rawType
    : "Constant";

  if (providerType === "Default") {
    return {
      providerType,
      name: "",
      rawType,
    };
  }

  if (providerType === "Imported") {
    return {
      providerType,
      name: typeof rawObject.Name === "string" ? normalizeEnvironmentName(rawObject.Name) : "",
      rawType,
    };
  }

  const constantName =
    typeof rawObject.Environment === "string"
      ? normalizeEnvironmentName(rawObject.Environment)
      : typeof rawObject.Name === "string"
        ? normalizeEnvironmentName(rawObject.Name)
        : "";

  if (isDefaultEnvironmentName(constantName)) {
    return {
      providerType: "Default",
      name: "",
      rawType: rawType ?? "Default",
    };
  }

  return {
    providerType,
    name: constantName,
    rawType,
  };
}

export function writeDelimiterEnvironmentReference(
  delimiter: Record<string, unknown>,
  providerType: DelimiterEnvironmentProviderType,
  rawName: string,
): Record<string, unknown> {
  const name = normalizeEnvironmentName(rawName);
  const existing = asRecord(delimiter.Environment) ? { ...(delimiter.Environment as Record<string, unknown>) } : {};
  delete existing.Environment;
  delete existing.Name;
  delete existing.BiomeId;

  const nextEnvironment: Record<string, unknown> = {
    ...existing,
    Type: providerType,
  };

  if (providerType === "Constant") {
    nextEnvironment.Environment = name;
  } else if (providerType === "Imported") {
    nextEnvironment.Name = name;
  }

  return {
    ...delimiter,
    Environment: nextEnvironment,
  };
}

export function writeDelimiterEnvironmentType(
  delimiter: Record<string, unknown>,
  providerType: DelimiterEnvironmentProviderType,
): Record<string, unknown> {
  const reference = readDelimiterEnvironmentReference(delimiter);
  return writeDelimiterEnvironmentReference(delimiter, providerType, reference.name);
}

export function writeDelimiterRangeValue(
  delimiter: Record<string, unknown>,
  key: "MinInclusive" | "MaxExclusive",
  rawValue: string,
): Record<string, unknown> {
  const parsed =
    rawValue.trim() === ""
      ? null
      : Number.isFinite(Number(rawValue))
        ? Number(rawValue)
        : undefined;
  if (parsed === undefined) return delimiter;

  const existingRange = asRecord(delimiter.Range) ? { ...(delimiter.Range as Record<string, unknown>) } : {};
  delete existingRange.Min;
  delete existingRange.Max;
  delete existingRange.From;
  delete existingRange.To;

  if (parsed === null) {
    delete existingRange[key];
  } else {
    existingRange[key] = parsed;
  }

  return {
    ...delimiter,
    Range: existingRange,
  };
}

export function writeDelimiterEnvironmentName(
  delimiter: Record<string, unknown>,
  rawEnvironmentName: string,
): Record<string, unknown> {
  const reference = readDelimiterEnvironmentReference(delimiter);
  return writeDelimiterEnvironmentReference(
    delimiter,
    reference.providerType,
    rawEnvironmentName,
  );
}

function writeDelimiterRangeBounds(
  delimiter: Record<string, unknown>,
  min: number,
  max: number,
): Record<string, unknown> {
  return writeDelimiterRangeValue(
    writeDelimiterRangeValue(delimiter, "MinInclusive", String(min)),
    "MaxExclusive",
    String(max),
  );
}

function formatRangeValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/\.?0+$/, "");
}

export function validateEnvironmentDelimiters(
  delimiters: Array<Record<string, unknown>>,
  knownEnvironmentNames: string[],
): DelimiterValidationIssue[] {
  const issues: DelimiterValidationIssue[] = [];
  const knownNames = new Set(knownEnvironmentNames.map((name) => normalizeEnvironmentName(name).toLowerCase()));
  const ranges: Array<{ index: number; min: number; max: number }> = [];

  for (let index = 0; index < delimiters.length; index++) {
    const delimiter = delimiters[index];
    const min = readDelimiterRangeMin(delimiter);
    const max = readDelimiterRangeMax(delimiter);
    const environmentReference = readDelimiterEnvironmentReference(delimiter);
    const environmentName = environmentReference.name;

    if (min === null || max === null) {
      issues.push({
        kind: "missing-range",
        severity: "warning",
        delimiterIndex: index,
        message: `Delimiter [${index}] is missing MinInclusive or MaxExclusive.`,
      });
    } else if (min >= max) {
      issues.push({
        kind: "invalid-range",
        severity: "error",
        delimiterIndex: index,
        message: `Delimiter [${index}] has MinInclusive >= MaxExclusive.`,
      });
    } else {
      ranges.push({ index, min, max });
    }

    if (
      environmentReference.rawType &&
      !isDelimiterEnvironmentProviderType(environmentReference.rawType)
    ) {
      issues.push({
        kind: "unsupported-environment-type",
        severity: "warning",
        delimiterIndex: index,
        message: `Delimiter [${index}] uses unsupported environment provider type "${environmentReference.rawType}".`,
      });
    }

    if (
      environmentReference.providerType !== "Default"
      && !environmentName
    ) {
      issues.push({
        kind: "missing-environment",
        severity: "warning",
        delimiterIndex: index,
        message: `Delimiter [${index}] is missing an environment reference.`,
      });
    }

    if (
      environmentReference.providerType === "Constant"
      && environmentName
      && knownNames.size > 0
      && !knownNames.has(environmentName.toLowerCase())
    ) {
      issues.push({
        kind: "unknown-environment",
        severity: "warning",
        delimiterIndex: index,
        message: `Delimiter [${index}] references unknown environment "${environmentName}".`,
      });
    }
  }

  ranges.sort((a, b) => (a.min === b.min ? a.max - b.max : a.min - b.min));
  for (let index = 1; index < ranges.length; index++) {
    const previous = ranges[index - 1];
    const current = ranges[index];

    if (current.min < previous.max - RANGE_EPSILON) {
      issues.push({
        kind: "overlap",
        severity: "warning",
        delimiterIndex: current.index,
        message: `Delimiter [${previous.index}] overlaps [${current.index}] (${formatRangeValue(current.min)} < ${formatRangeValue(previous.max)}).`,
      });
    } else if (current.min > previous.max + RANGE_EPSILON) {
      issues.push({
        kind: "gap",
        severity: "warning",
        delimiterIndex: current.index,
        message: `Gap in delimiter coverage between ${formatRangeValue(previous.max)} and ${formatRangeValue(current.min)}.`,
      });
    }
  }

  return issues;
}

export function normalizeDelimiterRanges(
  delimiters: unknown[],
): Array<Record<string, unknown>> {
  const complete = cloneDelimiterRecords(delimiters)
    .map((delimiter, index) => {
      const min = readDelimiterRangeMin(delimiter);
      const max = readDelimiterRangeMax(delimiter);
      if (min === null || max === null) {
        return { kind: "incomplete" as const, delimiter, index };
      }

      const normalizedMin = Math.min(min, max);
      const normalizedMax = Math.max(min, max);
      return {
        kind: "complete" as const,
        delimiter: writeDelimiterRangeBounds(delimiter, normalizedMin, normalizedMax),
        index,
        min: normalizedMin,
        max: normalizedMax,
      };
    });

  const completeEntries = complete
    .filter((entry): entry is Extract<typeof complete[number], { kind: "complete" }> => entry.kind === "complete")
    .sort((left, right) => (left.min === right.min ? left.max - right.max : left.min - right.min))
    .map((entry) => ({ ...entry }));

  let previousMax: number | null = null;
  for (const entry of completeEntries) {
    let min = entry.min;
    let max = entry.max;
    if (previousMax !== null && min < previousMax - RANGE_EPSILON) {
      const width = Math.max(max - min, RANGE_EPSILON);
      min = previousMax;
      max = min + width;
    }
    entry.min = min;
    entry.max = max;
    entry.delimiter = writeDelimiterRangeBounds(entry.delimiter, min, max);
    previousMax = max;
  }

  const incompleteEntries = complete.filter((entry) => entry.kind === "incomplete");
  return [
    ...completeEntries.map((entry) => entry.delimiter),
    ...incompleteEntries.map((entry) => entry.delimiter),
  ];
}

export function fillDelimiterGaps(
  delimiters: unknown[],
): Array<Record<string, unknown>> {
  const next = cloneDelimiterRecords(delimiters);
  const completeEntries = next
    .map((delimiter, index) => {
      const min = readDelimiterRangeMin(delimiter);
      const max = readDelimiterRangeMax(delimiter);
      if (min === null || max === null || min >= max) return null;
      return { index, min, max };
    })
    .filter((entry): entry is { index: number; min: number; max: number } => entry !== null)
    .sort((left, right) => (left.min === right.min ? left.max - right.max : left.min - right.min));

  for (let index = 1; index < completeEntries.length; index++) {
    const previous = completeEntries[index - 1];
    const current = completeEntries[index];
    if (current.min > previous.max + RANGE_EPSILON) {
      next[current.index] = writeDelimiterRangeBounds(next[current.index], previous.max, current.max);
      current.min = previous.max;
    }
  }

  return next;
}

export function resolveDelimiterEnvironmentDefaults(
  delimiters: unknown[],
  delimiterIndices?: number[],
): Array<Record<string, unknown>> {
  const indexSet = delimiterIndices ? new Set(delimiterIndices) : null;
  return cloneDelimiterRecords(delimiters).map((delimiter, index) => {
    if (indexSet && !indexSet.has(index)) return delimiter;
    return writeDelimiterEnvironmentReference(delimiter, "Default", "");
  });
}
