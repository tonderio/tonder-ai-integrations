# Maintainer Guide

This guide is for Tonder maintainers preparing Claude Code and Codex plugin releases from this repository.

## Branch workflow

`main` must always be releasable. Do not commit experimental plugin changes directly to `main`.

Use this branch flow:

```bash
git checkout main
git pull
git checkout -b feature/<short-description>
```

Recommended branch names:

| Branch type | Use for | Example |
| --- | --- | --- |
| `feature/*` | New plugin capability or supported SDK surface | `feature/react-native-plugin` |
| `fix/*` | Bug fixes in MCP, docs lookup, packaging, or agent behavior | `fix/mcp-docs-version-default` |
| `docs/*` | Documentation-only changes | `docs/release-workflow` |
| `release/*` | Final version bump and release preparation | `release/0.1.8` |

Merge to `main` only after sync, validation, and manual install testing. Prefer squash merging so the public branch history stays easy to audit.

Once a version tag is public, treat it as immutable. Do not move, rewrite, or replace a published tag for normal fixes. Publish a new patch version instead.

## Source of truth

Edit source content here:

| Area | Source path |
| --- | --- |
| Integration skill | `skills/tonder-web-sdk-integrator/SKILL.md` |
| MCP server source | `packages/tonder-mcp/src/` |
| MCP documentation snapshot | `packages/tonder-mcp/docs/` |
| Maintained integration recipes | `packages/tonder-mcp/docs/web-sdk/recipes/` |
| Plugin version | `.claude-plugin/marketplace.json` → `plugins[].version` |
| Plugin-to-skill mapping | `plugin-packaging.json` → `plugins[<name>].skills` |
| Root marketplace docs | `README.md` |

Do not edit generated skill copies inside plugin packages directly. They are overwritten by the sync script.

The same applies to versions: plugin manifests and the Codex `source.ref` are stamped, not typed. See [Versioning](#versioning).

### Maintained recipes

Sections under `docs/web-sdk/<version>/sections/` are generated from the SDK README on every sync. Recipes are not: they are hand-written and mirror the demo portal.

Recipes live in **one unversioned directory**, `packages/tonder-mcp/docs/web-sdk/recipes/`, and `npm run sync:docs` copies them into the generated snapshot. Edit them there.

Never edit `docs/web-sdk/<version>/recipes/`. That copy is regenerated and pruned.

Each generated `manifest.json` records where its recipes came from:

```json
"recipes_from": "docs/web-sdk/recipes"
```

## Sync workflow

Run this after changing the source skill, MCP server, MCP docs, package dependencies, or any release candidate branch:

```bash
cd /Volumes/MacDev/Tonder/SDKs/tonder-ai-integrations

cd packages/tonder-mcp
npm run sync:docs
npm test
npm run build
cd ../..

node scripts/sync-web-sdk-skill.mjs
```

`npm run sync:docs` is mandatory. It reads the SDK version from the Web SDK `package.json` and writes docs to `packages/tonder-mcp/docs/web-sdk/<sdk-version>/`.

It runs three steps in this order, and the order matters:

1. Regenerate `README.md` and `sections/` from the fetched SDK README.
2. Copy the maintained recipes from `docs/web-sdk/recipes/` into the new snapshot.
3. Prune older snapshots, keeping only the newest one.

Pruning is part of the sync script on purpose, so it can never run before a snapshot exists. Only the newest snapshot is kept because the MCP server only ever serves the newest one, and every snapshot is copied into both plugin packages. To keep more while debugging:

```bash
TONDER_DOCS_KEEP_VERSIONS=3 npm run sync:docs
```

Default sources:

```text
https://raw.githubusercontent.com/tonderio/web-sdk/main/package.json
https://raw.githubusercontent.com/tonderio/web-sdk/main/README.md
```

Do not sync from a local SDK checkout for public releases. The source of truth is the GitHub README.

For a tagged SDK release candidate, override both URLs:

```bash
TONDER_WEB_SDK_PACKAGE_JSON_URL=https://raw.githubusercontent.com/tonderio/web-sdk/v0.2.0/package.json TONDER_WEB_SDK_README_URL=https://raw.githubusercontent.com/tonderio/web-sdk/v0.2.0/README.md npm run sync:docs
```

The sync script then assembles every plugin package: the skills that plugin declares, plus the local `tonder-docs` MCP runtime. It discovers both the plugins and their package directories from the marketplace catalogs, so no plugin name or path appears in the script. See [Packaging](#packaging).

It finally stamps every derived plugin version from `.claude-plugin/marketplace.json`. See [Versioning](#versioning).

The plugin MCP runtime must remain self-contained for GitHub marketplace installs. Do not rely on `node_modules` being present in installed plugins. `packages/tonder-mcp` builds a bundled `dist/server.js`, and that `mcp/dist/server.js` file must be committed inside each plugin package.

### Runtime dependency

The Claude/Codex plugin config starts `tonder-docs` with `command: "node"`, so installed users need Node.js 20+ available in PATH. This is consistent with common local MCP distribution patterns (`node`/`npx`), but it must stay documented because installing Claude/Codex does not guarantee Node is installed or visible to the app environment.

Before release, keep this distinction clear in public docs:

- `tonder-docs` is a local `stdio` MCP documentation server.
- It does not call Tonder backend APIs or process payments.
- It requires Node.js 20+ only to execute the bundled local MCP process.

## Local testing before merge

Test the feature branch before merging to `main`. Public users install from the repository marketplace URL; local test installs are only for maintainers.

### Codex branch test

Codex supports installing a Git marketplace from a branch ref:

```bash
codex plugin marketplace add tonderio/tonder-ai-integrations --ref feature/<short-description>
codex plugin add tonder-web-sdk@tonder-ai-integrations
```

Start a new Codex thread after installing or updating the plugin. MCP servers are loaded when the session starts.

### Claude local test

Claude users normally install from the repository marketplace URL. For branch testing before merge, create a local `.plugin` archive and upload it manually in Claude Desktop.

```bash
cd /Volumes/MacDev/Tonder/SDKs/tonder-ai-integrations
rm -f /tmp/tonder-web-sdk-claude-test.plugin
(cd plugins/claude-code/tonder-web-sdk && zip -qr /tmp/tonder-web-sdk-claude-test.plugin .)
```

Upload the file through **Settings → Plugins → Add → Upload plugin**. Open a new Claude session after installing or updating the plugin because the bundled `tonder-docs` MCP server is initialized at session startup.

Do not document local `.plugin` upload as the primary public install path. It is only a maintainer fallback for branch testing or repository marketplace issues.

## Packaging

`scripts/sync-web-sdk-skill.mjs` builds each installable package. Per plugin, per package directory, it rebuilds `skills/` from the declared source skills and `mcp/` from the built `tonder-docs` runtime. Both directories are wiped first, so a renamed or removed skill cannot survive as a stale copy inside a shipped package.

### Where the plugin-to-skill mapping lives

`plugin-packaging.json`, at the repository root:

```json
{
  "plugins": {
    "tonder-web-sdk": { "skills": ["tonder-web-sdk-integrator"] }
  }
}
```

Keyed by the plugin name from `.claude-plugin/marketplace.json` — the same key the version tooling matches both catalogs on. Values are skill directory names under `skills/`.

`skills` is an array. A plugin may bundle more than one skill, and adding one later must not require reshaping this file. Today every plugin bundles exactly one.

The mapping is **not** in the marketplace manifests or the plugin manifests. Those four files are consumed by Claude's and Codex's validators, and adding a repository-specific build field to a published contract risks failing validation on their next schema change. The Codex manifest's `"skills": "./skills/"` is a directory pointer for the installed package, not a build input.

### Adding a second plugin

Data only. Do not edit a script.

1. Add the plugin to `.claude-plugin/marketplace.json`, with its `version` and `source`.
2. Add the matching entry to `.agents/plugins/marketplace.json`.
3. Add the source skill under `skills/<skill-name>/`.
4. Add `"<plugin-name>": { "skills": ["<skill-name>"] }` to `plugin-packaging.json`.
5. Create the package directories with their `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.mcp.json`, and `README.md`. The sync generates `skills/` and `mcp/`; it does not generate manifests.
6. Run `node scripts/sync-web-sdk-skill.mjs`.

### Failures are loud

A plugin declaring a skill that does not exist stops the sync, naming both:

```text
Plugin "tonder-web-sdk" declares skill "tonder-react-native-integrator" in
plugin-packaging.json, but skills/tonder-react-native-integrator/ does not exist.
```

Skipping it silently would ship a plugin that installs, starts its MCP server, and offers the agent nothing. The same applies to a catalog plugin with no packaging entry and to a packaging entry with no catalog plugin.

## Versioning

Bump one number, then run the sync. Everything else is stamped.

```jsonc
// .claude-plugin/marketplace.json
"plugins": [
  { "name": "tonder-web-sdk", "version": "0.1.14", ... }
]
```

```bash
node scripts/sync-web-sdk-skill.mjs
```

`plugins[].version` in `.claude-plugin/marketplace.json` is the **single source of truth** for a plugin's version. It already lists plugins by name, and it is the field Claude's own release helper validates against, so making it authoritative adds no new file to keep in sync.

### What the sync derives

`scripts/sync-plugin-versions.mjs` runs at the end of `scripts/sync-web-sdk-skill.mjs` and stamps, for every plugin in the catalog:

| Derived location | Stamped value |
| --- | --- |
| `plugins/claude-code/<plugin>/.claude-plugin/plugin.json` → `version` | the source version |
| `plugins/codex/<plugin>/.codex-plugin/plugin.json` → `version` | the source version plus a fresh `+codex.<timestamp>` cachebuster |
| `.agents/plugins/marketplace.json` → `plugins[].source.ref` | `<plugin-name>--v<version>` |

The Codex `source.ref` is the tag Codex actually installs from. Before it was derived, a release could bump every visible version, pass `claude plugin tag`, and still leave Codex users installing the previous release.

Plugins are discovered by name and iterated. Nothing in the tooling assumes a single plugin, so adding a second one means adding catalog entries and a `plugin-packaging.json` entry — not editing scripts or tests. See [Adding a second plugin](#adding-a-second-plugin).

### The catalog version is not a plugin version

The **top-level** `version` in `.claude-plugin/marketplace.json` describes the catalog itself. The tooling leaves it alone.

It currently mirrors `tonder-web-sdk` only because there is exactly one plugin. With three plugins on independent release cadences, a catalog version tracking one of them would be meaningless. Bump it by hand when the catalog's shape changes — a plugin added, removed, renamed, or re-categorized — not when a plugin ships a patch.

### Idempotence

Running the sync twice is idempotent except for the Codex `+codex.<timestamp>` suffix, which is regenerated on every run by design. Its job is to force Codex to invalidate a cached install; a stable value would defeat it. Only the base version carries meaning, and the drift test compares only the base.

### Not derived

`CHANGELOG.md` and `docs/releases/<version>.md` are narrative. Write them by hand.

## Validation checklist

Run before merging to `main` and again before tagging a release:

```bash
cd /Volumes/MacDev/Tonder/SDKs/tonder-ai-integrations

cd packages/tonder-mcp
npm run sync:docs
npm test
npm run build
cd ../..

node scripts/sync-web-sdk-skill.mjs

claude plugin validate ./plugins/claude-code/tonder-web-sdk
claude plugin validate .

python3 /Users/dave/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  ./plugins/codex/tonder-web-sdk
```

If your local Python environment does not have `PyYAML`, install it in your development environment or set `PYTHONPATH` to the local dependency directory used by your workstation.

### Recipe identifier drift check

`npm test` includes `src/__tests__/recipe-api-drift.test.ts`. Because recipes are hand-maintained, nothing else notices when the SDK renames or removes a public API name. The test extracts every SDK identifier the recipes use — `tonder.<method>(`, `create('<component>')`, and `on_<event>:` keys — and asserts each one still exists in the synced README snapshot.

Source of truth is the committed README snapshot rather than a fetched `dist/index.d.ts`, so the check stays deterministic and offline. This repo already declares the public GitHub README the source of truth for these docs, and the snapshot covers every name the recipes actually use.

| It catches | It does not catch |
| --- | --- |
| A method renamed, for example `enrollCard()` → `saveCard()` | Semantic drift: a name that still exists but whose behavior changed |
| A method removed from the public API | A recipe treating `isApplePayAvailable()` as a boolean after it started returning `{ available, code, message }` |
| A component literal renamed, for example `create('card_fields')` | A changed argument shape, required field, or return type |
| An event key renamed or removed | Guidance that is merely out of date |

**It catches renames and removals, not semantic drift.** After every sync, still read the README diff. A recipe can use every correct identifier and still be wrong.

When the check fails, fix the recipe in `docs/web-sdk/recipes/`, not the generated copy.

### Plugin version drift check

`npm test` includes `src/__tests__/plugin-version-sync.test.ts`. The sync script derives every plugin version, but nothing forces a maintainer to run it — this test is what makes the single source of truth real.

For every plugin in `.claude-plugin/marketplace.json`, it asserts that the Claude plugin manifest, the Codex plugin manifest, and the Codex `source.ref` all agree with `plugins[].version`. It also asserts both catalogs list the same plugins.

The Codex version carries a `+codex.<timestamp>` suffix, so the comparison is on the base version before `+`. The suffix is ignored; the base is not. A Codex manifest pinned to `0.1.12+codex.<anything>` while the catalog says `0.1.13` fails.

Failures name the file and the mismatch:

```text
.agents/plugins/marketplace.json: plugins[tonder-web-sdk].source.ref is
"tonder-web-sdk--v0.1.12", expected "tonder-web-sdk--v0.1.13"
```

| It catches | It does not catch |
| --- | --- |
| A derived copy edited by hand | Whether the version is the *right* version |
| A release that skipped the sync script | A stale `CHANGELOG.md` or missing release notes |
| A Codex `source.ref` left on the previous tag | A tag that was never pushed |
| A plugin listed in one catalog but not the other | A version that was bumped in the wrong direction |

When it fails, do not edit the derived file. Fix `plugins[].version` if the source is wrong, then run `node scripts/sync-web-sdk-skill.mjs`.

### Plugin packaging drift check

`npm test` includes `src/__tests__/plugin-packaging-sync.test.ts`. The version check proves the numbers agree; this one proves the package actually contains what it claims to ship.

For every plugin in `.claude-plugin/marketplace.json`, and every package directory that plugin ships, it asserts that each skill declared in `plugin-packaging.json` is present and byte-identical to its source under `skills/`, that no undeclared skill is shipped, and that the MCP payload — `mcp/dist/server.js`, `mcp/package.json`, `mcp/docs/` — matches `packages/tonder-mcp/`.

It re-reads the filesystem and does not import `scripts/lib/plugin-packaging.mjs`. A guard sharing code with what it guards inherits its bugs and passes on a wrong-but-consistent result. The version drift check is written the same way, for the same reason.

Failures name the plugin and what is missing:

```text
plugin "tonder-web-sdk": skill "tonder-web-sdk-integrator" is missing from
plugins/codex/tonder-web-sdk/skills/. Run: node scripts/sync-web-sdk-skill.mjs
```

| It catches | It does not catch |
| --- | --- |
| A package committed without its skill directory | Whether the source skill is *correct* |
| A skill edited in the package instead of at the source | Whether the MCP bundle behaves correctly |
| A stale MCP bundle from a skipped `npm run build` | A skill that is present but out of date relative to the SDK |
| A skill declared in the config but never packaged | Manifest fields, which the marketplace validators cover |

When it fails, do not edit the packaged copy. Fix the source, then run `node scripts/sync-web-sdk-skill.mjs`.

## Merge checklist

Before merging a feature branch:

- [ ] Source files were edited, not generated plugin copies.
- [ ] No version number was typed into a derived file.
- [ ] A new plugin was added as data — catalogs, `skills/`, `plugin-packaging.json` — not by editing a script.
- [ ] `npm run sync:docs` was run against GitHub sources.
- [ ] `npm test` and `npm run build` pass in `packages/tonder-mcp`.
- [ ] `node scripts/sync-web-sdk-skill.mjs` was run.
- [ ] Claude plugin validation passes.
- [ ] Claude marketplace validation passes.
- [ ] Codex plugin validation passes.
- [ ] Branch install or local package testing was performed.
- [ ] The final merge to `main` is a squash merge or one coherent conventional commit.

## Claude release

Claude uses `.claude-plugin/marketplace.json` as the marketplace manifest for Claude Code CLI and Claude Desktop repository marketplaces. Public users install from the GitHub repository marketplace:

```bash
claude plugin marketplace add tonderio/tonder-ai-integrations
claude plugin install tonder-web-sdk@tonder-ai-integrations
```

Claude Desktop users add the repository URL in **Settings → Plugins → Add marketplace → Add from repository**:

```text
https://github.com/tonderio/tonder-ai-integrations
```

Release flow:

1. Bump `plugins[].version` for the plugin being released in `.claude-plugin/marketplace.json`. This is the only version you type.
2. Run `node scripts/sync-web-sdk-skill.mjs` to stamp the Claude manifest, the Codex manifest, and the Codex `source.ref`.
3. Update `CHANGELOG.md` and `docs/releases/<version>.md`.
4. Run the validation checklist. `npm test` fails if any derived version drifted.
5. Merge to `main`.
6. Create the release tag from `main`:

   ```bash
   claude plugin tag ./plugins/claude-code/tonder-web-sdk \
     --message "Release tonder-web-sdk %s" \
     --push
   ```

The tag format is `tonder-web-sdk--v<version>`. Keep Codex marketplace entries pinned to that tag for stable releases.

### Optional Claude `.plugin` asset

The `.plugin` archive is not the primary public install path. It is a fallback for Claude Desktop users who cannot sync the repository marketplace, and a maintainer convenience for local testing.

If you want to attach it to the GitHub release, create it after tagging:

```bash
VERSION=0.1.8
ASSET=/tmp/tonder-web-sdk-claude-${VERSION}.plugin

rm -f "$ASSET"
(cd plugins/claude-code/tonder-web-sdk && zip -qr "$ASSET" .)

gh release create "tonder-web-sdk--v${VERSION}" "$ASSET" \
  --title "Tonder Web SDK ${VERSION}" \
  --notes-file "docs/releases/${VERSION}.md" \
  --latest
```

If the GitHub release already exists, upload or replace only the asset:

```bash
gh release upload "tonder-web-sdk--v${VERSION}" "$ASSET" --clobber
```

Once users can install a version, do not move that tag. Publish a new patch version for fixes.

## Codex release

Codex uses `.agents/plugins/marketplace.json` as the marketplace manifest. The public marketplace entry should point to the GitHub repository and plugin subdirectory.

Users can add the marketplace in the Codex app or CLI, then install `tonder-web-sdk` from **Tonder AI Integrations**. For Codex Desktop, use the GitHub repository as the origin, `main` as the Git ref, and leave sparse paths empty unless the current Codex build requires otherwise.

The marketplace `source.ref` pins the release tag and is stamped by the sync script as `<plugin-name>--v<version>`:

```json
"ref": "tonder-web-sdk--v0.1.13"
```

Do not edit it by hand. Bump `plugins[].version` in `.claude-plugin/marketplace.json` and re-run the sync; `npm test` fails if the ref falls out of step.

For development testing only, install from a branch ref with `codex plugin marketplace add --ref <branch>`.

## Public installation surfaces

Until official directory listings are approved or available, document GitHub marketplace installation as the primary path. Do not imply the plugin is already listed in Anthropic or OpenAI curated directories.

Document all supported user paths separately:

| Surface | User path | Notes |
| --- | --- | --- |
| Claude Code CLI | `claude plugin marketplace add` then `claude plugin install` | Installs into Claude Code configuration/cache. |
| Claude Desktop | Settings → Plugins → Add marketplace → Add from repository | Uses the repository marketplace UI; `.plugin` upload is a fallback. |
| Codex CLI | `codex plugin marketplace add` then `codex plugin add` | Installs from configured Codex marketplace snapshots. |
| Codex Desktop | Plugins → Add marketplace | Use GitHub origin, `main` ref, and an empty sparse-path field. |

Keep usage examples in both command-style and natural-language style because different hosts expose skills differently.


### Security hardening gate

Before publishing, run the standard validation suite and treat the restricted-content test as a release blocker. The plugin is public, so all generated snapshots and bundle copies must stay merchant-facing:

- use only the public Web SDK GitHub README/package as the docs source;
- do not copy internal runbooks, source maps, backend payloads, private endpoint names, or incident details into recipes;
- if a merchant-facing detail is missing, update the public SDK README first, merge it, then run `npm run sync:docs`;
- never bypass the scan by weakening forbidden patterns without reviewing the docs diff.

## Internal-only notes

Do not put credentials, private customer examples, unreleased API behavior, or internal incident details in this public repository. Keep that information in Tonder's internal knowledge base and link to it from internal systems, not from public docs.
