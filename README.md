# Tonder AI Integrations

AI-agent plugins that help developers integrate Tonder SDKs correctly in their applications.

The first supported plugin is **Tonder Web SDK**, available for Claude Code, Claude Desktop, Codex CLI, and Codex Desktop. It packages a framework-aware integration skill plus a local `tonder-docs` MCP server so agents use versioned Tonder integration docs instead of guessing from memory.

> This repository provides AI integration helpers. Use of Tonder services, APIs, and SDKs is governed by Tonder's applicable terms and official documentation.

## Availability

The plugin can be installed today from this GitHub repository marketplace.

Official directory status:

- Claude plugin directory: pending review/availability.
- Codex official plugin directory: pending public self-serve publication support.

## Available plugins

| Plugin | Hosts | Purpose |
| --- | --- | --- |
| `tonder-web-sdk` | Claude Code, Claude Desktop, Codex CLI, Codex Desktop | Integrate Tonder Web SDK payments into browser-based web apps, including vanilla HTML, React, Next.js, Angular, and similar frameworks. |

Supported flows:

- Card payment
- Card enrollment
- Saved-card payment
- Payment methods
- SafetyPay banks
- Apple Pay

## Runtime requirement

The bundled `tonder-docs` MCP server is a local `stdio` process. Claude Code and Codex start it with `node`, so users need **Node.js 20+ available in their PATH** for the MCP runtime to start.

This does not mean the plugin calls a Tonder backend API. `tonder-docs` only reads the public documentation snapshots packaged with the plugin.

Quick check:

```bash
node --version
```

If the MCP server does not appear in a new Claude/Codex session, first verify Node.js 20+ is installed and visible from the same shell/app environment that launches the agent.

## Install in Claude Code CLI

Install from the Tonder GitHub marketplace:

```bash
claude plugin marketplace add tonderio/tonder-ai-integrations
claude plugin install tonder-web-sdk@tonder-ai-integrations
```

This installs the plugin for Claude Code. It is not the same as manually uploading a plugin through Claude Desktop.

## Install in Claude Desktop

Install from the Tonder GitHub marketplace in Claude Desktop:

1. Open **Settings → Plugins**.
2. Select **Add → Add marketplace**.
3. Choose **Add from repository**.
4. Enter:

   ```text
   https://github.com/tonderio/tonder-ai-integrations
   ```

5. Synchronize the marketplace.
6. Open the **Code** marketplace tab.
7. Install **Tonder Web SDK**.

If repository marketplace sync is unavailable in your Claude Desktop build, download the `.plugin` file from the GitHub release and upload it through **Add → Upload plugin**.

## Install in Codex CLI

Install from the Tonder GitHub marketplace:

```bash
codex plugin marketplace add tonderio/tonder-ai-integrations --ref main
codex plugin add tonder-web-sdk@tonder-ai-integrations
```

## Install in Codex Desktop

Install from the Tonder GitHub marketplace in Codex Desktop:

1. Open **Plugins → Add marketplace**.
2. Set **Origin** to:

   ```text
   https://github.com/tonderio/tonder-ai-integrations
   ```

3. Set **Git ref** to:

   ```text
   main
   ```

4. Leave **Sparse paths** empty unless your Codex build explicitly requires otherwise.
5. Add the marketplace.
6. Install **Tonder Web SDK** from **Tonder AI Integrations**.
7. Start a new Codex thread after installation.

## Usage examples

You can invoke the plugin either by selecting the plugin command/skill or by asking naturally.

Claude command-style usage:

```text
/tonder-web-sdk-integrator Add embedded card payment to this checkout. Keep the existing amount input and deposit button.
```

Natural language usage:

```text
Use the Tonder Web SDK plugin to add embedded card payments to this checkout. Keep the existing amount input and deposit button.
```

More examples:

```text
Use Tonder Web SDK to add saved-card payments to this React checkout.
```

```text
Use Tonder Web SDK to add card enrollment to this Angular account settings page.
```

```text
Use Tonder Web SDK to add payment methods and SafetyPay bank selection to this HTML checkout.
```

```text
Use Tonder Web SDK to add the Apple Pay button to this React checkout.
```

## What the plugin does

The plugin guides the agent to:

- inspect the target project before editing;
- call the bundled `tonder-docs` MCP tools as the documentation source of truth;
- choose the smallest working Web SDK integration for the detected framework;
- keep merchant code from collecting raw PAN, CVV, or expiration data;
- remind implementers about API keys, environment values, webhooks, production readiness, and backend reconciliation.

## Repository layout

| Path | Purpose |
| --- | --- |
| `.claude-plugin/marketplace.json` | Claude marketplace manifest. |
| `.agents/plugins/marketplace.json` | Codex marketplace manifest. |
| `plugin-packaging.json` | Build config: which source skills each plugin bundles. |
| `plugins/claude-code/tonder-web-sdk/` | Installable Claude plugin package. |
| `plugins/codex/tonder-web-sdk/` | Installable Codex plugin package. |
| `skills/tonder-web-sdk-integrator/` | Source skill copied into each plugin package. |
| `packages/tonder-mcp/` | Local stdio MCP docs server bundled into each plugin. |
| `scripts/` | Sync tooling that regenerates plugin packages and stamps derived versions. |
| `docs/maintainers/` | Tonder maintainer workflow for sync, validation, and release. |
| `docs/releases/` | Release notes and verification checklists. |

## Development workflow

Use short-lived branches for all changes. Keep `main` stable and releasable.

```bash
git checkout main
git pull
git checkout -b feature/<short-description>
```

The day-to-day rule is simple:

1. Edit source files, not generated plugin copies.
2. Always run the Web SDK docs sync from GitHub.
3. Sync the generated Claude/Codex plugin packages.
4. Validate and test before merging.
5. Squash merge to `main`.

Versions follow the same rule. Edit the one source version, then run the sync — never type a version into a generated file.

Quick validation path:

```bash
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

For complete branch, local testing, and release instructions, see [`docs/maintainers/README.md`](docs/maintainers/README.md).

## Plugin packaging

`node scripts/sync-web-sdk-skill.mjs` assembles every installable plugin package. It names no plugin, no skill, and no directory: plugins come from the marketplace catalogs, and the skills each one bundles come from `plugin-packaging.json`.

```json
{
  "plugins": {
    "tonder-web-sdk": { "skills": ["tonder-web-sdk-integrator"] }
  }
}
```

The key is the plugin name from `.claude-plugin/marketplace.json`. Each entry lists skill directory names under `skills/`. The list is an array because a plugin may bundle more than one skill; today each one bundles exactly one.

Adding a second plugin is a data change:

1. Add the plugin to `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`.
2. Add its source skill under `skills/<skill-name>/`.
3. Add its entry to `plugin-packaging.json`.
4. Run `node scripts/sync-web-sdk-skill.mjs`.

No script changes. A plugin that declares a skill which does not exist fails the sync immediately, naming both the plugin and the missing directory — a silent skip would ship a plugin with no skill.

The mapping lives outside the marketplace manifests on purpose. Those files are validated by Claude and Codex, so this repository does not add build fields to them. `plugin-packaging.json` describes how packages are assembled, which is this repository's concern rather than the marketplaces'.

`npm test` in `packages/tonder-mcp` fails if a packaged skill or the bundled MCP payload is missing or does not match its source.

## Plugin versions

Each plugin declares its version in exactly one place:

```text
.claude-plugin/marketplace.json -> plugins[].version
```

Every other version-bearing field is derived from it by `node scripts/sync-web-sdk-skill.mjs`:

| Derived location | Stamped value |
| --- | --- |
| `plugins/claude-code/<plugin>/.claude-plugin/plugin.json` → `version` | the source version |
| `plugins/codex/<plugin>/.codex-plugin/plugin.json` → `version` | the source version plus a fresh `+codex.<timestamp>` cachebuster |
| `.agents/plugins/marketplace.json` → `plugins[].source.ref` | `<plugin-name>--v<version>` |

Two things are deliberately **not** derived:

- The top-level `version` in `.claude-plugin/marketplace.json` is the **catalog's** version, not any plugin's. It is independent and bumped by hand when the catalog's shape changes.
- `CHANGELOG.md` and `docs/releases/<version>.md` are narrative and stay hand-written.

`npm test` in `packages/tonder-mcp` fails if any derived copy drifts from the source, naming the file and the mismatch. That is what catches a hand edit that skipped the sync.

## Release tags

The release tag, for example `tonder-web-sdk--v0.1.13`, pins an immutable plugin version for marketplaces and users.

It matters because:

- Claude's release helper validates that the plugin manifest and marketplace version agree before tagging.
- Codex marketplace entries can pin the plugin source to a known tag instead of moving with every `main` update.
- Users and maintainers can reproduce exactly what was released.

After a release is public, do not move or rewrite its tag. Publish a new patch version instead.

## Security

Generated integrations must not collect raw card data in merchant-owned inputs. Use Tonder SDK-rendered secure fields or the current Tonder-approved equivalent.

See [`SECURITY.md`](SECURITY.md) for vulnerability reporting, public-documentation boundaries, and the release hardening checklist. The plugin is intentionally docs-only: it must not expose private Tonder endpoints, headers, backend payloads, credentials, SDK internals, or undocumented API behavior.

## License

MIT. See [`LICENSE`](LICENSE).
