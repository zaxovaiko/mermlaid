# Releasing

Versions are published as GitHub Releases with platform bundles attached, built by
[`.github/workflows/release.yml`](.github/workflows/release.yml).

`package.json` is the single source of truth for the app version — `src-tauri/tauri.conf.json`
reads it via `"version": "../package.json"`. `src-tauri/Cargo.toml` keeps its own version for the
Rust crate; bump it alongside to avoid confusion.

## Cutting a release

1. Make sure `main` is green and everything you want is merged.
2. Bump the version and move the `Unreleased` entries in `CHANGELOG.md` under the new heading:

   ```bash
   pnpm version 0.2.0 --no-git-tag-version   # updates package.json
   # then edit src-tauri/Cargo.toml version to match, and run:
   cargo check --manifest-path src-tauri/Cargo.toml   # refreshes Cargo.lock
   ```

3. Commit and tag — the tag must be `v` + the same version:

   ```bash
   git commit -am "release: v0.2.0"
   git tag v0.2.0
   git push origin main --follow-tags
   ```

4. The workflow builds macOS (arm64 + x86_64), Linux and Windows bundles and creates a **draft**
   release named `Mermlaid v0.2.0`. Review the attached artifacts, paste in the changelog section,
   and publish it.

`workflow_dispatch` can also run the workflow manually against the current ref, which is useful for
testing the build matrix without tagging.

## Notes

- Builds are **unsigned**. macOS users must right-click → Open (or clear the quarantine attribute)
  the first time. To sign and notarize, add `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`,
  `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` and `APPLE_TEAM_ID` as repository secrets
  and pass them through to `tauri-apps/tauri-action`; Windows signing uses
  `WINDOWS_CERTIFICATE` / `WINDOWS_CERTIFICATE_PASSWORD`.
- There is no auto-updater wired up. If you add one later, enable the `updater` bundle target and
  publish `latest.json` from the same workflow.
- Pre-releases: tag `v0.2.0-rc.1` and flip `prerelease: true` in the workflow, or mark it in the
  GitHub UI before publishing.
