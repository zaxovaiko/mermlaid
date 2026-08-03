import { HighlightStyle, StreamLanguage } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const KEYWORDS = new Set([
  "flowchart",
  "graph",
  "sequenceDiagram",
  "classDiagram",
  "classDiagram-v2",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "gitGraph",
  "mindmap",
  "timeline",
  "quadrantChart",
  "requirementDiagram",
  "c4Context",
  "block-beta",
  "xychart-beta",
  "TD",
  "TB",
  "BT",
  "RL",
  "LR",
  "participant",
  "actor",
  "activate",
  "deactivate",
  "note",
  "over",
  "loop",
  "alt",
  "else",
  "opt",
  "par",
  "and",
  "rect",
  "critical",
  "break",
  "class",
  "classDef",
  "click",
  "style",
  "linkStyle",
  "subgraph",
  "end",
  "state",
  "direction",
  "title",
  "section",
  "left",
  "right",
  "of",
  "as",
]);

const ARROW_PATTERN =
  /^(<-{1,3}>|-{1,3}>>|-{1,3}[ox]|={1,3}>|~{2,3}|\.{2,3}-?>?|-{2,4}>?|={2,4}>?)/;

export const mermaidLanguage = StreamLanguage.define<Record<string, never>>({
  token(stream) {
    if (stream.match(/^%%.*/)) return "comment";
    if (stream.match(/^"[^"]*"/) || stream.match(/^'[^']*'/)) return "string";
    if (stream.match(ARROW_PATTERN)) return "operator";
    if (stream.match(/^[[\](){}]/)) return "bracket";
    if (stream.match(/^:{1,3}/)) return "punctuation";
    if (stream.match(/^\d+(\.\d+)?/)) return "number";
    if (stream.match(/^[A-Za-z_][A-Za-z0-9_-]*/)) {
      return KEYWORDS.has(stream.current()) ? "keyword" : "variableName";
    }
    if (stream.eatSpace()) return null;
    stream.next();
    return null;
  },
});

export const mermaidHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: "var(--ink-400)", fontStyle: "italic" },
  { tag: t.string, color: "var(--accent-node)" },
  { tag: t.keyword, color: "var(--accent-edge)", fontWeight: "600" },
  { tag: t.operator, color: "var(--accent-edge)" },
  { tag: t.bracket, color: "var(--ink-400)" },
  { tag: t.punctuation, color: "var(--ink-400)" },
  { tag: t.number, color: "var(--accent-node)" },
  { tag: t.variableName, color: "var(--ink-100)" },
]);
