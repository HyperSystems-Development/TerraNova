import { listDirectory, readAssetFile, type DirectoryEntryData } from "@/utils/ipc";

export interface AssetReferenceCollection {
  names: string[];
  pathIndex: Record<string, string[]>;
}

const ENVIRONMENT_LOOKUP_CACHE = new Map<string, Promise<AssetReferenceCollection>>();
const PROJECT_ASSET_LOOKUP_CACHE = new Map<string, Promise<AssetReferenceCollection>>();
const WORKSPACE_ENVIRONMENT_HINT_CACHE = new Map<string, Promise<string[]>>();
const WORKSPACE_FILE_NAME = "_Workspace.json";
const WORKSPACE_SUFFIX = "Client\\NodeEditor\\Workspaces\\HytaleGenerator Java";
const ROAMING_WORKSPACE_SUFFIX = `AppData\\Roaming\\Hytale\\install\\pre-release\\package\\game\\latest\\${WORKSPACE_SUFFIX}`;

export type AssetReferenceKind = "environment" | "tint" | "material" | "prop";
export type AssetValidationLookupSource = "project-server" | "workspace-schema";
export type AssetValidationBadgeMode =
  | "project-assets"
  | "workspace-fallback"
  | "mixed"
  | "built-in-only";

const ASSET_DIRECTORY_CANDIDATES: Record<AssetReferenceKind, string[]> = {
  environment: ["Environments"],
  tint: ["Tints", "TintProvider", "TintProviders"],
  material: ["Materials", "MaterialProvider", "MaterialProviders"],
  prop: ["Props", "Prop"],
};

export interface AssetValidationBadge {
  mode: AssetValidationBadgeMode;
  label: string;
  detail: string | null;
}

export interface AssetValidationLookup {
  namesByKind: Record<AssetReferenceKind, string[]>;
  pathIndexByKind: Partial<Record<AssetReferenceKind, Record<string, string[]>>>;
  sourceByKind: Partial<Record<AssetReferenceKind, AssetValidationLookupSource>>;
  badge: AssetValidationBadge;
}

export interface AssetReferenceCandidate {
  name: string;
  path: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function findServerRoot(path: string | null): string | null {
  if (!path) return null;
  const normalized = path.replace(/\\/g, "/");
  const marker = "/server/";
  const markerIndex = normalized.toLowerCase().lastIndexOf(marker);
  if (markerIndex >= 0) {
    return normalized.slice(0, markerIndex + marker.length - 1).replace(/\//g, "\\");
  }
  if (normalized.toLowerCase().endsWith("/server")) {
    return normalized.replace(/\//g, "\\");
  }
  return null;
}

function getParentPath(path: string): string | null {
  const normalized = path.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  if (index <= 0) return null;
  return normalized.slice(0, index).replace(/\//g, "\\");
}

function joinWindowsPath(base: string, child: string): string {
  return `${base.replace(/[\\/]+$/, "")}\\${child}`;
}

function inferServerRoot(currentFile: string | null, projectPath: string | null): string | null {
  const fromCurrentFile = findServerRoot(currentFile);
  if (fromCurrentFile) return fromCurrentFile;

  const fromProjectPath = findServerRoot(projectPath);
  if (fromProjectPath) return fromProjectPath;

  if (!projectPath) return null;
  if (projectPath.toLowerCase().endsWith("\\hytalegenerator")) {
    return getParentPath(projectPath);
  }
  return joinWindowsPath(projectPath, "Server");
}

function inferUserProfileRoot(path: string | null): string | null {
  if (!path) return null;
  const normalized = path.replace(/\//g, "\\");
  const match = /^[A-Za-z]:\\Users\\[^\\]+/i.exec(normalized);
  return match ? match[0] : null;
}

function deriveWorkspacePathFromServerRoot(serverRoot: string): string | null {
  const gameRoot = getParentPath(serverRoot);
  if (!gameRoot) return null;
  return joinWindowsPath(gameRoot, WORKSPACE_SUFFIX);
}

function buildWorkspaceCandidates(
  currentFile: string | null,
  projectPath: string | null,
  serverRoot: string | null,
): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const pushCandidate = (candidate: string | null) => {
    if (!candidate) return;
    const normalized = candidate.replace(/\//g, "\\").replace(/[\\/]+$/, "");
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(normalized);
  };

  pushCandidate(serverRoot ? deriveWorkspacePathFromServerRoot(serverRoot) : null);

  const profileRoot =
    inferUserProfileRoot(currentFile)
    ?? inferUserProfileRoot(projectPath);
  if (profileRoot) {
    pushCandidate(joinWindowsPath(profileRoot, ROAMING_WORKSPACE_SUFFIX));
  }

  return candidates;
}

export function deriveServerRootFromWorkspacePath(workspacePath: string): string | null {
  if (!workspacePath) return null;
  const normalized = workspacePath.replace(/\//g, "\\").replace(/[\\/]+$/, "");
  const lower = normalized.toLowerCase();
  const marker = `\\${WORKSPACE_SUFFIX.toLowerCase()}`;
  const markerIndex = lower.lastIndexOf(marker);
  if (markerIndex >= 0) {
    return `${normalized.slice(0, markerIndex)}\\Server`;
  }

  const workspacesDir = getParentPath(normalized);
  const nodeEditorDir = workspacesDir ? getParentPath(workspacesDir) : null;
  const clientDir = nodeEditorDir ? getParentPath(nodeEditorDir) : null;
  const gameRoot = clientDir ? getParentPath(clientDir) : null;
  return gameRoot ? joinWindowsPath(gameRoot, "Server") : null;
}

export function extractWorkspaceEnvironmentTypeHints(workspaceDoc: unknown): string[] {
  const workspace = asRecord(workspaceDoc);
  if (!workspace) return [];
  const variants = asRecord(workspace.Variants);
  if (!variants) return [];
  const environmentVariants = asRecord(variants["EnvironmentProvider.Variants"]);
  if (!environmentVariants) return [];
  const entries = asRecord(environmentVariants.Variants);
  if (!entries) return [];
  return Object.keys(entries).sort((a, b) => a.localeCompare(b));
}

async function loadWorkspaceEnvironmentTypeHints(workspacePath: string): Promise<string[]> {
  const cacheKey = workspacePath.toLowerCase();
  const existing = WORKSPACE_ENVIRONMENT_HINT_CACHE.get(cacheKey);
  if (existing) return existing;

  const pending = readAssetFile(joinWindowsPath(workspacePath, WORKSPACE_FILE_NAME))
    .then((workspaceDoc) => extractWorkspaceEnvironmentTypeHints(workspaceDoc))
    .catch((error) => {
      WORKSPACE_ENVIRONMENT_HINT_CACHE.delete(cacheKey);
      throw error;
    });
  WORKSPACE_ENVIRONMENT_HINT_CACHE.set(cacheKey, pending);
  return pending;
}

function collectJsonPaths(entries: DirectoryEntryData[]): string[] {
  const stack = [...entries];
  const jsonPaths: string[] = [];
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) continue;
    if (entry.is_dir) {
      if (Array.isArray(entry.children)) {
        for (const child of entry.children) stack.push(child);
      }
      continue;
    }
    if (entry.path.toLowerCase().endsWith(".json")) {
      jsonPaths.push(entry.path);
    }
  }
  return jsonPaths;
}

function getFileStem(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const filename = normalized.slice(normalized.lastIndexOf("/") + 1);
  return filename.replace(/\.json$/i, "");
}

function addPathIndexValue(pathIndex: Record<string, string[]>, key: string, path: string): void {
  const list = pathIndex[key] ?? [];
  if (!list.includes(path)) {
    pathIndex[key] = [...list, path];
  }
}

function collectEnvironmentNames(entries: DirectoryEntryData[]): AssetReferenceCollection {
  const names = new Map<string, string>();
  const pathIndex: Record<string, string[]> = {};
  const paths = collectJsonPaths(entries).sort((a, b) => a.localeCompare(b));
  for (const path of paths) {
    const name = getFileStem(path);
    const key = name.toLowerCase();
    if (!names.has(key)) {
      names.set(key, name);
    }
    addPathIndexValue(pathIndex, key, path);
  }
  return {
    names: [...names.values()],
    pathIndex,
  };
}

function pathContainsCandidate(path: string, candidates: string[]): boolean {
  const parts = path.replace(/\\/g, "/").toLowerCase().split("/");
  const candidateSet = new Set(candidates.map((candidate) => candidate.toLowerCase()));
  return parts.some((part) => candidateSet.has(part));
}

function collectExportedNames(asset: unknown, names: Map<string, string>): void {
  if (!asset || typeof asset !== "object") return;
  if (Array.isArray(asset)) {
    for (const value of asset) collectExportedNames(value, names);
    return;
  }

  const record = asset as Record<string, unknown>;
  if (record.Type === "Exported" && typeof record.Name === "string" && record.Name.trim()) {
    const name = record.Name.trim();
    const key = name.toLowerCase();
    if (!names.has(key)) {
      names.set(key, name);
    }
  }

  for (const value of Object.values(record)) {
    collectExportedNames(value, names);
  }
}

async function collectAssetReferenceNames(
  entries: DirectoryEntryData[],
  candidates?: string[],
): Promise<AssetReferenceCollection> {
  const names = new Map<string, string>();
  const pathIndex: Record<string, string[]> = {};
  const paths = collectJsonPaths(entries)
    .filter((path) => !candidates || pathContainsCandidate(path, candidates))
    .sort((a, b) => a.localeCompare(b));

  for (const path of paths) {
    const stem = getFileStem(path);
    const stemKey = stem.toLowerCase();
    if (!names.has(stemKey)) {
      names.set(stemKey, stem);
    }
    addPathIndexValue(pathIndex, stemKey, path);
  }

  await Promise.all(paths.map(async (path) => {
    try {
      const asset = await readAssetFile(path);
      const exportedNames = new Map<string, string>();
      collectExportedNames(asset, exportedNames);
      for (const [key, value] of exportedNames) {
        if (!names.has(key)) {
          names.set(key, value);
        }
        addPathIndexValue(pathIndex, key, path);
      }
    } catch {
      // Keep validation resilient when a single asset fails to parse.
    }
  }));

  return {
    names: [...names.values()],
    pathIndex,
  };
}

async function loadEnvironmentNames(serverRoot: string): Promise<AssetReferenceCollection> {
  const cacheKey = serverRoot.toLowerCase();
  const existing = ENVIRONMENT_LOOKUP_CACHE.get(cacheKey);
  if (existing) return existing;

  const pending = listDirectory(joinWindowsPath(serverRoot, "Environments"))
    .then((entries) => collectEnvironmentNames(entries))
    .catch((error) => {
      ENVIRONMENT_LOOKUP_CACHE.delete(cacheKey);
      throw error;
    });
  ENVIRONMENT_LOOKUP_CACHE.set(cacheKey, pending);
  return pending;
}

async function loadProjectAssetNames(
  serverRoot: string,
  kind: Exclude<AssetReferenceKind, "environment">,
): Promise<AssetReferenceCollection> {
  const cacheKey = `${serverRoot.toLowerCase()}::${kind}`;
  const existing = PROJECT_ASSET_LOOKUP_CACHE.get(cacheKey);
  if (existing) return existing;

  const pending = (async () => {
    const candidates = ASSET_DIRECTORY_CANDIDATES[kind];

    for (const candidate of candidates) {
      try {
        const directEntries = await listDirectory(joinWindowsPath(serverRoot, candidate));
        return collectAssetReferenceNames(directEntries);
      } catch {
        // Try the next candidate path.
      }
    }

    const rootEntries = await listDirectory(serverRoot);
    return collectAssetReferenceNames(rootEntries, candidates);
  })().catch((error) => {
    PROJECT_ASSET_LOOKUP_CACHE.delete(cacheKey);
    throw error;
  });

  PROJECT_ASSET_LOOKUP_CACHE.set(cacheKey, pending);
  return pending;
}

export interface ResolvedEnvironmentLookup {
  names: string[];
  pathIndex: Record<string, string[]>;
  source: "project-server" | "workspace-schema";
  typeHints: string[];
  workspacePath: string | null;
  warning: string | null;
}

export async function resolveEnvironmentLookup(
  currentFile: string | null,
  projectPath: string | null,
): Promise<ResolvedEnvironmentLookup> {
  const inferredServerRoot = inferServerRoot(currentFile, projectPath);
  if (inferredServerRoot) {
    try {
      const collection = await loadEnvironmentNames(inferredServerRoot);
      return {
        names: collection.names,
        pathIndex: collection.pathIndex,
        source: "project-server",
        typeHints: [],
        workspacePath: null,
        warning: null,
      };
    } catch {
      // Fall back to workspace schema/asset paths below.
    }
  }

  const workspaceCandidates = buildWorkspaceCandidates(currentFile, projectPath, inferredServerRoot);
  if (workspaceCandidates.length === 0) {
    throw new Error("Could not infer Server/Environments or NodeEditor workspace paths.");
  }

  let lastError: string | null = null;
  for (const workspacePath of workspaceCandidates) {
    try {
      const typeHints = await loadWorkspaceEnvironmentTypeHints(workspacePath);
      const fallbackServerRoot = deriveServerRootFromWorkspacePath(workspacePath);
      let collection: AssetReferenceCollection = { names: [], pathIndex: {} };
      let warning: string | null = null;

      if (fallbackServerRoot) {
        try {
          collection = await loadEnvironmentNames(fallbackServerRoot);
        } catch (error) {
          warning = `Loaded workspace schema from ${workspacePath}, but Server/Environments lookup failed: ${String(error)}`;
        }
      } else {
        warning = `Loaded workspace schema from ${workspacePath}, but could not derive a Server root.`;
      }

      return {
        names: collection.names,
        pathIndex: collection.pathIndex,
        source: "workspace-schema",
        typeHints,
        workspacePath,
        warning,
      };
    } catch (error) {
      lastError = String(error);
    }
  }

  throw new Error(lastError ?? "Failed to load workspace schema fallback.");
}

export async function loadKnownEnvironmentNames(
  currentFile: string | null,
  projectPath: string | null,
): Promise<string[] | null> {
  try {
    const lookup = await resolveEnvironmentLookup(currentFile, projectPath);
    return lookup.names;
  } catch {
    return null;
  }
}

export function buildAssetValidationBadge(
  sourceByKind: Partial<Record<AssetReferenceKind, AssetValidationLookupSource>>,
): AssetValidationBadge {
  const values = Object.values(sourceByKind);
  const hasProject = values.includes("project-server");
  const hasFallback = values.includes("workspace-schema");

  if (hasProject && hasFallback) {
    return {
      mode: "mixed",
      label: "Mixed ref validation",
      detail: "Project assets + workspace fallback",
    };
  }

  if (hasProject) {
    return {
      mode: "project-assets",
      label: "Validated against project assets",
      detail: null,
    };
  }

  if (hasFallback) {
    return {
      mode: "workspace-fallback",
      label: "Validated with workspace fallback",
      detail: null,
    };
  }

  return {
    mode: "built-in-only",
    label: "Built-in validation only",
    detail: "Project asset lookup unavailable",
  };
}

function normalizeReferenceName(name: string): string {
  return name.trim().toLowerCase().replace(/\.json$/i, "");
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1).fill(0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    for (let index = 0; index < current.length; index++) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}

export function findAssetReferenceCandidates(
  referenceName: string,
  kind: AssetReferenceKind,
  pathIndexByKind: Partial<Record<AssetReferenceKind, Record<string, string[]>>>,
  namesByKind?: Partial<Record<AssetReferenceKind, string[]>>,
  limit: number = 3,
): string[] {
  return findAssetReferenceCandidateEntries(
    referenceName,
    kind,
    pathIndexByKind,
    namesByKind,
    limit,
  ).map((candidate) => candidate.path);
}

export function findAssetReferenceCandidateEntries(
  referenceName: string,
  kind: AssetReferenceKind,
  pathIndexByKind: Partial<Record<AssetReferenceKind, Record<string, string[]>>>,
  namesByKind?: Partial<Record<AssetReferenceKind, string[]>>,
  limit: number = 3,
): AssetReferenceCandidate[] {
  const normalizedReference = normalizeReferenceName(referenceName);
  if (!normalizedReference) return [];

  const pathIndex = pathIndexByKind[kind];
  if (!pathIndex) return [];
  const displayNameByKey = new Map<string, string>();
  const knownNames = namesByKind?.[kind] ?? [];
  for (const name of knownNames) {
    const normalizedName = normalizeReferenceName(name);
    if (normalizedName && !displayNameByKey.has(normalizedName)) {
      displayNameByKey.set(normalizedName, name);
    }
  }
  const toCandidate = (candidateKey: string, paths: string[]): AssetReferenceCandidate[] => {
    if (paths.length === 0) return [];
    const fallbackName = getFileStem(paths[0]) || candidateKey;
    const name = displayNameByKey.get(candidateKey) ?? fallbackName;
    return [{ name, path: paths[0] }];
  };

  const exact = pathIndex[normalizedReference];
  if (exact && exact.length > 0) {
    return toCandidate(normalizedReference, exact).slice(0, limit);
  }

  const scored = Object.entries(pathIndex)
    .map(([candidateName, paths]) => {
      const distance = levenshteinDistance(normalizedReference, candidateName);
      const containsBonus =
        candidateName.includes(normalizedReference) || normalizedReference.includes(candidateName)
          ? 2
          : 0;
      const prefixBonus = candidateName.slice(0, 4) === normalizedReference.slice(0, 4) ? 1 : 0;
      return {
        candidateName,
        paths,
        score: distance - containsBonus - prefixBonus,
      };
    })
    .sort((left, right) => left.score - right.score);

  const threshold = Math.max(4, Math.floor(normalizedReference.length * 0.45));
  const results: AssetReferenceCandidate[] = [];
  const seenNames = new Set<string>();
  for (const entry of scored) {
    if (entry.score > threshold) continue;
    const candidates = toCandidate(entry.candidateName, entry.paths);
    for (const candidate of candidates) {
      const key = normalizeReferenceName(candidate.name);
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      results.push(candidate);
      if (results.length >= limit) return results;
    }
  }

  return results;
}

export async function resolveAssetValidationLookup(
  currentFile: string | null,
  projectPath: string | null,
): Promise<AssetValidationLookup> {
  const namesByKind: Record<AssetReferenceKind, string[]> = {
    environment: [],
    tint: [],
    material: [],
    prop: [],
  };
  const pathIndexByKind: Partial<Record<AssetReferenceKind, Record<string, string[]>>> = {};
  const sourceByKind: Partial<Record<AssetReferenceKind, AssetValidationLookupSource>> = {};

  try {
    const environmentLookup = await resolveEnvironmentLookup(currentFile, projectPath);
    namesByKind.environment = environmentLookup.names;
    pathIndexByKind.environment = environmentLookup.pathIndex;
    sourceByKind.environment = environmentLookup.source;
  } catch {
    // Environment fallback is optional; callers still get built-in validation.
  }

  const serverRoot = inferServerRoot(currentFile, projectPath);
  if (serverRoot) {
    for (const kind of ["tint", "material", "prop"] as const) {
      try {
        const collection = await loadProjectAssetNames(serverRoot, kind);
        namesByKind[kind] = collection.names;
        pathIndexByKind[kind] = collection.pathIndex;
        sourceByKind[kind] = "project-server";
      } catch {
        // Leave this kind unavailable; diagnostics will skip unknown-ref checks.
      }
    }
  }

  return {
    namesByKind,
    pathIndexByKind,
    sourceByKind,
    badge: buildAssetValidationBadge(sourceByKind),
  };
}
