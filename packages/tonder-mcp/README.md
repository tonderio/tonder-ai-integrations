# @tonder/mcp

Local MCP server for Tonder SDK documentation, integration recipes, errors, and payment statuses.

## Usage

```bash
npx @tonder/mcp
```

The server runs over stdio. It does not open a localhost port and does not require a Tonder backend.

## Documentation source

The package ships versioned Web SDK README snapshots under `docs/web-sdk/<sdk-version>`.

To refresh the snapshot from the public Web SDK repository:

```bash
npm run sync:docs
```

The sync command reads the SDK version from:

```text
https://raw.githubusercontent.com/tonderio/web-sdk/main/package.json
```

and writes the README snapshot to:

```text
docs/web-sdk/<package.json version>/
```

Override the source only when testing a branch, tag, or local release candidate:

```bash
TONDER_WEB_SDK_PACKAGE_JSON_URL=https://raw.githubusercontent.com/tonderio/web-sdk/v0.2.0/package.json TONDER_WEB_SDK_README_URL=https://raw.githubusercontent.com/tonderio/web-sdk/v0.2.0/README.md npm run sync:docs
```

If the package metadata or README URL is unavailable, the sync command fails so the package cannot silently ship stale documentation.

## Exposed MCP capabilities

- Resources: full README and section-level docs.
- Tools: `get_integration_recipe`, `get_sdk_api_reference`, `get_error_reference`, `get_payment_status_reference`.
- Prompts: `integrate-web-sdk-card-payment`, `integrate-web-sdk-saved-cards`.

## Boundaries

This MCP server does not process payments, store credentials, or access merchant customer data.

## GitHub README sync note

The intended public source is:

```text
https://github.com/tonderio/web-sdk/blob/main/README.md
```

The raw URL used by the sync script is:

```text
https://raw.githubusercontent.com/tonderio/web-sdk/main/README.md
```

If that URL is unavailable, the sync command fails so maintainers fix the source URL or network access before publishing.
