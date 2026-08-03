import { load, type Store } from "@tauri-apps/plugin-store";
import type { DiagramTheme } from "./render";

export type ExportFormat = "png" | "jpg" | "svg";

export interface HistoryEntry {
  id: string;
  code: string;
  /** Timestamp of the last successful render of this entry, epoch ms. */
  updatedAt: number;
}

export const HISTORY_LIMIT = 50;

export interface PersistedState {
  code: string;
  autoRender: boolean;
  exportFormat: ExportFormat;
  exportScale: number;
  wrapLines: boolean;
  diagramTheme: DiagramTheme;
  /** Whether copies and exports carry the theme's background instead of
   * being transparent. */
  exportBackground: boolean;
  /** Share of the split taken by the editor pane, 0..1. */
  splitRatio: number;
  history: HistoryEntry[];
}

export const MIN_SPLIT_RATIO = 0.12;
export const MAX_SPLIT_RATIO = 0.88;

const DEFAULT_STATE: PersistedState = {
  code: [
    "flowchart TD",
    "    A[Start] --> B{Is it working?}",
    "    B -- Yes --> C[Great!]",
    "    B -- No --> D[Debug]",
    "    D --> B",
  ].join("\n"),
  autoRender: true,
  exportFormat: "png",
  exportScale: 2,
  wrapLines: true,
  diagramTheme: "system",
  exportBackground: false,
  splitRatio: 0.5,
  history: [],
};

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load("mermlaid-state.json", { autoSave: 200 });
  }
  return storePromise;
}

export async function loadState(): Promise<PersistedState> {
  const store = await getStore();
  const saved = await store.get<Partial<PersistedState>>("state");
  return { ...DEFAULT_STATE, ...saved };
}

export async function saveState(patch: Partial<PersistedState>): Promise<void> {
  const store = await getStore();
  const current = (await store.get<Partial<PersistedState>>("state")) ?? {};
  await store.set("state", { ...DEFAULT_STATE, ...current, ...patch });
}
