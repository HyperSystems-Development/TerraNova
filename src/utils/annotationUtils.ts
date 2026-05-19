const AUTHOR_NOTE_PREFIX = "Author Note:";

export function isAuthorNoteText(text: string | null | undefined): boolean {
  if (!text) return false;
  return text.trimStart().toLowerCase().startsWith(AUTHOR_NOTE_PREFIX.toLowerCase());
}

export function makeAuthorNoteText(text: string | null | undefined): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return `${AUTHOR_NOTE_PREFIX} `;
  if (isAuthorNoteText(trimmed)) return trimmed;
  return `${AUTHOR_NOTE_PREFIX} ${trimmed}`;
}

export function stripAuthorNotePrefix(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/^\s*author note:\s*/i, "");
}
