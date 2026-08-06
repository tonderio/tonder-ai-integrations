## Payment flows

### New card

```ts
await tonder.init();

const card_fields = tonder.create('card_fields');

await card_fields.mount();

const transaction = await tonder.pay({
  amount: 150,
  currency: 'MXN',
  return_url: 'https://yourstore.example/checkout/return',
  client_reference: 'order_1001',
  payment_method: { type: 'card' },
});
```

### Saved card

Saved-card operations require both `session.customer` and `session.secure_token`. If you are not sure whether your business has Card on File enabled, confirm it with the Tonder team before launching this flow.

```ts
const tonder = createTonder({
  api_key: tonderPublicConfig.api_key,
  environment: tonderPublicConfig.environment,
  session: {
    customer: { email: 'ada@example.com' },
    secure_token: await getSecureTokenFromYourBackend(),
  },
});

await tonder.init();

const cards = await tonder.getCustomerCards();
const selected_card = cards[0];

// Mount saved-card CVV only when the card cannot be charged through an
// existing Card-on-File subscription. The SDK collects this update context
// automatically during pay().
if (!selected_card.subscription_id) {
  const cvv = tonder.create('card_fields', {
    card_id: selected_card.card_id,
    fields: ['cvv'],
  });

  await cvv.mount();
}

const transaction = await tonder.pay({
  amount: 150,
  currency: 'MXN',
  return_url: 'https://yourstore.example/checkout/return',
  client_reference: 'order_1001',
  payment_method: { type: 'saved_card', card_id: selected_card.card_id },
});
```

### Save a new card

Card enrollment requires both `session.customer` and `session.secure_token`. Mint the secure token on your backend before creating the SDK instance.

```ts
const card_fields = tonder.create('card_fields');

await card_fields.mount();

const enrollment = await tonder.enrollCard();
// { card_id: 'card_123', subscription_id: 'sub_123' }
```

### Alternative payment methods

Use `getPaymentMethods()` when you want to render the methods enabled for your business. This call is optional: if your checkout already knows which method it wants to offer, pass the method code directly to `pay()` (`{ type: 'spei' }`, `{ type: 'oxxopay' }`, etc.).

For bank-backed SafetyPay methods, use `getPaymentMethodBanks()` and build `payment_method.config` from the selected bank:

| Field      | Value                                                                             |
| ---------- | --------------------------------------------------------------------------------- |
| `country`  | `bank.country` from `getPaymentMethodBanks()` (for example, `Mexico`).            |
| `channel`  | `bank.channel` from `getPaymentMethodBanks()` (`WP` for cash, `OL` for transfer). |
| `bank_ids` | `[{ id: bank.code }]` using the bank routing code, not the internal `bank.id`.    |

```ts
const methods = await tonder.getPaymentMethods();
const banks = await tonder.getPaymentMethodBanks();
```

```ts
const transaction = await tonder.pay({
  amount: 150,
  currency: 'MXN',
  return_url: 'https://yourstore.example/checkout/return',
  client_reference: 'order_1001',
  payment_method: { type: 'oxxopay' },
});
```

```ts
const banks = await tonder.getPaymentMethodBanks();
const bank = banks.cash[0];

const transaction = await tonder.pay({
  amount: 150,
  currency: 'MXN',
  return_url: 'https://yourstore.example/checkout/return',
  client_reference: 'order_1001',
  payment_method: {
    type: 'safetypayCash',
    config: {
      country: bank.country, // e.g. 'Mexico'
      channel: bank.channel, // 'WP' for cash, 'OL' for transfer
      bank_ids: [{ id: bank.code }], // e.g. [{ id: '8186' }]
    },
  },
});
```

APM/SPEI methods often settle asynchronously. Use webhooks for fulfillment.

### Apple Pay

Apple Pay works differently from every other method in this SDK: **the SDK renders the button and owns the click.** You do not call `pay()` for Apple Pay, and there is no promise to await. You give the SDK a container and the payment data, and you receive the result through `events.payment`.

`tonder.pay({ payment_method: { type: 'apple_pay' } })` is rejected on purpose — use the component below.

#### Register your domain with Apple first

Apple will not let a page take an Apple Pay payment until the domain serving that page is registered with Apple under Tonder's merchant identifier. This is a one-time setup step per domain, and it is the most common reason a correct integration fails in production.

Ask Tonder to register the domain. You will receive a verification file to host at:

```
https://<your-domain>/.well-known/apple-developer-merchantid-domain-association.txt
```

It must be served over HTTPS from that exact path, byte for byte, before the domain is verified. Three details cost people the most time:

- **Every domain is separate.** Staging, production, and any preview or vanity domain each need their own registration. A subdomain is a different domain.
- **Some hosts hide dot-directories.** If your platform does not serve `/.well-known/` by default, you have to configure it. Open the URL in a browser and confirm you get the file, not a 404 or your app's HTML.
- **The domain the shopper sees is the one that matters** — the top-level page, not an iframe or a CDN host.

Until this is done, the sheet opens and then closes, and `events.payment.on_error` reports `APPLE_PAY_VALIDATION_ERROR`.

Apple Pay is only offered when your business has it enabled and the shopper's browser supports it. Check first with `isApplePayAvailable()`, which returns `{ available: true }` or `{ available: false, code, message }`, and render the container only when `available` is `true`. When it is `false`, `code` tells you which of the three conditions failed — log it, because it is the difference between "this browser cannot" and "your account is not enabled".

```html
<div id="tonder-apple-pay-button"></div>
```

```ts
const tonder = createTonder({
  api_key: 'pk_test_123',
  environment: 'sandbox',
  session: { customer: { email: 'ada@example.com' } },
  events: {
    payment: {
      on_completed: (transaction) => {
        // Fires for every completed charge, INCLUDING a decline — completed is
        // not paid. Read `transaction.status`, exactly as you would with
        // `pay()`.
        console.log(transaction.status);
      },
      on_error: (error) => console.error(error.code, error.message),
      on_cancel: () => console.log('Shopper dismissed the payment sheet'),
    },
  },
});

await tonder.init();

// Call this from wherever your checkout view is torn down.
let teardownCheckout = () => {};

const availability = tonder.isApplePayAvailable();

if (availability.available) {
  const button = tonder.create('apple_pay_button', {
    payment: {
      amount: 150,
      currency: 'MXN',
      return_url: 'https://yourstore.example/checkout/return',
      client_reference: 'order_1001',
    },
  });

  await button.mount();

  teardownCheckout = () => button.unmount();
} else {
  // Never guess. `code` is one of NOT_INITIALIZED,
  // APPLE_PAY_UNSUPPORTED_BROWSER, or APPLE_PAY_NOT_ENABLED.
  console.info('Apple Pay hidden:', availability.code, availability.message);
}
```

`unmount()` removes the button and dismisses the payment sheet if one is open. Call it before the shopper leaves checkout — required if your app changes routes without a page load, because an Apple Pay sheet left open can still be authorized and charge with stale data. See [Component lifecycle](#component-lifecycle).

#### A changing cart

Pass a function instead of an object when the amount is not known at mount time. The SDK calls it at the moment of the click, so the shopper always sees the current total.

**The function must be synchronous.** Return the payment data directly — an `async` function, or anything that awaits a network call, will not work.

```ts
const button = tonder.create('apple_pay_button', {
  // Correct: synchronous, reads state you already have.
  payment: () => ({
    amount: cart.total,
    currency: 'MXN',
    return_url: 'https://yourstore.example/checkout/return',
    client_reference: cart.orderId,
    idempotency_key: cart.idempotencyKey,
    metadata: { cart_id: cart.id },
    billing_address: cart.billingAddress,
  }),
});
```

If you need server-side data to build the charge, fetch it before the shopper clicks and read it from a variable inside the function.

#### Results

There is no return value to await. Every outcome arrives on `config.events.payment`, which you can also assign after `createTonder()` — including when your original config had no `events` key at all. `events` is read at the moment each callback fires, so it stays live even though the rest of the config is copied at creation:

| Outcome                               | Callback                    |
| ------------------------------------- | --------------------------- |
| Charge completed, including a decline | `on_completed(transaction)` |
| Charge failed                         | `on_error(error)`           |
| Shopper dismissed the sheet           | `on_cancel()`               |

`on_completed` means the charge reached a final state — not that it was approved. A decline completed: the attempt got a final answer and the answer was no. Branch on `transaction.status` before you fulfill an order. `on_error` is the other channel: an operational failure where no transaction exists at all.

These callbacks are shared by the whole SDK instance: `pay()` fires them too, so one set of handlers covers every payment method you offer.

Two error codes are specific to this flow and reach you through `on_error` once the sheet is already open: `APPLE_PAY_VALIDATION_ERROR` and `APPLE_PAY_SESSION_ERROR`. Both are listed under [Apple Pay](#apple-pay-1) in the error reference.
