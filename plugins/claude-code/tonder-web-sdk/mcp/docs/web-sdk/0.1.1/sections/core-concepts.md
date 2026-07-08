## Core concepts

### Initialization

Call `await tonder.init()` before mounting card fields, creating payments, or using saved-card operations. `getTransaction()`, `getPaymentMethods()`, and `getPaymentMethodBanks()` are read-only and can be used without `init()`.

### Customer context

`session.customer` is optional at `createTonder()` time. It is required when the SDK creates a payment or manages saved cards.

```ts
// Return page / read-only reconciliation.
const tonder = createTonder({
  api_key: 'pk_test_...',
  environment: 'sandbox',
});

const transaction = await tonder.getTransaction('txn_123');
```

### Presentation mode

When a payment requires a hosted step, the SDK uses `presentation_mode`:

| Mode       | Behavior                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `redirect` | Browser navigates to the hosted page. Use `return_url`, `getTransaction()`, and webhooks to confirm final status.                     |
| `embedded` | SDK opens a full-screen modal. Card 3DS waits for a final transaction; APM/SPEI hosted instructions may return `Pending` immediately. |

```ts
const tonder = createTonder({
  api_key: 'pk_test_...',
  environment: 'sandbox',
  presentation_mode: 'embedded',
  events: {
    presentation: {
      on_open: () => showLoadingOverlay(false),
      on_close: () => console.log('Customer closed the hosted view'),
    },
  },
});
```
