# Validation Checklist

Before finishing an integration, verify:

- Public API key and SDK environment are read from the app's public environment/configuration layer, not hardcoded merchant values.
- Currency remains merchant checkout/business data; do not force it into environment variables unless the existing app already does so.
- `session.secure_token` is fetched from the merchant backend for saved-card, list-card, remove-card, enrollment, or Card-on-File operations; it is never generated or hardcoded in browser code.

- The SDK is initialized before actions that require it.
- The selected flow is the only flow implemented unless the user requested multiple flows.
- New card and CVV data are collected only through SDK secure fields.
- No raw PAN/CVV fields exist in merchant code.
- Secure-field container divs are not wrapped with merchant labels or styled like input cards; the SDK owns labels, borders, validation, and errors inside the iframe.
- `client_reference` is present for payments and represents the merchant order/reference shown in dashboards, reports, webhooks, and transaction records.
- `idempotency_key` is present for payments, uses a stable value per checkout attempt, and includes a code comment explaining why it prevents duplicate charges on retries.
- Optional `metadata` stays non-sensitive; when report context is needed, prefer `customer_email`, `customer_id`, `business_user`, or `operation_date`.
- `return_url` is included when hosted/3DS completion may be needed.
- CDN integrations in TypeScript projects either add a type-only `@tonder.io/web-sdk` devDependency with `import type`, or add a minimal local ambient `window.Tonder` declaration. Runtime imports from npm are not used in CDN mode.
- `session.customer` is present for customer-dependent flows.
- `session.secure_token` is present for saved-card, list-card, remove-card, enrollment, or Card-on-File flows.
- SafetyPay uses `safetypayCash` or `safetypayTransfer` and selected-bank config.
- Browser result handling does not claim final fulfillment without backend/webhook reconciliation.
- No permanent raw JSON `<pre>` debug dump is added unless the user explicitly asks for a demo/debug view. Generic examples may use `alert(transaction.status)` with a comment that the merchant must replace it with their real checkout UX.
- React integrations do not introduce generic `result`/`setResult` state or `<p className="result">{result}</p>`; status UI is limited to setup/progress/error copy unless the existing app already has a result/toast system.
- Browser result UI does not claim final fulfillment; final fulfillment remains backend/webhook-driven.
- Available project checks were run, such as typecheck, build, lint, or tests.
