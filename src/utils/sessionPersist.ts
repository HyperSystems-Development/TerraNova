/**
 * Persist and restore navigation session state across page reloads.
 *
 * Saves projectPath, currentFile, and activeBiomeSection to localStorage
 * so the app can resume where the user left off after a reload.
 */

const SESSION_KEY = "tn-session";

export interface SessionState {
  projectPath: string | null;
  currentFile: string | null;
  activeBiomeSection: string | null;
}

export function saveSession(state: Partial<SessionState>): void {
  try {
    const current = loadSession();
    const merged = { ...current, ...state };
    localStorage.setItem(SESSION_KEY, JSON.stringify(merged));
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

export function loadSession(): SessionState {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { projectPath: null, currentFile: null, activeBiomeSection: null };
    return JSON.parse(raw) as SessionState;
  } catch {
    return { projectPath: null, currentFile: null, activeBiomeSection: null };
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // noop
  }
}
