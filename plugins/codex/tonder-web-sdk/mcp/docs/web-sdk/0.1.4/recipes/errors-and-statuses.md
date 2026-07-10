# Errors and Statuses Routing

This recipe intentionally does not duplicate the SDK error or payment-status tables.
Those tables are generated from the public Web SDK README sections and exposed through MCP.

Use these MCP tools instead:

- `get_error_reference({ topic: 'errors' })` for SDK error categories.
- `get_error_reference({ topic: 'payment-request-and-processing' })` for payment-processing errors.
- `get_error_reference({ topic: 'secure-field-session-errors' })` for secure-field/session errors.
- `get_payment_status_reference()` for payment statuses and fulfillment guidance.

Implementation guidance:

- Wrap SDK actions in `try/catch`.
- Show shopper-safe messages in the UI.
- Do not log raw card data, secure tokens, or sensitive customer data.
- Use browser status only for checkout UX.
- Fulfillment must be reconciled by the merchant backend through Tonder webhooks or server-side transaction lookup.
