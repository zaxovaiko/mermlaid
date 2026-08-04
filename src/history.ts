import { HISTORY_LIMIT, type HistoryEntry } from "./store";

/** Label shown in the history list: the first node label if the diagram has
 * one, otherwise the first meaningful line (the `flowchart TD` header is a
 * poor title when every entry starts with it). */
export function historyLabel(code: string): string {
  const lines = code
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "Empty diagram";

  for (const line of lines.slice(1)) {
    const bracketed = line.match(/[[({>]{1,2}"?([^"\]})]+)"?[\])}]/);
    if (bracketed?.[1]) return bracketed[1].trim().slice(0, 60);
  }
  return lines[0].slice(0, 60);
}

export function historySubtitle(code: string): string {
  const kind = code.trim().split(/\s+/, 1)[0] ?? "";
  const lines = code.split("\n").filter((line) => line.trim()).length;
  return `${kind || "diagram"} · ${lines} line${lines === 1 ? "" : "s"}`;
}

export function relativeTime(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Records a render. Editing an entry that is already open updates it in place
 * rather than appending a near-duplicate on every keystroke, so `activeId` is
 * how the caller says "this is still the same diagram". Returns the new list
 * and the id now considered active. */
export function recordHistory(
  history: HistoryEntry[],
  code: string,
  activeId: string | null,
  now = Date.now(),
): { history: HistoryEntry[]; activeId: string | null } {
  const trimmed = code.trim();
  if (!trimmed) return { history, activeId };

  const identical = history.find((entry) => entry.code.trim() === trimmed);
  const target = identical ?? (activeId ? history.find((entry) => entry.id === activeId) : undefined);

  if (target) {
    const updated: HistoryEntry = { ...target, code, updatedAt: now };
    return {
      history: [updated, ...history.filter((entry) => entry.id !== target.id)].slice(0, HISTORY_LIMIT),
      activeId: updated.id,
    };
  }

  const entry: HistoryEntry = { id: newId(), code, updatedAt: now };
  return { history: [entry, ...history].slice(0, HISTORY_LIMIT), activeId: entry.id };
}

export function removeHistoryEntry(history: HistoryEntry[], id: string): HistoryEntry[] {
  return history.filter((entry) => entry.id !== id);
}
