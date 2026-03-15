import { getVersion } from "@tauri-apps/api/app";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ReleaseSection {
  title: string;
  items: { label: string; description: string }[];
}

export interface ReleaseData {
  version: string;
  date: string;
  name: string;
  sections: ReleaseSection[];
}

// ── Cache ──────────────────────────────────────────────────────────────────────

const CACHE_STORAGE_KEY = "terranova:releases-cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let memoryCache: ReleaseData[] | null = null;

interface StoredCache {
  timestamp: number;
  releases: ReleaseData[];
}

function readLocalStorageCache(): ReleaseData[] | null {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const stored: StoredCache = JSON.parse(raw);
    if (Date.now() - stored.timestamp > CACHE_TTL_MS) return null;
    return stored.releases;
  } catch {
    return null;
  }
}

function writeLocalStorageCache(releases: ReleaseData[]) {
  try {
    const stored: StoredCache = { timestamp: Date.now(), releases };
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(stored));
  } catch { /* quota or private-mode — ignore */ }
}

// ── Sections to strip from release markdown ────────────────────────────────────

const STRIPPED_SECTIONS = new Set(["installation", "full changelog"]);

// ── Markdown parser ────────────────────────────────────────────────────────────

function parseReleaseBody(body: string): ReleaseSection[] {
  const sections: ReleaseSection[] = [];
  // Split on level-2 headings (## Heading)
  const blocks = body.split(/^##\s+/m).filter(Boolean);

  for (const block of blocks) {
    const newlineIdx = block.indexOf("\n");
    const title = (newlineIdx === -1 ? block : block.slice(0, newlineIdx)).trim();
    if (STRIPPED_SECTIONS.has(title.toLowerCase())) continue;

    const content = newlineIdx === -1 ? "" : block.slice(newlineIdx + 1).trim();
    const items = parseItems(content);
    if (items.length > 0) {
      sections.push({ title, items });
    }
  }
  return sections;
}

/**
 * Parse items from a section body. Handles:
 *  - `**Label** — Description` (paragraph style)
 *  - `- **Label** — Description` (list style)
 *  - `- Plain text` (no bold prefix)
 */
function parseItems(content: string): { label: string; description: string }[] {
  const items: { label: string; description: string }[] = [];
  const lines = content.split("\n");

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Strip leading list marker
    const stripped = line.replace(/^[-*]\s+/, "");

    // Try to extract **Label** — Description
    const match = stripped.match(/^\*\*(.+?)\*\*\s*[—–\-:]\s*(.+)$/);
    if (match) {
      items.push({ label: match[1].trim(), description: match[2].trim() });
    } else if (stripped.length > 0) {
      // Plain text item — use the full text as the label
      items.push({ label: stripped, description: "" });
    }
  }
  return items;
}

// ── Fetcher ────────────────────────────────────────────────────────────────────

const RELEASES_URL =
  "https://api.github.com/repos/HyperSystems-Development/TerraNova/releases";

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
}

function parseVersion(tag: string): string {
  return tag.replace(/^v/, "");
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function toReleaseData(gh: GitHubRelease): ReleaseData {
  return {
    version: parseVersion(gh.tag_name),
    date: formatDate(gh.published_at),
    name: gh.name ?? parseVersion(gh.tag_name),
    sections: parseReleaseBody(gh.body ?? ""),
  };
}

export async function fetchReleases(): Promise<ReleaseData[]> {
  // 1. In-memory cache (fastest)
  if (memoryCache) return memoryCache;

  // 2. localStorage cache (survives page reloads)
  const stored = readLocalStorageCache();
  if (stored) {
    memoryCache = stored;
    return stored;
  }

  // 3. Network fetch
  const res = await fetch(RELEASES_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);

  const raw: GitHubRelease[] = await res.json();
  const releases = raw
    .filter((r) => !r.draft)
    .map(toReleaseData);

  memoryCache = releases;
  writeLocalStorageCache(releases);
  return releases;
}

// ── App version helper ─────────────────────────────────────────────────────────

let appVersionCache: string | null = null;

export async function getAppVersion(): Promise<string> {
  if (appVersionCache) return appVersionCache;
  try {
    appVersionCache = await getVersion();
  } catch {
    appVersionCache = "0.0.0";
  }
  return appVersionCache;
}
