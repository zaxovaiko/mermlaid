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

## Mac App Store

App Store builds are sandboxed and signed with a different certificate than the direct downloads,
so they use an overlay config: [`src-tauri/tauri.appstore.conf.json`](src-tauri/tauri.appstore.conf.json)
plus [`src-tauri/Entitlements.plist`](src-tauri/Entitlements.plist).

One-time setup (all of it behind your Apple Developer login):

1. Register the App ID `com.dyvertex.mermlaid` in the Developer portal.
2. Create an **Apple Distribution** certificate and a **Mac App Store Connect** provisioning
   profile for that App ID; save the profile as `src-tauri/embedded.provisionprofile` (gitignored).
3. Create the app record in App Store Connect using the same bundle ID.

Building and uploading:

```bash
pnpm appstore                        # sandboxed .app signed for the store
xcrun productbuild --sign "3rd Party Mac Developer Installer: <NAME> (<TEAM_ID>)" \
  --component "src-tauri/target/release/bundle/macos/Mermlaid.app" /Applications \
  Mermlaid.pkg
xcrun altool --upload-app -f Mermlaid.pkg -t macos \
  --apple-id "<APPLE_ID>" --password "<APP_SPECIFIC_PASSWORD>"
```

Then submit the build for review in App Store Connect.

Notes:

- The sandbox entitlements are deliberately minimal: sandbox on, plus user-selected read-write so
  the Save… panel works. If a feature ever needs the network or broader file access, the
  entitlement has to be added here *and* justified in review.
- The direct-download build (`pnpm tauri build`) is unaffected — it stays unsandboxed and uses
  Developer ID.
