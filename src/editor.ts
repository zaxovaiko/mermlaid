import { Compartment, EditorState } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { mermaidHighlightStyle, mermaidLanguage } from "./mermaidLang";

const glassEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "var(--ink-100)",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "var(--accent-node)",
      padding: "10px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--accent-node)",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "var(--overlay-selection)",
    },
    ".cm-activeLine": {
      backgroundColor: "var(--overlay-weak)",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "var(--ink-400)",
      border: "none",
      paddingRight: "4px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--overlay-weak)",
      color: "var(--ink-100)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      minWidth: "28px",
    },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      backgroundColor: "var(--overlay-bracket-bg)",
      outline: "1px solid var(--overlay-bracket-outline)",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-mono)",
      lineHeight: "1.6",
    },
  },
  { dark: window.matchMedia("(prefers-color-scheme: dark)").matches },
);

const wrapCompartment = new Compartment();

export interface EditorOptions {
  doc: string;
  wrap: boolean;
  onChange: (value: string) => void;
}

export function createEditor(host: HTMLElement, opts: EditorOptions): EditorView {
  const view = new EditorView({
    parent: host,
    state: EditorState.create({
      doc: opts.doc,
      extensions: [
        mermaidLanguage,
        syntaxHighlighting(mermaidHighlightStyle),
        glassEditorTheme,
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        rectangularSelection(),
        history(),
        bracketMatching(),
        indentOnInput(),
        indentUnit.of("  "),
        wrapCompartment.of(opts.wrap ? [EditorView.lineWrapping] : []),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            opts.onChange(update.state.doc.toString());
          }
        }),
      ],
    }),
  });

  return view;
}

export function setEditorValue(view: EditorView, value: string): void {
  if (view.state.doc.toString() === value) return;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
  });
}

export function setLineWrapping(view: EditorView, wrap: boolean): void {
  view.dispatch({
    effects: wrapCompartment.reconfigure(wrap ? [EditorView.lineWrapping] : []),
  });
}
