# Integration fixtures

Three checkout projects used to exercise the `tonder-web-sdk-integrator` skill end to end. Each one is a starting state, not a finished integration — the point is what the skill does to it.

| Fixture | Starting state | What it exercises |
| ------- | -------------- | ----------------- |
| `01-html-plain` | Static HTML checkout, no payment provider | Fresh integration: framework detection, flow question, Apple Pay offered as an additive step, CDN loading |
| `02-html-legacy-sdk` | `LiteInlineCheckout` wired up for card payments | Migration detection from the legacy SDK, and the fact that adding Apple Pay forces the migration |
| `03-direct-api-node` | Node server posting to the Direct API for card, SPEI, and OXXO | Migration detection from a server-to-server integration, and the guide's incremental path that adds Apple Pay without touching the existing charge calls |

`03-direct-api-node` collects raw card data in the browser. That is deliberate — it is the pre-migration state the guide moves merchants away from, and the skill should say so.

## Running one

Copy the fixture somewhere disposable first; the skill edits it in place.

```bash
cp -R examples/fixtures/01-html-plain /tmp/fixture-run
```

Then point a headless run at the plugin directory:

```bash
cd /tmp/fixture-run && echo 'Use the Tonder Web SDK plugin to add card payments to this checkout.' | claude -p --plugin-dir /path/to/plugins/claude-code/tonder-web-sdk --allowedTools 'Read Glob Grep Write Edit Bash'
```

The MCP tool names are prefixed `mcp__plugin_tonder-web-sdk_tonder-docs__` and need to be in `--allowedTools` for the run to reach the docs.

## What to check in the result

- The agent asked one question at a time and did not assume a flow, a presentation mode, or a loading strategy.
- Apple Pay was offered alongside the chosen flow rather than instead of it, and nothing stopped while waiting on domain registration.
- `isApplePayAvailable()` is read through `.available`, the `payment` callback is synchronous, and `unmount()` runs on teardown.
- No card number, expiration, or CVV `<input>` exists in merchant code after the run.
- The final response carries the Apple Pay go-live steps, and no placeholder verification file was created.
