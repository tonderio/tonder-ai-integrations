## Before you start

You need:

- A Tonder public `api_key`. Never put secret keys in browser code.
- A modern browser: Chrome, Safari, Firefox, or Edge.
- A server endpoint that can create a short-lived `secure_token` when using saved cards/Card on File.
- A webhook endpoint for reliable payment fulfillment.

**Already integrated with Tonder?** Start from the guide for what you have, not from this README:

| You have today                                            | Guide                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Direct API, server-to-server                              | [Migrating from Direct API](./docs/migration_direct_api_to_web_sdk.md)     |
| The legacy SDK — `InlineCheckout` or `LiteInlineCheckout` | [Migrating from the legacy SDK](./docs/migration_legacy_sdk_to_web_sdk.md) |
