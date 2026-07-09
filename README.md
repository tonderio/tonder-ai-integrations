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
| `plugins/claude-code/tonder-web-sdk/` | Installable Claude plugin package. |
| `plugins/codex/tonder-web-sdk/` | Installable Codex plugin package. |
| `skills/tonder-web-sdk-integrator/` | Source skill copied into each plugin package. |
| `packages/tonder-mcp/` | Local stdio MCP docs server bundled into each plugin. |
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

## Release tags

The release tag, for example `tonder-web-sdk--v0.1.7`, pins an immutable plugin version for marketplaces and users.

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
