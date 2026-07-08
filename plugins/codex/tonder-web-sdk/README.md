# Tonder Web SDK Plugin for Codex

Codex plugin that packages the `tonder-web-sdk-integrator` skill.

## Local installation during development

From the repository root, add this marketplace to Codex:

```bash
codex plugin marketplace add /Volumes/MacDev/Tonder/SDKs/tonder-ai-integrations
```

Then open the Codex Plugins UI and install **Tonder Web SDK** from the **Tonder AI Integrations** marketplace.

## Usage

```text
Use Tonder Web SDK to add embedded card payments to this React checkout.
```

The skill will inspect the project, ask for missing integration decisions, and apply the selected Web SDK flow.

## Development note

Do not edit the packaged skill copy directly. Edit the source skill at:

```text
../../../skills/tonder-web-sdk-integrator
```

Then run from the repository root:

```bash
node scripts/sync-web-sdk-skill.mjs
```

## Bundled MCP

This plugin includes a local stdio MCP server named `tonder-docs`. The MCP serves versioned Web SDK documentation snapshots, integration recipes, errors, payment statuses, and prompts. It runs locally with Node.js and does not open a localhost port.

The MCP server is packaged with the plugin and should not require users to add a top-level `mcp_servers.tonder-docs` entry to `~/.codex/config.toml`. The plugin `.mcp.json` sets `cwd = "."` so the relative server path resolves from the installed plugin root.
