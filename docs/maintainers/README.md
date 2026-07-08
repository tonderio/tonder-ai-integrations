# Maintainer Guide

This guide is for Tonder maintainers preparing Claude Code and Codex plugin releases from this repository.

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

Run this after changing the source skill, MCP server, MCP docs, or package dependencies:

```bash
cd /Volumes/MacDev/Tonder/SDKs/tonder-ai-integrations

cd packages/tonder-mcp
npm run sync:docs
npm run build
cd ../..

node scripts/sync-web-sdk-skill.mjs
```

`npm run sync:docs` reads the SDK version from the Web SDK `package.json` and writes docs to `packages/tonder-mcp/docs/web-sdk/<sdk-version>/`.

Default sources:

```text
https://raw.githubusercontent.com/tonderio/web-sdk/main/package.json
https://raw.githubusercontent.com/tonderio/web-sdk/main/README.md
```

For a tagged SDK release candidate, override both URLs:

```bash
TONDER_WEB_SDK_PACKAGE_JSON_URL=https://raw.githubusercontent.com/tonderio/web-sdk/v0.2.0/package.json TONDER_WEB_SDK_README_URL=https://raw.githubusercontent.com/tonderio/web-sdk/v0.2.0/README.md npm run sync:docs
```

The sync script packages the source skill and the local `tonder-docs` MCP runtime into:

- `plugins/codex/tonder-web-sdk/`
- `plugins/claude-code/tonder-web-sdk/`

The plugin MCP runtime must remain self-contained for GitHub marketplace installs. Do not rely on `node_modules` being present in installed plugins. `packages/tonder-mcp` builds a bundled `dist/server.js`, and that `mcp/dist/server.js` file must be committed inside each plugin package.

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

Run before tagging a release:

```bash
cd /Volumes/MacDev/Tonder/SDKs/tonder-ai-integrations

claude plugin validate ./plugins/claude-code/tonder-web-sdk
claude plugin validate .

python3 /Users/dave/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  ./plugins/codex/tonder-web-sdk

cd packages/tonder-mcp
npm test
npm run build
```

## Claude release

Claude uses `.claude-plugin/marketplace.json` as the marketplace manifest for Claude Code CLI and Claude Desktop repository marketplaces. Users can install from the GitHub repository marketplace:

```bash
claude plugin marketplace add tonderio/tonder-ai-integrations
claude plugin install tonder-web-sdk@tonder-ai-integrations
```

Create the plugin release tag with Claude's release helper from the repository root:

```bash
claude plugin tag ./plugins/claude-code/tonder-web-sdk \
  --message "Release tonder-web-sdk %s" \
  --push
```

The tag format is `tonder-web-sdk--v<version>`. Keep Codex marketplace entries pinned to the release tag when publishing a stable version.

## Codex release

Codex uses `.agents/plugins/marketplace.json` as the marketplace manifest. The public marketplace entry should point to the GitHub repository and plugin subdirectory.

Users can add the marketplace in the Codex app or CLI, then install `tonder-web-sdk` from **Tonder AI Integrations**. For Codex Desktop, use the GitHub repository as the origin, `main` as the Git ref, and leave sparse paths empty unless the current Codex build requires otherwise.

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
