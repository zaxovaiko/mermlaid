# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0]

### Added

- Diagram history: every successful render is kept, with a panel to reopen an entry,
  remove a single one, or clear them all.
- The editor/preview divider can be dragged to resize the panes, and the ratio is remembered.
- The diagram re-fits itself when the viewer area changes — window resize, fullscreen, or a
  divider drag — unless you have panned or zoomed by hand.
- Copy to clipboard now works with the JPG format selected (flattened onto white).

### Changed

- New app icon.
- Bundle identifier is now `com.dyvertex.mermlaid`.

### Removed

- The popover title bar; the "Open in window" button moved into the editor toolbar.

## [0.1.0]

- Initial version: tray popover, live Mermaid rendering, pan/zoom preview, clipboard copy, PNG/JPG/SVG export, expandable main window.
