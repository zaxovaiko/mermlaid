import { getCurrentWindow } from "@tauri-apps/api/window";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { createEditor, setEditorValue, setLineWrapping } from "./editor";
import {
  type DiagramTheme,
  DIAGRAM_THEMES,
  diagramBackground,
  MermaidSyntaxError,
  normalizeSvgSize,
  onSystemThemeChange,
  renderMermaid,
} from "./render";
import { PanZoom } from "./panzoom";
import { copyRasterToClipboard, copySvgToClipboard, type ExportFormat, saveDiagramToFile } from "./export";
import { type HistoryEntry, loadState, MAX_SPLIT_RATIO, MIN_SPLIT_RATIO, saveState } from "./store";
import { historyLabel, historySubtitle, recordHistory, relativeTime, removeHistoryEntry } from "./history";
import "./styles.css";

function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delayMs: number) {
  let handle: ReturnType<typeof setTimeout> | undefined;
  return (...args: Args) => {
    if (handle) clearTimeout(handle);
    handle = setTimeout(() => fn(...args), delayMs);
  };
}

async function main() {
  const windowLabel = getCurrentWindow().label;
  document.body.dataset.window = windowLabel;
  // Native NSVisualEffectView vibrancy is applied from Rust on macOS only;
  // everywhere else the glass blur is done in CSS. See styles.css.
  document.body.dataset.platform = navigator.platform.toLowerCase().includes("mac") ? "macos" : "other";

  const state = await loadState();

  const editorHost = document.querySelector<HTMLElement>("#editor-host")!;
  const errorBanner = document.querySelector<HTMLElement>("#error-banner")!;
  const diagramHost = document.querySelector<HTMLElement>("#diagram")!;
  const emptyState = document.querySelector<HTMLElement>("#empty-state")!;
  const viewer = document.querySelector<HTMLElement>("#viewer")!;
  const viewerSurface = document.querySelector<HTMLElement>("#viewer-surface")!;
  const autoRenderToggle = document.querySelector<HTMLInputElement>("#auto-render-toggle")!;
  const visualizeBtn = document.querySelector<HTMLButtonElement>("#visualize-btn")!;
  const fitBtn = document.querySelector<HTMLButtonElement>("#fit-btn")!;
  const resetZoomBtn = document.querySelector<HTMLButtonElement>("#reset-zoom-btn")!;
  const fullscreenBtn = document.querySelector<HTMLButtonElement>("#fullscreen-btn")!;
  const formatSelect = document.querySelector<HTMLSelectElement>("#export-format")!;
  const scaleSelect = document.querySelector<HTMLSelectElement>("#export-scale")!;
  const themeSelect = document.querySelector<HTMLSelectElement>("#theme-select")!;
  const backgroundBtn = document.querySelector<HTMLButtonElement>("#background-btn")!;
  const copyBtn = document.querySelector<HTMLButtonElement>("#copy-btn")!;
  const saveBtn = document.querySelector<HTMLButtonElement>("#save-btn")!;
  const expandBtn = document.querySelector<HTMLButtonElement>("#expand-btn")!;
  const wrapToggleBtn = document.querySelector<HTMLButtonElement>("#wrap-toggle-btn")!;
  const aboutBtn = document.querySelector<HTMLButtonElement>("#about-btn")!;
  const aboutPanel = document.querySelector<HTMLElement>("#about-panel")!;
  const aboutVersion = document.querySelector<HTMLElement>("#about-version")!;
  const aboutUpdateBtn = document.querySelector<HTMLButtonElement>("#about-update-btn")!;
  const aboutSiteBtn = document.querySelector<HTMLButtonElement>("#about-site-btn")!;
  const historyBtn = document.querySelector<HTMLButtonElement>("#history-btn")!;
  const historyPanel = document.querySelector<HTMLElement>("#history-panel")!;
  const historyList = document.querySelector<HTMLUListElement>("#history-list")!;
  const historyEmpty = document.querySelector<HTMLElement>("#history-empty")!;
  const historyClearBtn = document.querySelector<HTMLButtonElement>("#history-clear-btn")!;
  const split = document.querySelector<HTMLElement>("#split")!;
  const seam = document.querySelector<HTMLElement>("#seam")!;
  const editorPane = document.querySelector<HTMLElement>("#editor-pane")!;
  const seamPulse = document.querySelector<HTMLElement>("#seam-pulse")!;
  const toast = document.querySelector<HTMLElement>("#toast")!;

  type Status = "idle" | "rendering" | "success" | "error";
  function setStatus(status: Status) {
    document.body.dataset.status = status;
  }

  function fireSeamPulse() {
    seamPulse.classList.remove("firing");
    // restart the CSS animation
    void seamPulse.offsetWidth;
    seamPulse.classList.add("firing");
  }

  function flashError(message: string) {
    errorBanner.textContent = message;
    errorBanner.classList.remove("hidden");
    setStatus("error");
    setTimeout(() => {
      errorBanner.classList.add("hidden");
      setStatus(hasRenderedOnce ? "success" : "idle");
    }, 3000);
  }

  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  function showToast(message: string, kind: "success" | "error" = "success") {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.dataset.kind = kind;
    toast.classList.add("visible");
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 1800);
  }

  autoRenderToggle.checked = state.autoRender;
  formatSelect.value = state.exportFormat;
  scaleSelect.value = String(state.exportScale);

  function updateWrapButton(wrap: boolean) {
    wrapToggleBtn.setAttribute("aria-pressed", String(wrap));
    wrapToggleBtn.title = wrap ? "Wrap lines" : "Unwrap lines";
  }
  updateWrapButton(state.wrapLines);

  function currentFormat(): ExportFormat {
    return formatSelect.value as ExportFormat;
  }

  function currentScale(): number {
    return Number(scaleSelect.value);
  }

  function updateCopyAvailability() {
    copyBtn.disabled = false;
    copyBtn.title =
      currentFormat() === "jpg"
        ? "Copy to clipboard (bitmap, flattened onto white — pasting apps re-encode it themselves)"
        : "Copy to clipboard";
  }
  updateCopyAvailability();

  themeSelect.replaceChildren(
    ...DIAGRAM_THEMES.map(({ value, label }) => new Option(label, value)),
  );
  themeSelect.value = state.diagramTheme;

  function currentTheme(): DiagramTheme {
    return themeSelect.value as DiagramTheme;
  }

  function backgroundEnabled(): boolean {
    return backgroundBtn.getAttribute("aria-pressed") === "true";
  }

  /** The colour to paint behind the diagram, or null to keep it transparent. */
  function exportBackgroundColor(): string | null {
    return backgroundEnabled() ? diagramBackground(currentTheme()) : null;
  }

  function updateBackgroundButton(enabled: boolean) {
    backgroundBtn.setAttribute("aria-pressed", String(enabled));
    backgroundBtn.title = enabled ? "Background included" : "Background transparent";
  }
  updateBackgroundButton(state.exportBackground);

  /** Tints the preview canvas so what you see matches what gets exported. */
  function applyPreviewBackground() {
    viewer.style.backgroundColor = diagramBackground(currentTheme());
  }
  applyPreviewBackground();

  // The split runs vertically in the popover and horizontally in the main
  // window, so the drag axis follows whichever the current window uses.
  const splitsHorizontally = () => windowLabel === "main";

  function applySplitRatio(ratio: number) {
    editorPane.style.flexBasis = `${ratio * 100}%`;
  }
  applySplitRatio(state.splitRatio);

  seam.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    seam.setPointerCapture(e.pointerId);
    seam.dataset.dragging = "true";

    const onMove = (move: PointerEvent) => {
      const rect = split.getBoundingClientRect();
      const raw = splitsHorizontally()
        ? (move.clientX - rect.left) / rect.width
        : (move.clientY - rect.top) / rect.height;
      applySplitRatio(Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, raw)));
    };

    const onUp = () => {
      seam.removeEventListener("pointermove", onMove);
      seam.removeEventListener("pointerup", onUp);
      seam.removeEventListener("pointercancel", onUp);
      delete seam.dataset.dragging;
      void saveState({ splitRatio: parseFloat(editorPane.style.flexBasis) / 100 });
    };

    seam.addEventListener("pointermove", onMove);
    seam.addEventListener("pointerup", onUp);
    seam.addEventListener("pointercancel", onUp);
  });

  seam.addEventListener("dblclick", () => {
    applySplitRatio(0.5);
    void saveState({ splitRatio: 0.5 });
  });

  const panZoom = new PanZoom({ container: viewer, target: viewerSurface });
  panZoom.onZoomChange(() => {
    resetZoomBtn.textContent = `${panZoom.getScalePercent()}%`;
  });

  let hasRenderedOnce = false;

  let history: HistoryEntry[] = state.history;
  // Which entry the editor is currently "inside", so edits update that entry
  // instead of appending a new one on every successful render.
  let activeHistoryId: string | null = null;

  function renderHistory() {
    historyList.replaceChildren(
      ...history.map((entry) => {
        const item = document.createElement("li");
        item.className = "history-item";
        if (entry.id === activeHistoryId) item.dataset.active = "true";

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
          activeHistoryId = entry.id;
          setEditorValue(editor, entry.code);
          void saveState({ code: entry.code });
          void visualize(entry.code);
          closeHistory();
        });

        const remove = document.createElement("button");
        remove.className = "history-remove";
        remove.title = "Remove from history";
        remove.setAttribute("aria-label", `Remove ${historyLabel(entry.code)} from history`);
        remove.textContent = "×";
        remove.addEventListener("click", () => {
          history = removeHistoryEntry(history, entry.id);
          if (activeHistoryId === entry.id) activeHistoryId = null;
          void saveState({ history });
          renderHistory();
        });

        item.append(open, remove);
        return item;
      }),
    );
    historyEmpty.classList.toggle("hidden", history.length > 0);
    historyClearBtn.disabled = history.length === 0;
  }

  function openHistory() {
    renderHistory();
    historyPanel.classList.remove("hidden");
    historyBtn.setAttribute("aria-expanded", "true");
  }

  function closeHistory() {
    historyPanel.classList.add("hidden");
    historyBtn.setAttribute("aria-expanded", "false");
  }

  function isHistoryOpen() {
    return !historyPanel.classList.contains("hidden");
  }

  // Updates are deliberately not polled: the app makes no network requests,
  // and App Store builds must be updated through the App Store itself.
  const APP_STORE_URL = "https://apps.apple.com/app/id6797646690";
  const SITE_URL = "https://dyvertex.com/";

  void getVersion().then((version) => {
    aboutVersion.textContent = `Version ${version}`;
  });

  function closeAbout() {
    aboutPanel.classList.add("hidden");
  }

  aboutBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeHistory();
    aboutPanel.classList.toggle("hidden");
  });

  aboutUpdateBtn.addEventListener("click", () => void openUrl(APP_STORE_URL));
  aboutSiteBtn.addEventListener("click", () => void openUrl(SITE_URL));

  historyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeAbout();
    if (isHistoryOpen()) closeHistory();
    else openHistory();
  });

  historyClearBtn.addEventListener("click", () => {
    history = [];
    activeHistoryId = null;
    void saveState({ history });
    renderHistory();
  });

  document.addEventListener("click", (e) => {
    const target = e.target as Node;
    if (isHistoryOpen() && !historyPanel.contains(target)) closeHistory();
    if (!aboutPanel.classList.contains("hidden") && !aboutPanel.contains(target)) closeAbout();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (isHistoryOpen()) closeHistory();
    closeAbout();
  });

  async function visualize(code: string) {
    setStatus("rendering");
    try {
      const { svg } = await renderMermaid(code, currentTheme());
      diagramHost.innerHTML = svg;
      const svgEl = diagramHost.querySelector("svg");
      if (svgEl) normalizeSvgSize(svgEl);
      errorBanner.classList.add("hidden");
      errorBanner.textContent = "";
      emptyState.classList.add("hidden");
      panZoom.fit();
      hasRenderedOnce = true;
      setStatus("success");
      fireSeamPulse();

      const recorded = recordHistory(history, code, activeHistoryId);
      history = recorded.history;
      activeHistoryId = recorded.activeId;
      void saveState({ history });
      if (isHistoryOpen()) renderHistory();
    } catch (err) {
      if (err instanceof MermaidSyntaxError) {
        errorBanner.textContent = err.message;
        errorBanner.classList.remove("hidden");
        if (!hasRenderedOnce) emptyState.classList.remove("hidden");
        setStatus("error");
      } else {
        throw err;
      }
    }
  }

  const debouncedAutoRender = debounce((code: string) => {
    if (autoRenderToggle.checked) void visualize(code);
  }, 350);

  const editor = createEditor(editorHost, {
    doc: state.code,
    wrap: state.wrapLines,
    onChange: (value) => {
      void saveState({ code: value });
      debouncedAutoRender(value);
    },
    onSubmit: () => void visualize(editor.state.doc.toString()),
  });

  visualizeBtn.addEventListener("click", () => visualize(editor.state.doc.toString()));

  wrapToggleBtn.addEventListener("click", () => {
    const wrap = wrapToggleBtn.getAttribute("aria-pressed") !== "true";
    updateWrapButton(wrap);
    setLineWrapping(editor, wrap);
    void saveState({ wrapLines: wrap });
  });

  autoRenderToggle.addEventListener("change", () => {
    void saveState({ autoRender: autoRenderToggle.checked });
    if (autoRenderToggle.checked) void visualize(editor.state.doc.toString());
  });

  fitBtn.addEventListener("click", () => panZoom.fit());
  resetZoomBtn.addEventListener("click", () => panZoom.reset());

  fullscreenBtn.addEventListener("click", () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void viewer.requestFullscreen();
    }
  });

  window.addEventListener("keydown", (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.key === "0") {
      e.preventDefault();
      panZoom.reset();
    } else if (e.key === "=" || e.key === "+") {
      e.preventDefault();
      panZoom.zoomBy(1.2);
    } else if (e.key === "-") {
      e.preventDefault();
      panZoom.zoomBy(1 / 1.2);
    }
  });

  formatSelect.addEventListener("change", () => {
    void saveState({ exportFormat: currentFormat() });
    updateCopyAvailability();
  });
  scaleSelect.addEventListener("change", () => {
    void saveState({ exportScale: currentScale() });
  });

  themeSelect.addEventListener("change", () => {
    void saveState({ diagramTheme: currentTheme() });
    applyPreviewBackground();
    void visualize(editor.state.doc.toString());
  });

  backgroundBtn.addEventListener("click", () => {
    const enabled = !backgroundEnabled();
    updateBackgroundButton(enabled);
    void saveState({ exportBackground: enabled });
  });

  copyBtn.addEventListener("click", async () => {
    const svgEl = diagramHost.querySelector<SVGSVGElement>("svg");
    if (!svgEl) return;
    const format = currentFormat();
    try {
      if (format === "svg") {
        await copySvgToClipboard(svgEl, exportBackgroundColor());
        showToast("SVG copied to clipboard");
      } else {
        await copyRasterToClipboard(svgEl, currentScale(), {
          background: exportBackgroundColor() ?? (format === "jpg" ? "#ffffff" : null),
        });
        showToast("Image copied to clipboard");
      }
    } catch (err) {
      console.error("Copy failed", err);
      flashError(`Copy failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  saveBtn.addEventListener("click", async () => {
    const svgEl = diagramHost.querySelector<SVGSVGElement>("svg");
    if (!svgEl) return;
    try {
      const path = await saveDiagramToFile(svgEl, currentFormat(), currentScale(), exportBackgroundColor());
      if (path) showToast(`Saved ${path.split("/").pop()}`);
    } catch (err) {
      console.error("Save failed", err);
      flashError(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  expandBtn.addEventListener("click", async () => {
    await invoke("expand_to_main", { code: editor.state.doc.toString() });
  });

  onSystemThemeChange(() => {
    applyPreviewBackground();
    if (hasRenderedOnce) void visualize(editor.state.doc.toString());
  });

  await listen("mermlaid://show-about", () => {
    closeHistory();
    aboutPanel.classList.remove("hidden");
  });

  await listen<string>("mermlaid://code-sync", (event) => {
    setEditorValue(editor, event.payload);
    void saveState({ code: event.payload });
    void visualize(event.payload);
  });

  if (state.code.trim()) {
    void visualize(state.code);
  }
}

void main();
