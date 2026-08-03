import mermaid from "mermaid";

export class MermaidSyntaxError extends Error {}

/** "system" follows the OS appearance with the app's own violet/mint palette;
 * the rest are fixed choices, with forest and neutral coming from Mermaid. */
export type DiagramTheme = "system" | "light" | "dark" | "forest" | "neutral";

export const DIAGRAM_THEMES: { value: DiagramTheme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "forest", label: "Forest" },
  { value: "neutral", label: "Neutral" },
];

let renderCounter = 0;
let initializedTheme: DiagramTheme | null = null;
let initializedMode: "dark" | "light" | null = null;

const darkThemeVariables = {
  darkMode: true,
  background: "transparent",
  fontSize: "14px",

  primaryColor: "#161B26",
  primaryTextColor: "#F3F6FA",
  primaryBorderColor: "#8B5CF6",
  secondaryColor: "#1B2130",
  secondaryBorderColor: "#6EE7B7",
  tertiaryColor: "#141822",
  tertiaryBorderColor: "#6EE7B7",

  mainBkg: "#161B26",
  nodeBorder: "#8B5CF6",
  nodeTextColor: "#F3F6FA",
  lineColor: "#6EE7B7",
  textColor: "#F3F6FA",
  clusterBkg: "rgba(139, 92, 246, 0.08)",
  clusterBorder: "#8B5CF6",
  defaultLinkColor: "#6EE7B7",
  titleColor: "#F3F6FA",
  edgeLabelBackground: "#0B0E14",

  actorBkg: "#161B26",
  actorBorder: "#8B5CF6",
  actorTextColor: "#F3F6FA",
  actorLineColor: "#6EE7B7",
  signalColor: "#6EE7B7",
  signalTextColor: "#F3F6FA",
  labelBoxBkgColor: "#161B26",
  labelBoxBorderColor: "#8B5CF6",
  labelTextColor: "#F3F6FA",
  loopTextColor: "#F3F6FA",
  noteBkgColor: "#1B2130",
  noteBorderColor: "#6EE7B7",
  noteTextColor: "#F3F6FA",
  activationBkgColor: "#1B2130",
  activationBorderColor: "#8B5CF6",
  sequenceNumberColor: "#0B0E14",

  pieOuterStrokeColor: "#8B5CF6",
  pieOpacity: "0.9",
};

const lightThemeVariables = {
  darkMode: false,
  background: "transparent",
  fontSize: "14px",

  primaryColor: "#FFFFFF",
  primaryTextColor: "#14171F",
  primaryBorderColor: "#7C3AED",
  secondaryColor: "#F3F0FF",
  secondaryBorderColor: "#059669",
  tertiaryColor: "#F8F9FC",
  tertiaryBorderColor: "#059669",

  mainBkg: "#FFFFFF",
  nodeBorder: "#7C3AED",
  nodeTextColor: "#14171F",
  lineColor: "#059669",
  textColor: "#14171F",
  clusterBkg: "rgba(124, 58, 237, 0.06)",
  clusterBorder: "#7C3AED",
  defaultLinkColor: "#059669",
  titleColor: "#14171F",
  edgeLabelBackground: "#FFFFFF",

  actorBkg: "#FFFFFF",
  actorBorder: "#7C3AED",
  actorTextColor: "#14171F",
  actorLineColor: "#059669",
  signalColor: "#059669",
  signalTextColor: "#14171F",
  labelBoxBkgColor: "#FFFFFF",
  labelBoxBorderColor: "#7C3AED",
  labelTextColor: "#14171F",
  loopTextColor: "#14171F",
  noteBkgColor: "#F3F0FF",
  noteBorderColor: "#059669",
  noteTextColor: "#14171F",
  activationBkgColor: "#F3F0FF",
  activationBorderColor: "#7C3AED",
  sequenceNumberColor: "#FFFFFF",

  pieOuterStrokeColor: "#7C3AED",
  pieOpacity: "0.9",
};

function systemMode(): "dark" | "light" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The canvas colour a diagram is designed to sit on — used when exporting
 * or copying with a background, and to tint the preview surface. */
export function diagramBackground(theme: DiagramTheme): string {
  switch (theme) {
    case "dark":
      return "#0B0E14";
    case "light":
    case "neutral":
      return "#FFFFFF";
    case "forest":
      return "#F4FBF6";
    case "system":
      return systemMode() === "dark" ? "#0B0E14" : "#FFFFFF";
  }
}

const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

function ensureInitialized(theme: DiagramTheme) {
  const mode = systemMode();
  // The system theme is the only one that has to track the OS, so it is also
  // the only one that needs re-initializing when the appearance flips.
  if (initializedTheme === theme && (theme !== "system" || initializedMode === mode)) return;

  if (theme === "forest" || theme === "neutral") {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme,
      fontFamily: FONT_FAMILY,
      themeVariables: { fontSize: "14px", background: "transparent" },
    });
  } else {
    const dark = theme === "dark" || (theme === "system" && mode === "dark");
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      fontFamily: FONT_FAMILY,
      themeVariables: dark ? darkThemeVariables : lightThemeVariables,
    });
  }

  initializedTheme = theme;
  initializedMode = mode;
}

export interface RenderResult {
  svg: string;
}

export async function renderMermaid(code: string, theme: DiagramTheme = "system"): Promise<RenderResult> {
  ensureInitialized(theme);

  const trimmed = code.trim();
  if (!trimmed) {
    throw new MermaidSyntaxError("Nothing to render yet.");
  }

  try {
    await mermaid.parse(trimmed);
  } catch (err) {
    throw new MermaidSyntaxError(err instanceof Error ? err.message : String(err));
  }

  const id = `mermlaid-diagram-${renderCounter++}`;
  const { svg } = await mermaid.render(id, trimmed);
  return { svg };
}

/** Forces the rendered SVG to its natural pixel size instead of the
 * percentage width Mermaid emits, so it can size an absolutely
 * positioned wrapper (for pan/zoom) and rasterize predictably. */
export function normalizeSvgSize(svgEl: SVGSVGElement): void {
  const viewBox = svgEl.viewBox.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    svgEl.style.width = `${viewBox.width}px`;
    svgEl.style.height = `${viewBox.height}px`;
    svgEl.style.maxWidth = "none";
  }
}

/** Re-renders whenever the OS light/dark setting flips while the app is open. */
export function onSystemThemeChange(callback: () => void): void {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", callback);
}
