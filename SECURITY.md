# Security Policy

## Supported versions

Mermlaid is pre-1.0. Only the latest release and `main` receive fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems.

Report privately through [GitHub's private vulnerability reporting](https://github.com/zaxovaiko/mermlaid/security/advisories/new), or by email to zaxovaiko@gmail.com.

Include what you can: affected version and platform, reproduction steps, and the impact you believe it has.

You can expect an acknowledgement within 7 days and an assessment within 30 days. If the report is valid, a fix will be released and you will be credited in the advisory unless you prefer otherwise.

## Scope notes

Mermlaid renders Mermaid source locally and makes no network requests of its own. Reports involving diagram source that escapes the renderer, reads local files, or executes code are in scope. Vulnerabilities in upstream dependencies (Mermaid, Tauri, CodeMirror) should be reported to those projects; open an issue here so the dependency can be bumped.
