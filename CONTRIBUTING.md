# Contributing to Mermlaid

Thanks for taking the time to help. Issues and pull requests are both welcome.

## Before you start

- For anything larger than a small fix, open an issue first so we can agree on the approach before you spend time on it.
- By contributing you agree that your work is licensed under the [MIT License](LICENSE), and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setting up

```bash
pnpm install
pnpm tauri dev
```

You will need Node.js 20+, pnpm 10+, a stable Rust toolchain, and your platform's [Tauri system dependencies](https://tauri.app/start/prerequisites/).

## Before opening a pull request

Run the same checks CI runs:

```bash
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

Please also launch the app and exercise the part you touched — much of this project is UI behaviour that no automated test covers yet.

## Style

- TypeScript is strict; avoid `any` and non-null assertions on anything that isn't a static element in `index.html`.
- Match the surrounding code — naming, comment density, and structure. Comments should explain *why*, not restate the code.
- Keep the frontend dependency-light; it is deliberately vanilla TS plus CodeMirror and Mermaid.
- Rust code is formatted with `cargo fmt` and must be clippy-clean.

## Releases

Maintainers: see [RELEASING.md](RELEASING.md).

## Commits and pull requests

- Keep commits focused; one logical change per commit is easier to review and revert.
- Describe what changed and why in the PR body, and include a before/after screenshot or clip for any visible UI change.
- Link the issue the PR closes.
