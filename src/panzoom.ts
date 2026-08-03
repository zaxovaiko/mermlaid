export interface PanZoomOptions {
  /** The clipping viewport (overflow: hidden). */
  container: HTMLElement;
  /** The element that gets translated/scaled; sized to its natural content. */
  target: HTMLElement;
  minScale?: number;
  maxScale?: number;
}

export class PanZoom {
  private x = 0;
  private y = 0;
  private scale = 1;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private readonly minScale: number;
  private readonly maxScale: number;
  private readonly container: HTMLElement;
  private readonly target: HTMLElement;
  private onChange?: () => void;

  constructor(opts: PanZoomOptions) {
    this.container = opts.container;
    this.target = opts.target;
    this.minScale = opts.minScale ?? 0.05;
    this.maxScale = opts.maxScale ?? 10;
    this.bind();
  }

  onZoomChange(cb: () => void): void {
    this.onChange = cb;
  }

  private bind(): void {
    const { container, target } = this;

    target.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      target.setPointerCapture(e.pointerId);
      target.classList.add("grabbing");
    });

    target.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      this.x += e.clientX - this.lastX;
      this.y += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.apply();
    });

    const endDrag = (e: PointerEvent) => {
      this.dragging = false;
      target.classList.remove("grabbing");
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    };
    target.addEventListener("pointerup", endDrag);
    target.addEventListener("pointercancel", endDrag);

    container.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        if (e.ctrlKey || e.metaKey) {
          const factor = Math.exp(-e.deltaY * 0.012);
          this.zoomAt(cx, cy, factor);
        } else {
          this.x -= e.deltaX;
          this.y -= e.deltaY;
          this.apply();
        }
      },
      { passive: false },
    );

    target.addEventListener("dblclick", () => this.fit());
  }

  private zoomAt(cx: number, cy: number, factor: number): void {
    const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
    const ratio = newScale / this.scale;
    this.x = cx - (cx - this.x) * ratio;
    this.y = cy - (cy - this.y) * ratio;
    this.scale = newScale;
    this.apply();
  }

  zoomBy(factor: number): void {
    const rect = this.container.getBoundingClientRect();
    this.zoomAt(rect.width / 2, rect.height / 2, factor);
  }

  reset(): void {
    this.scale = 1;
    this.centerContent();
  }

  centerContent(): void {
    const cRect = this.container.getBoundingClientRect();
    const w = this.target.scrollWidth * this.scale;
    const h = this.target.scrollHeight * this.scale;
    this.x = (cRect.width - w) / 2;
    this.y = (cRect.height - h) / 2;
    this.apply();
  }

  fit(): void {
    const cRect = this.container.getBoundingClientRect();
    const w = this.target.scrollWidth;
    const h = this.target.scrollHeight;
    if (w === 0 || h === 0) return;

    const padding = 32;
    const scaleX = (cRect.width - padding) / w;
    const scaleY = (cRect.height - padding) / h;
    this.scale = Math.min(Math.max(Math.min(scaleX, scaleY), this.minScale), this.maxScale);
    this.x = (cRect.width - w * this.scale) / 2;
    this.y = (cRect.height - h * this.scale) / 2;
    this.apply();
  }

  private apply(): void {
    this.target.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
    this.onChange?.();
  }

  getScalePercent(): number {
    return Math.round(this.scale * 100);
  }
}
