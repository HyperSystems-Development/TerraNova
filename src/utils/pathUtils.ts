/**
 * Cross-platform path utilities. Uses forward slashes throughout, which work
 * on Windows, macOS, and Linux (Windows APIs accept forward slashes).
 */

/** Normalize a path to use forward slashes and remove trailing slashes. */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}

/** Join two path segments with a forward slash. */
export function joinPath(base: string, child: string): string {
  return `${normalizePath(base)}/${child.replace(/^[\\/]+/, "").replace(/\\/g, "/")}`;
}

/** Get the parent directory of a path. Returns the path itself for root paths. */
export function getDirname(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf("/");
  if (index <= 0) return normalized;
  return normalized.slice(0, index);
}

/** Check if `path` starts with `root` (case-insensitive, separator-agnostic). */
export function isPathInProject(path: string | undefined, projectPath: string | null): boolean {
  if (!path || !projectPath) return false;
  const normalizedPath = normalizePath(path).toLowerCase();
  const normalizedProject = normalizePath(projectPath).toLowerCase();
  return normalizedPath === normalizedProject || normalizedPath.startsWith(`${normalizedProject}/`);
}

/**
 * Find the "Server" root from a file path by looking for known marker
 * directories in the path hierarchy.
 */
export function findServerRoot(path: string | null): string | null {
  if (!path) return null;
  const normalized = normalizePath(path).toLowerCase();
  const markers = ["/server/weathers", "/server/environments", "/server/hytalegenerator"];
  for (const marker of markers) {
    const index = normalized.lastIndexOf(marker);
    if (index !== -1) {
      return normalizePath(path).slice(0, index + "/server".length);
    }
  }
  return null;
}

/**
 * Infer the server root from a project path. Checks if the path itself
 * is a known subdirectory, otherwise appends "Server".
 */
export function inferServerRoot(
  currentFile: string | null,
  projectPath: string | null,
): string | null {
  const fromFile = findServerRoot(currentFile);
  if (fromFile) return fromFile;
  const fromProject = findServerRoot(projectPath);
  if (fromProject) return fromProject;
  if (!projectPath) return null;
  if (normalizePath(projectPath).toLowerCase().endsWith("/hytalegenerator")) {
    return getDirname(normalizePath(projectPath));
  }
  return joinPath(projectPath, "Server");
}
