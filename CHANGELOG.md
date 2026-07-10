# Changelog

All notable changes to this repository are documented here.

## 0.1.11 - 2026-07-10

### Fixed

- Synced Web SDK README examples that use public browser configuration for Tonder public API key and SDK environment.
- Prevented `get_integration_recipe` from embedding hardcoded API reference examples in the recipe lifecycle section.
- Added regression coverage so recipes do not reintroduce hardcoded public API key or secure-token examples.

## 0.1.10 - 2026-07-10

### Changed

- Synced bundled Web SDK documentation to `0.1.3`.
- Updated integration recipes to read Tonder public API key and SDK environment from each framework's public configuration layer instead of hardcoding merchant values.
- Clarified that `currency` is merchant checkout/business data and should not be forced into environment variables.
- Updated final-response guidance to always remind merchants that Card on File, saved cards, list/remove cards, and enrollment require a backend-generated `secure_token`.

### Tests

- Added coverage to prevent hardcoded public API key examples from returning to maintained recipes.
- Added coverage for secure-token and Card-on-File guidance in the latest recipes.

## 0.1.9 - 2026-07-09

### Security

- Added public-documentation security boundaries to the Tonder Web SDK skill and MCP tool responses.
- Added restricted-content tests to block obvious private endpoints, internal headers, bearer-token examples, source maps, and private-network URLs from bundled docs.
- Documented the AI plugin release hardening checklist for maintainers.

## 0.1.8 - 2026-07-08

### Fixed

- Synced Web SDK docs `0.1.2` from GitHub with payment reporting guidance for `client_reference` and reporting-friendly `metadata` fields.
- Updated agent summary guidance to briefly mention `client_reference`, retry-safe `idempotency_key`, optional metadata for reports, and webhook reconciliation.
- Ensured generated Web SDK documentation snapshots include maintained integration recipes.

## 0.1.7 - 2026-07-08

### Fixed

- Corrected secure-field mount container guidance from `min-height` to `max-height` so agents cap the iframe mount area during initialization instead of reserving extra vertical space.
- Synced Web SDK docs from the GitHub README snapshot and made MCP tools default to the latest bundled Web SDK docs version.
- Added a GitHub API fallback for docs sync when `raw.githubusercontent.com` rate-limits.

## 0.1.6 - 2026-07-08

### Fixed

- Corrected secure-field style guidance: `customization.card_fields.styles` may style SDK-rendered input internals when supported; merchant CSS is still required to reserve mount-container layout space.

## 0.1.5 - 2026-07-08

### Fixed

- Clarified secure-field container layout guidance. Recipes now include `.card-field { width: 100%; min-height: 90px; }` and explicitly state that container sizing must stay in merchant CSS, not in `customization.card_fields.styles`.

## 0.1.4 - 2026-07-08

### Fixed

- Added content-based documentation lookup fallback so MCP topics that appear inside sections, but are not section titles, resolve correctly. This covers symbols such as `TonderConfig`, `CardPlaceholders`, `PaymentMethodBank`, `secure_token`, and SDK error codes.

## 0.1.3 - 2026-07-08

### Fixed

- Added documentation aliases for Web SDK customization and style topics so MCP lookups for `customization`, `styles`, and `TonderCustomization` resolve to the configuration reference.

## 0.1.2 - 2026-07-08

### Fixed

- Bundled the `tonder-docs` MCP server into a self-contained `mcp/dist/server.js` so GitHub marketplace installs include the compiled server without relying on `node_modules`.
- Updated plugin packaging sync to copy bundled MCP artifacts only.

## 0.1.1 - 2026-07-08

### Added

- Initial Claude Code plugin marketplace package for `tonder-web-sdk`.
- Initial Codex plugin marketplace package for `tonder-web-sdk`.
- Bundled local `tonder-docs` MCP server for versioned Tonder Web SDK integration documentation.
- Maintainer release and sync documentation.
- MIT license and security policy.

### Fixed

- Claude Code plugin MCP resolution now uses `${CLAUDE_PLUGIN_ROOT}` so the bundled MCP server resolves from the installed plugin root.
- Codex plugin MCP configuration is self-contained and does not require users to add a global `mcp_servers.tonder-docs` entry.
