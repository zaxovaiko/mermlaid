import { MAX_SPLIT_RATIO, MIN_SPLIT_RATIO } from "./store";

export interface SplitPaneOptions {
  /** The container the two panes share; the drag is measured against it. */
  split: HTMLElement;
  /** The draggable divider. */
  seam: HTMLElement;
  /** The pane whose size the ratio describes. */
  pane: HTMLElement;
  /** The split runs vertically in the popover and horizontally in the main
   * window, so the drag axis follows whichever the current window uses. */
  horizontal: () => boolean;
  onCommit: (ratio: number) => void;
}

const DEFAULT_RATIO = 0.5;

/** Wires the divider so dragging it resizes the pane, and returns a setter for
 * applying a stored ratio. */
export function createSplitPane(opts: SplitPaneOptions): (ratio: number) => void {
  const { split, seam, pane } = opts;

  const applyRatio = (ratio: number) => {
    pane.style.flexBasis = `${ratio * 100}%`;
  };

  seam.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    seam.setPointerCapture(e.pointerId);
    seam.dataset.dragging = "true";

    let ratio = parseFloat(pane.style.flexBasis) / 100;

    const onMove = (move: PointerEvent) => {
      const rect = split.getBoundingClientRect();
      const raw = opts.horizontal()
        ? (move.clientX - rect.left) / rect.width
        : (move.clientY - rect.top) / rect.height;
      ratio = Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, raw));
      applyRatio(ratio);
    };

    const onUp = () => {
      seam.removeEventListener("pointermove", onMove);
      seam.removeEventListener("pointerup", onUp);
      seam.removeEventListener("pointercancel", onUp);
      delete seam.dataset.dragging;
      opts.onCommit(ratio);
    };

    seam.addEventListener("pointermove", onMove);
    seam.addEventListener("pointerup", onUp);
    seam.addEventListener("pointercancel", onUp);
  });

  seam.addEventListener("dblclick", () => {
    applyRatio(DEFAULT_RATIO);
    opts.onCommit(DEFAULT_RATIO);
  });

  return applyRatio;
}
