import { load, type Store } from "@tauri-apps/plugin-store";

export type ExportFormat = "png" | "jpg" | "svg";

export interface PersistedState {
  code: string;
  autoRender: boolean;
  exportFormat: ExportFormat;
  exportScale: number;
  wrapLines: boolean;
}

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
