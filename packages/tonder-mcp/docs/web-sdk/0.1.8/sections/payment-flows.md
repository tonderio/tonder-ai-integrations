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

Use `getPaymentMethods()` when you want to render the methods enabled for your business. This call is optional: if your checkout already knows which method it wants to offer, pass the method code directly to `pay()`.

#### Method codes

| Code                | Method             |
| ------------------- | ------------------ |
| `card`              | Credit/debit card  |
| `saved_card`        | A stored card      |
| `spei`              | SPEI transfer      |
| `oxxopay`           | OXXO Pay           |
| `mercadopago`       | Mercado Pago       |
| `safetypaycash`     | SafetyPay cash     |
| `safetypaytransfer` | SafetyPay transfer |
| `neosurf`           | Neosurf            |

**The code reaches Tonder exactly as you write it.** The SDK does not re-case it, so `spei` and `SPEI` both work and each is stored and echoed back in your webhook's `payment_method_type` as you sent it. Pick one spelling and keep it, or your own reports will show the same method under two names.

`card` and `saved_card` are the exception: both are sent as `CARD`, because a stored card is a card charge with a token rather than a separate method.

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
    type: 'safetypaycash',
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

#### Ask Tonder to register your domain first

Apple will not let a page take an Apple Pay payment until its domain has been registered. **Tonder does that registration for you** — you never contact Apple, and you do not need an Apple developer account. What you do is send Tonder your domains and host one file. It is a one-time step per domain, and skipping it is the most common reason a correct integration fails in production.

It takes four steps, in this order:

1. **Send Tonder every domain** that will show the Apple Pay button. Subdomains count separately — `checkout.yourstore.com` and `yourstore.com` are two registrations.
2. **Tonder registers each domain** and sends you a verification file. Tonder generates its contents; you do not create it.
3. **Host the file** on that domain, over HTTPS, under `/.well-known/`:

   ```
   https://<your-domain>/.well-known/<the file Tonder sent you>
   ```

   Keep the filename Tonder gave you, exactly. Do not rename it, do not re-save it, do not open it in an editor — its contents are matched byte for byte, and Apple fetches the exact name that was registered.

4. **Tell Tonder it is live.** Tonder completes the verification with Apple and enables Apple Pay for that domain.

Requirements for the response at that URL:

| Requirement    | Detail                                                                                                                                                                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Protocol       | HTTPS, publicly reachable.                                                                                                                                                                                                                                                                |
| Redirects      | None. Apple states the domain cannot sit behind a proxy or a redirect — the URL has to serve the file itself.                                                                                                                                                                             |
| Reachability   | Apple fetches this file from **your** server, so Apple's own IPs have to get through. If a WAF, firewall, CDN rule, or geo-block sits in front of your domain, allowlist the IP ranges Apple publishes for domain verification. Only you can do this — Tonder is not in the request path. |
| Authentication | None. No login, no token.                                                                                                                                                                                                                                                                 |
| `Content-Type` | `text/plain`, or none at all. Both work.                                                                                                                                                                                                                                                  |

Three details cost people the most time:

- **Every domain is separate.** Staging, production, and any preview or vanity domain each need their own registration.
- **Some hosts hide dot-directories.** If your platform does not serve `/.well-known/` by default, you have to configure it.
- **The domain the shopper sees is the one that matters** — the top-level page, not an iframe or a CDN host.

Before telling Tonder the file is live, open the URL yourself and check the response **body**, not just the status code. A single-page app with a catch-all route answers `200` with `index.html` for unknown paths, so the URL looks healthy while serving the wrong bytes.

Until the domain is verified, the sheet opens and then closes, and `events.payment.on_error` reports `APPLE_PAY_VALIDATION_ERROR`.

**Registering the domain and enabling Apple Pay on your account are two different steps**, and they fail differently. A verified domain with Apple Pay not yet enabled means `isApplePayAvailable()` returns `APPLE_PAY_NOT_ENABLED` and no button ever renders. An enabled account on an unregistered domain means the button renders, the sheet opens, and then it closes with `APPLE_PAY_VALIDATION_ERROR`. Ask Tonder to confirm both.

Apple Pay is only offered when your business has it enabled and the shopper's browser supports it. Check first with `isApplePayAvailable()`, which returns `{ available: true }` or `{ available: false, code, message }`, and render the container only when `available` is `true`. When it is `false`, `code` tells you which of the three conditions failed — log it, because it is the difference between "this browser cannot" and "your account is not enabled".

```html
<div id="tonder-apple-pay-button"></div>
```

```ts
const tonder = createTonder({
  api_key: tonderPublicConfig.api_key,
  environment: tonderPublicConfig.environment,
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

There is no return value to await. Every outcome arrives on the `events.payment` callbacks you set at `createTonder()`:

| Outcome                               | Callback                    |
| ------------------------------------- | --------------------------- |
| Charge completed, including a decline | `on_completed(transaction)` |
| Charge failed                         | `on_error(error)`           |
| Shopper dismissed the sheet           | `on_cancel()`               |

`on_completed` means the charge reached a final state — not that it was approved. A decline completed: the attempt got a final answer and the answer was no. Branch on `transaction.status` before you fulfill an order. `on_error` is the other channel: an operational failure where no transaction exists at all.

These callbacks are shared by the whole SDK instance: `pay()` fires them too, so one set of handlers covers every payment method you offer.

Two error codes are specific to this flow and reach you through `on_error` once the sheet is already open: `APPLE_PAY_VALIDATION_ERROR` and `APPLE_PAY_SESSION_ERROR`. Both are listed under [Apple Pay errors](#apple-pay-errors) in the error reference.
