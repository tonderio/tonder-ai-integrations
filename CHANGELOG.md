# Changelog

All notable changes to this repository are documented here.

## 0.1.20 - 2026-08-07

### Added

- A contract for retiring server-side code after a Direct API migration. The skill used to leave this undefined, which meant an agent either deleted working charge endpoints or said nothing about them at all. Neither is right.

  It now states up front — as a statement, not a question — that the existing server path keeps running, and closes with a three-part offer: the endpoints the SDK actually replaced, named individually; what has to stay and why; and an offer to remove the rest once the merchant has confirmed the new path in production. Asking at the start is the wrong time, because the honest answer is not knowable until real money has moved through the new path.

  The "what has to stay" part is the one that matters. The SDK's public surface is `init`, `pay`, `create`, `getTransaction`, `getPaymentMethods`, `getPaymentMethodBanks`, `enrollCard`, `getCustomerCards`, `removeCustomerCard`, and `isApplePayAvailable`. **There is no withdrawal method, deliberately** — the SDK's own polling module says withdrawal vocabulary does not belong in it. Webhooks, reconciliation, and refunds stay server-side too. A blanket "should I remove your Direct API integration?" hides all of that, and a merchant answering yes is answering a question that should not have been asked.

  Three fixtures were added to verify it, each run against a clean agent: a React `LiteInlineCheckout` project with cards, saved cards and enrollment; an Angular `InlineCheckout` project whose hand-rolled 3DS service was deleted rather than ported; and an Express server whose seller withdrawals survived a full migration to the SDK with Apple Pay.

## 0.1.19 - 2026-08-07

### Fixed

- The skill would generate an Apple Pay integration against an npm install that cannot run it. npm's `latest` tag for `@tonder.io/web-sdk` is `0.1.5`, whose `TonderComponentType` is `'card_fields'` and which contains **zero** occurrences of `isApplePayAvailable` or `apple_pay_button` — Apple Pay shipped afterwards, and reaches merchants through the CDN channel.

  In a TypeScript project this is a loud compile error. In a plain-JavaScript project it is silent: the bundler builds green, ships the missing call, and the page dies at load with `isApplePayAvailable is not a function` — which takes the entire checkout down, not just the Apple Pay button. A verified fixture run did exactly that: the agent installed `0.1.5`, wrote the Apple Pay lifecycle, and `vite build` passed.

  The skill now verifies that the installed package actually exposes those symbols before writing code against them, and falls back to the CDN when they are missing. The check is written against the symbols rather than a version number, so it stops being relevant on its own once npm carries Apple Pay.

## 0.1.18 - 2026-08-07

### Fixed

- The migration rule told the agent never to leave "the old server-to-server charge path active alongside the new integration". The Direct API guide says the opposite: its first slice ships Apple Pay while the merchant's existing `/process/` calls keep running untouched. A rule that contradicts the guide it points at is a rule that can tear out a working checkout, so it is now scoped to the legacy SDK — two payment SDKs on one page is still a defect — and says explicitly to follow the guide's pacing for a server-side integration.

  Found by running the skill against a Node + HTML Direct API fixture. That agent read the guide and did the right thing anyway; the next one might not have.

## 0.1.17 - 2026-08-07

### Added

- `get_migration_guide` tool and a `migrate-to-web-sdk` prompt. The MCP now bundles the two merchant migration guides from the SDK repo — Direct API to Web SDK, and legacy checkout SDK to Web SDK — and serves each one whole, because a migration guide read in fragments is how a half-migrated checkout happens.
- The skill now detects an existing Tonder integration before it writes anything. `tonder-web-sdk` in `package.json`, `InlineCheckout`/`LiteInlineCheckout` in the code, or a server-to-server charge call means the work is a migration, and the agent loads the migration guide instead of the integration recipe. It is also told never to leave the old integration loaded next to the new one — two payment SDKs on one page is a defect, not a transition step.

### Changed

- Apple Pay is now offered as an **additive** step, not as one of six mutually exclusive flows. It sits next to whichever flow the merchant picked, which is what merchants actually ship; the previous wording meant an agent that chose card payments never raised Apple Pay at all.
- Apple Pay now has its own questions — button placement, domain registration status, and button customization — and none of them block. Domain registration runs at the merchant's and Tonder's pace, in parallel with the code, so the agent asks, notes the answer, and keeps integrating.
- The final-response contract now requires the Apple Pay go-live handoff when Apple Pay was integrated: send every domain and subdomain, confirm Apple Pay is enabled for the business, host the verification file, check the response **body** before declaring it live, and tell Tonder. Without those steps the button works in development and fails in production, which is the failure this handoff exists to prevent.
- The agent now places the verification file itself when the merchant already has it — `public/.well-known/` for Next.js/React/Vite, `src/assets/.well-known/` plus the `angular.json` entry for Angular, the web root for a plain HTML site — and warns that a single-page-app catch-all answers `200` with `index.html`, so a wrong file looks like a healthy URL. It is explicitly forbidden from inventing a placeholder file: the contents are matched byte for byte, so a made-up one fails verification while looking like it succeeded.

## 0.1.16 - 2026-08-06

### Changed

- Synced the bundled Web SDK documentation from `main`. Three of the changes correct guidance agents were previously emitting:
  - The Apple Pay button's `locale` used to map to `-apple-pay-button-locale`. **That CSS property does not exist** — Apple localizes the button from the `lang` attribute — so a generated integration setting `locale` produced an English button and no error. The SDK now sets `lang`, and the docs say so.
  - `type` accepted 9 values; Apple defines 16. `add-money`, `contribute`, `reload`, `rent`, `support`, `tip`, and `top-up` were missing.
  - The domain-verification file is now described by the path plus "the file Tonder sent you", instead of naming an extension. The previous wording named one, and the wrong name means Apple fetches a path the merchant's server does not serve.
- The Apple Pay recipe now shows `customization.apple_pay_button` in full. It referenced the field without ever demonstrating its shape, which left an agent to guess it.
- The Web SDK docs also gained `width` as a supported field, `SECURE_TOKEN_REQUIRED` in `pay()`'s throws table, and a note that a plain card payment needs a secure token when Card on File is enabled for the business — an account setting, so the same snippet works for one merchant and fails for another.

## 0.1.15 - 2026-08-06

### Changed

- `scripts/sync-web-sdk-skill.mjs` is now `scripts/sync-plugin-packages.mjs`. The old name described what it did before it packaged every plugin from a declared skill mapping, and it would have misled whoever adds the second plugin — the exact reader the previous release was written for. The `0.1.14` notes below still use the old name, because that is what shipped in that release.

## 0.1.14 - 2026-08-06

### Changed

- A plugin's version is written in one place — `plugins[].version` in `.claude-plugin/marketplace.json` — and stamped into the Claude manifest, the Codex manifest, and the Codex marketplace `source.ref` by `scripts/sync-web-sdk-skill.mjs`. Releasing changes one number instead of five.
- The catalog's own `version` no longer tracks any plugin. It describes the catalog's shape and is bumped when a plugin is added, removed, or renamed.
- Packaging reads which skills a plugin bundles from `plugin-packaging.json` instead of naming one skill and two target directories. Adding a plugin is data, not a script edit. A declared skill that does not exist fails the sync rather than shipping a plugin without it.

### Tests

- A version drift test fails when any derived version diverges from the catalog. It closes a gap `claude plugin tag` cannot see: that check compares the Claude manifest against the catalog only, so a stale Codex `source.ref` used to pass validation and leave Codex users installing the previous release.
- A packaging test fails when a plugin's packaged skills or MCP payload are missing or drift from source.

## 0.1.13 - 2026-08-06

### Added

- Apple Pay integration recipe, `apple_pay` flow in `get_integration_recipe`, and the `integrate-web-sdk-apple-pay` prompt.
- Apple Pay guidance in the Web SDK integrator skill: availability check, merchant-supplied container, synchronous `payment` callback, event-based results, `unmount()` on teardown, and the domain-registration prerequisite.
- Recipe identifier drift check in `npm test`. It asserts every SDK identifier used by the maintained recipes still exists in the synced README. It catches renames and removals, not semantic drift.
- `recipes_from` in each generated `manifest.json`, recording where the snapshot's recipes came from.

### Changed

- Maintained recipes now live in one unversioned source, `packages/tonder-mcp/docs/web-sdk/recipes/`, and are copied into each generated snapshot instead of being inherited from the previous version.
- `npm run sync:docs` prunes stale docs snapshots after generating the new one, keeping only the newest. Override with `TONDER_DOCS_KEEP_VERSIONS`.

### Fixed

- The MCP README resource URI is now resolved from the bundled snapshot instead of being hardcoded to `0.1.0`.

## 0.1.12 - 2026-07-17

### Changed

- Synced bundled Web SDK documentation to `0.1.5`.
- Bundled the latest Web SDK README snapshot and maintained integration recipes for Claude and Codex plugins.

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
