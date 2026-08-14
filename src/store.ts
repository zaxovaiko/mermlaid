import { load, type Store } from "@tauri-apps/plugin-store";
import type { ExportFormat } from "./export";
import type { DiagramTheme } from "./render";

export interface HistoryEntry {
  id: string;
  code: string;
  /** Timestamp of the last successful render of this entry, epoch ms. */
  updatedAt: number;
}

export const HISTORY_LIMIT = 50;

export interface PersistedState {
  code: string;
  hotkey: string;
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
  hotkey: "CmdOrCtrl+Shift+M",
  exportFormat: "png",
  exportScale: 2,
  wrapLines: true,
  diagramTheme: "system",
  exportBackground: false,
  splitRatio: 0.5,
  history: [],
};

let storePromise: Promise<Store> | null = null;
/** The last state written, kept in memory so a patch never has to read the
 * store back — two patches issued before either write settles would otherwise
 * both merge onto the same stale snapshot and the first one would be lost. */
let currentState: PersistedState = DEFAULT_STATE;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load("mermlaid-state.json", { autoSave: 200 });
  }
  return storePromise;
}

export async function loadState(): Promise<PersistedState> {
  const store = await getStore();
  const saved = await store.get<Partial<PersistedState>>("state");
  currentState = { ...DEFAULT_STATE, ...saved };
  return currentState;
}

export async function saveState(patch: Partial<PersistedState>): Promise<void> {
  currentState = { ...currentState, ...patch };
  const store = await getStore();
  await store.set("state", currentState);
}
