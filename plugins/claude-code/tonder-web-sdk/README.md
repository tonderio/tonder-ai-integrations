# Tonder Web SDK Plugin for Claude Code

Claude Code plugin that packages the `tonder-web-sdk-integrator` skill.

## Local testing

From `/Volumes/MacDev/Tonder/SDKs/tonder-ai-integrations`, run:

```bash
claude --plugin-dir ./plugins/claude-code/tonder-web-sdk
```

Then invoke the skill as:

```text
/tonder-web-sdk:tonder-web-sdk-integrator
```

For non-interactive smoke testing, explicitly allow the read-only docs tool:

```bash
claude -p \
  --plugin-dir ./plugins/claude-code/tonder-web-sdk \
  --allowedTools 'mcp__plugin_tonder-web-sdk_tonder-docs__get_sdk_api_reference' \
  'Using the Tonder Web SDK plugin, call get_sdk_api_reference for topic cdn. Reply only OK on success.'
```

Do not use `--permission-mode dontAsk` for this smoke test unless you also allow the MCP tool; Claude Code denies unapproved MCP tools in that mode.

## Marketplace installation during development

From Claude Code:

```text
/plugin marketplace add /Volumes/MacDev/Tonder/SDKs/tonder-ai-integrations
/plugin install tonder-web-sdk@tonder-ai-integrations
```

## Usage

```text
Use the Tonder Web SDK plugin to add saved-card payments to this Angular checkout.
```

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

The MCP server path is resolved with `${CLAUDE_PLUGIN_ROOT}/mcp/dist/server.js` so the plugin remains self-contained when installed from a marketplace or loaded with `--plugin-dir`.
