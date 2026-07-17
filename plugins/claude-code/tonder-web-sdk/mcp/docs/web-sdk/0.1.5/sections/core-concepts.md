## Core concepts

### Initialization

Call `await tonder.init()` before mounting card fields, creating payments, or using saved-card operations. `getTransaction()`, `getPaymentMethods()`, and `getPaymentMethodBanks()` are read-only and can be used without `init()`.

### Customer context

`session.customer` is optional at `createTonder()` time. It is required when the SDK creates a payment or manages saved cards.

```ts
// Return page / read-only reconciliation.
const tonder = createTonder({
  api_key: tonderPublicConfig.api_key,
  environment: tonderPublicConfig.environment,
});

const transaction = await tonder.getTransaction('txn_123');
```

### Card on File (COF)

Card on File (COF) lets a business save a shopper's card and charge it later through a processor-backed subscription/authorization. Ask the Tonder team whether COF is enabled for your business before building saved-card flows.

When COF is enabled, saved cards may include `subscription_id`. Cards with `subscription_id` can be charged directly as saved cards. Cards without `subscription_id` require CVV collection so the SDK can save/update the card and create the subscription before processing the payment. In both saved-card cases, `pay({ payment_method: { type: 'saved_card' } })` still needs `session.secure_token` because the SDK must read the customer's saved-card record before deciding which path to use.

Because those operations create, list, update, or remove stored card records, they require both:

- `session.customer`
- `session.secure_token`

For new-card payments, `session.secure_token` is only required when the SDK must perform Card-on-File setup as part of the payment flow. Plain one-time new-card payments do not require it.

### Presentation mode

When a payment requires a hosted step, the SDK uses `presentation_mode`:

| Mode       | Behavior                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `redirect` | Browser navigates to the hosted page. Use `return_url`, `getTransaction()`, and webhooks to confirm final status.                     |
| `embedded` | SDK opens a full-screen modal. Card 3DS waits for a final transaction; APM/SPEI hosted instructions may return `Pending` immediately. |

```ts
const tonder = createTonder({
  api_key: tonderPublicConfig.api_key,
  environment: tonderPublicConfig.environment,
  presentation_mode: 'embedded',
  events: {
    presentation: {
      on_open: () => showLoadingOverlay(false),
      on_close: () => console.log('Customer closed the hosted view'),
    },
  },
});
```
