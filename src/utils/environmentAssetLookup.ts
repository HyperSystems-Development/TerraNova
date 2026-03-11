import { listDirectory, readAssetFile, type DirectoryEntryData } from "@/utils/ipc";

const ENVIRONMENT_LOOKUP_CACHE = new Map<string, Promise<string[]>>();
const PROJECT_ASSET_LOOKUP_CACHE = new Map<string, Promise<string[]>>();
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
  sourceByKind: Partial<Record<AssetReferenceKind, AssetValidationLookupSource>>;
  badge: AssetValidationBadge;
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

function collectEnvironmentNames(entries: DirectoryEntryData[]): string[] {
  const names = new Map<string, string>();
  const paths = collectJsonPaths(entries).sort((a, b) => a.localeCompare(b));
  for (const path of paths) {
    const name = getFileStem(path);
    const key = name.toLowerCase();
    if (!names.has(key)) {
      names.set(key, name);
    }
  }
  return [...names.values()];
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
): Promise<string[]> {
  const names = new Map<string, string>();
  const paths = collectJsonPaths(entries)
    .filter((path) => !candidates || pathContainsCandidate(path, candidates))
    .sort((a, b) => a.localeCompare(b));

  for (const path of paths) {
    const stem = getFileStem(path);
    const stemKey = stem.toLowerCase();
    if (!names.has(stemKey)) {
      names.set(stemKey, stem);
    }
  }

  await Promise.all(paths.map(async (path) => {
    try {
      const asset = await readAssetFile(path);
      collectExportedNames(asset, names);
    } catch {
      // Keep validation resilient when a single asset fails to parse.
    }
  }));

  return [...names.values()];
}

async function loadEnvironmentNames(serverRoot: string): Promise<string[]> {
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
): Promise<string[]> {
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
      const names = await loadEnvironmentNames(inferredServerRoot);
      return {
        names,
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
      let names: string[] = [];
      let warning: string | null = null;

      if (fallbackServerRoot) {
        try {
          names = await loadEnvironmentNames(fallbackServerRoot);
        } catch (error) {
          warning = `Loaded workspace schema from ${workspacePath}, but Server/Environments lookup failed: ${String(error)}`;
        }
      } else {
        warning = `Loaded workspace schema from ${workspacePath}, but could not derive a Server root.`;
      }

      return {
        names,
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
  const sourceByKind: Partial<Record<AssetReferenceKind, AssetValidationLookupSource>> = {};

  try {
    const environmentLookup = await resolveEnvironmentLookup(currentFile, projectPath);
    namesByKind.environment = environmentLookup.names;
    sourceByKind.environment = environmentLookup.source;
  } catch {
    // Environment fallback is optional; callers still get built-in validation.
  }

  const serverRoot = inferServerRoot(currentFile, projectPath);
  if (serverRoot) {
    for (const kind of ["tint", "material", "prop"] as const) {
      try {
        const names = await loadProjectAssetNames(serverRoot, kind);
        namesByKind[kind] = names;
        sourceByKind[kind] = "project-server";
      } catch {
        // Leave this kind unavailable; diagnostics will skip unknown-ref checks.
      }
    }
  }

  return {
    namesByKind,
    sourceByKind,
    badge: buildAssetValidationBadge(sourceByKind),
  };
}
