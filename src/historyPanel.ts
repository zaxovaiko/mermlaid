import { historyLabel, historySubtitle, relativeTime, removeHistoryEntry } from "./history";
import type { HistoryEntry } from "./store";

export interface HistoryPanelOptions {
  panel: HTMLElement;
  list: HTMLUListElement;
  empty: HTMLElement;
  clearBtn: HTMLButtonElement;
  toggleBtn: HTMLButtonElement;
  /** Called when an entry is opened, so the caller can load it into the editor. */
  onOpen: (entry: HistoryEntry) => void;
  /** Called whenever the list or the active entry changes (remove, clear), so
   * the caller can persist it and stay in sync with which entry is active. */
  onChange: (history: HistoryEntry[], activeId: string | null) => void;
}

export interface HistoryPanel {
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Re-renders after the caller mutates history outside the panel (e.g. a new render). */
  refresh: () => void;
  setActiveId: (id: string | null) => void;
  setHistory: (history: HistoryEntry[]) => void;
}

export function createHistoryPanel(opts: HistoryPanelOptions): HistoryPanel {
  const { panel, list, empty, clearBtn, toggleBtn } = opts;
  let history: HistoryEntry[] = [];
  let activeId: string | null = null;

  function render() {
    list.replaceChildren(
      ...history.map((entry) => {
        const item = document.createElement("li");
        item.className = "history-item";
        if (entry.id === activeId) item.dataset.active = "true";

        const open = document.createElement("button");
        open.className = "history-open";
        open.title = "Load this diagram";

        const label = document.createElement("span");
        label.className = "history-label";
        label.textContent = historyLabel(entry.code);

        const meta = document.createElement("span");
        meta.className = "history-meta";
        meta.textContent = `${historySubtitle(entry.code)} · ${relativeTime(entry.updatedAt)}`;

        open.append(label, meta);
        open.addEventListener("click", () => {
          activeId = entry.id;
          opts.onOpen(entry);
          close();
        });

        const remove = document.createElement("button");
        remove.className = "history-remove";
        remove.title = "Remove from history";
        remove.setAttribute("aria-label", `Remove ${historyLabel(entry.code)} from history`);
        remove.textContent = "×";
        remove.addEventListener("click", () => {
          history = removeHistoryEntry(history, entry.id);
          if (activeId === entry.id) activeId = null;
          opts.onChange(history, activeId);
          render();
        });

        item.append(open, remove);
        return item;
      }),
    );
    empty.classList.toggle("hidden", history.length > 0);
    clearBtn.disabled = history.length === 0;
  }

  function open() {
    render();
    panel.classList.remove("hidden");
    toggleBtn.setAttribute("aria-expanded", "true");
  }

  function close() {
    panel.classList.add("hidden");
    toggleBtn.setAttribute("aria-expanded", "false");
  }

  function isOpen() {
    return !panel.classList.contains("hidden");
  }

  clearBtn.addEventListener("click", () => {
    history = [];
    activeId = null;
    opts.onChange(history, activeId);
    render();
  });

  return {
    isOpen,
    open,
    close,
    toggle: () => (isOpen() ? close() : open()),
    refresh: () => {
      if (isOpen()) render();
    },
    setActiveId: (id) => {
      activeId = id;
    },
    setHistory: (next) => {
      history = next;
    },
  };
}
