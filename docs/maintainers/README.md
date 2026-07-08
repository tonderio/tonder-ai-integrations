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
| Root marketplace docs | `README.md` |

Do not edit generated skill copies inside plugin packages directly. They are overwritten by the sync script.

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

The sync script packages the source skill and the local `tonder-docs` MCP runtime into:

- `plugins/codex/tonder-web-sdk/`
- `plugins/claude-code/tonder-web-sdk/`

The plugin MCP runtime must remain self-contained for GitHub marketplace installs. Do not rely on `node_modules` being present in installed plugins. `packages/tonder-mcp` builds a bundled `dist/server.js`, and that `mcp/dist/server.js` file must be committed inside each plugin package.

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

## Versioning

Use the same base semantic version for Claude Code and Codex releases.

| Surface | Version location |
| --- | --- |
| Claude plugin | `plugins/claude-code/tonder-web-sdk/.claude-plugin/plugin.json` |
| Claude marketplace | `.claude-plugin/marketplace.json` |
| Codex plugin | `plugins/codex/tonder-web-sdk/.codex-plugin/plugin.json` |
| Changelog | `CHANGELOG.md` |

Codex versions may include a cachebuster suffix such as `0.1.1+codex.20260708201530` during local development. Keep the base version aligned with the release version.

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

## Merge checklist

Before merging a feature branch:

- [ ] Source files were edited, not generated plugin copies.
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

1. Bump the Claude plugin version and Claude marketplace version.
2. Bump the Codex plugin base version and Codex marketplace tag ref.
3. Update `CHANGELOG.md` and `docs/releases/<version>.md`.
4. Run the validation checklist.
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

For stable releases, pin the Codex marketplace source ref to the release tag:

```json
"ref": "tonder-web-sdk--v0.1.8"
```

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

## Internal-only notes

Do not put credentials, private customer examples, unreleased API behavior, or internal incident details in this public repository. Keep that information in Tonder's internal knowledge base and link to it from internal systems, not from public docs.
