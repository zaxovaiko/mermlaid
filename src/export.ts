import { save } from "@tauri-apps/plugin-dialog";
import { writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { writeImage as clipboardWriteImage, writeText as clipboardWriteText } from "@tauri-apps/plugin-clipboard-manager";
import { Image as TauriImage } from "@tauri-apps/api/image";

export type ExportFormat = "png" | "jpg" | "svg";

export function serializeSvgElement(svgEl: SVGSVGElement): string {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!clone.getAttribute("xmlns:xlink")) {
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  }
  const serialized = new XMLSerializer().serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
}

function getSvgPixelSize(svgEl: SVGSVGElement): { width: number; height: number } {
  const viewBox = svgEl.viewBox.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }
  const rect = svgEl.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

/** WebKit taints a canvas drawn from an <img> whose src is a blob: URL —
 * even for same-origin SVG content — which blocks any pixel readback
 * (getImageData/toBlob/toDataURL) with a "SecurityError: The operation is
 * insecure" later. Loading the SVG as a data: URL instead avoids that. */
function svgToDataUrl(svgString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to encode SVG"));
    reader.readAsDataURL(new Blob([svgString], { type: "image/svg+xml;charset=utf-8" }));
  });
}

async function rasterizeToCanvas(
  svgEl: SVGSVGElement,
  scale: number,
  opts: { whiteBackground?: boolean } = {},
): Promise<HTMLCanvasElement> {
  const { width, height } = getSvgPixelSize(svgEl);
  const svgString = serializeSvgElement(svgEl);
  const dataUrl = await svgToDataUrl(svgString);

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to rasterize diagram"));
    image.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is not supported");

  if (opts.whiteBackground) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to encode image"));
    }, mime, 0.95);
  });
}

/** The system clipboard holds a decoded bitmap, not an encoded file, so the
 * chosen raster format only decides whether transparency is flattened onto
 * white (as a JPEG has to be) before the pixels are handed over. */
export async function copyRasterToClipboard(
  svgEl: SVGSVGElement,
  scale: number,
  opts: { whiteBackground?: boolean } = {},
): Promise<void> {
  const canvas = await rasterizeToCanvas(svgEl, scale, opts);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is not supported");
  // Hand the clipboard plugin raw decoded RGBA pixels directly (what
  // Image.new expects) instead of round-tripping through a PNG encode
  // + Image.fromBytes decode — fewer moving parts, and it's the shape
  // the clipboard API's own docs use for writeImage.
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const image = await TauriImage.new(new Uint8Array(data.buffer), canvas.width, canvas.height);
  await clipboardWriteImage(image);
}

export async function copySvgToClipboard(svgEl: SVGSVGElement): Promise<void> {
  await clipboardWriteText(serializeSvgElement(svgEl));
}

const FILTERS: Record<ExportFormat, { name: string; extensions: string[] }> = {
  png: { name: "PNG Image", extensions: ["png"] },
  jpg: { name: "JPEG Image", extensions: ["jpg", "jpeg"] },
  svg: { name: "SVG Image", extensions: ["svg"] },
};

export async function saveDiagramToFile(
  svgEl: SVGSVGElement,
  format: ExportFormat,
  scale: number,
): Promise<string | null> {
  const path = await save({
    defaultPath: `diagram.${format}`,
    filters: [FILTERS[format]],
  });
  if (!path) return null;

  if (format === "svg") {
    await writeTextFile(path, serializeSvgElement(svgEl));
  } else {
    const canvas = await rasterizeToCanvas(svgEl, scale, { whiteBackground: format === "jpg" });
    const blob = await canvasToBlob(canvas, format === "jpg" ? "image/jpeg" : "image/png");
    await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
  }
  return path;
}
