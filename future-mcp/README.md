# Future Tonder MCP

The initial project now includes a **local stdio MCP server** in `packages/tonder-mcp`. This folder tracks future MCP work that should wait until the local plugin/skill experience is validated.

## Current MCP baseline

| Transport | Command | Use case |
| --------- | ------- | -------- |
| Local stdio | `npx @tonder/mcp` | Local developer setup and offline-friendly docs snapshots. |

Current local tools:

| Tool | Purpose |
| ---- | ------- |
| `get_integration_recipe` | Return a versioned integration recipe by SDK, framework, flow, and presentation mode. |
| `get_sdk_api_reference` | Return SDK API reference entries for methods and payloads. |
| `get_error_reference` | Explain SDK and Direct API errors with remediation guidance. |
| `get_payment_status_reference` | Return canonical payment statuses and fulfillment guidance. |

## Future phase: remote MCP

| Transport | URL | Use case |
| --------- | --- | -------- |
| Remote HTTP | `https://mcp.tonder.io/mcp` | Centralized docs, current status references, managed updates, and multi-SDK capability lookup. |

Possible future additions:

- Live version lookup across Web SDK, Ionic, React Native, and backend SDKs.
- Release-aware recipes by SDK version.
- Direct links to public docs, demos, and known migration notes.
- Optional diagnostics that inspect project dependencies without collecting credentials.

## Boundaries

- Do not process payments through MCP.
- Do not store merchant API keys, secure tokens, or customer data.
- Keep MCP responses aligned with public SDK documentation.
