# Mermlaid

A lightweight menubar [Mermaid](https://mermaid.js.org/) diagram renderer for the desktop, built with [Tauri 2](https://tauri.app/) and vanilla TypeScript.

Hit a global shortcut, type Mermaid in the popover, watch the diagram render live, and copy or save it — without leaving what you were doing.

<p align="center">
  <img src="docs/screenshots/popover.png" alt="The Mermlaid popover hanging from the macOS menubar, with the editor on top and the preview below" width="560">
</p>

## Features

- Tray / menubar popover, summoned with <kbd>Cmd/Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd>
- Live rendering as you type, plus an explicit <kbd>Cmd</kbd>+<kbd>Enter</kbd> visualize when auto-render is off
- CodeMirror 6 editor with Mermaid syntax highlighting and toggleable line wrapping
- Pan and zoom the preview, fit to screen, reset zoom, fullscreen
- Copy the diagram to the clipboard as a bitmap or as SVG text
- Save as PNG, JPG or SVG at 1x / 2x / 3x scale
- Expand the popover into a full window, carrying the current code across
- Follows the system light/dark theme; code and settings persist between launches

## Install

No prebuilt binaries are published yet — build from source (below). Once tagged, builds will be attached to the [releases page](https://github.com/zaxovaiko/mermlaid/releases).

## Development

Prerequisites:

- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/) 10+
- The [Rust toolchain](https://www.rust-lang.org/tools/install) (stable)
- Your platform's [Tauri system dependencies](https://tauri.app/start/prerequisites/)

```bash
pnpm install
pnpm tauri dev      # run the app with hot reload
pnpm tauri build    # release bundle in src-tauri/target/release/bundle
```

Checks:

```bash
pnpm build                                                      # typecheck + frontend build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

## Project layout

| Path                 | What lives there                                              |
| -------------------- | ------------------------------------------------------------- |
| `index.html`         | Single page shared by the popover and the main window          |
| `src/main.ts`        | Wiring: toolbar, shortcuts, render pipeline, window events     |
| `src/editor.ts`      | CodeMirror setup                                               |
| `src/mermaidLang.ts` | Mermaid syntax highlighting                                    |
| `src/render.ts`      | Mermaid rendering and theming                                  |
| `src/panzoom.ts`     | Preview pan/zoom                                               |
| `src/export.ts`      | Rasterizing, clipboard copy, file export                       |
| `src/store.ts`       | Persisted settings                                             |
| `src-tauri/src/`     | Rust side: tray, global shortcut, window management, commands  |

## Contributing

Bug reports, feature ideas and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues: see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © zaxovaiko
